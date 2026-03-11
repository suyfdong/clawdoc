#!/usr/bin/env node

/**
 * ClawDoc Companion Agent
 *
 * Lightweight service that runs on the same server as OpenClaw.
 * Provides a REST API for the ClawDoc Web UI to:
 *   - Read OpenClaw configuration files
 *   - Detect OpenClaw version and status
 *   - Execute configuration changes
 *   - Monitor file changes in real-time (WebSocket)
 *
 * Usage:
 *   npx clawdoc-agent          # auto-detect OpenClaw path
 *   npx clawdoc-agent --port 17017 --openclaw-dir ~/.openclaw
 */

import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { watch } from "chokidar";
import JSON5 from "json5";
import { createServer } from "http";
import { readFile, writeFile, readdir, stat, access, realpath } from "fs/promises";
import { join, resolve, relative } from "path";
import { homedir } from "os";
import { randomBytes, createHash } from "crypto";
import { execSync, exec } from "child_process";
import { loadBrainConfig, getBrainStatus, resetBrainConfig, runAgentLoop, callLLM } from "./llm.js";
import { createTools } from "./tools.js";
import { getAnalyzePrompt, getChatPrompt, getQuickOpPrompt } from "./prompts.js";

// ---------------------------------------------------------------------------
// JSON extraction helper (balanced brace matching instead of greedy regex)
// ---------------------------------------------------------------------------

function extractBalancedJSON(text) {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return JSON.parse(text.slice(start, i + 1));
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_PORT = 17017;
const OPENCLAW_DIR_CANDIDATES = [
  join(homedir(), ".openclaw"),
  join(homedir(), ".config", "openclaw"),
];

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { port: DEFAULT_PORT, openclawDir: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port" && args[i + 1]) config.port = Number(args[i + 1]);
    if (args[i] === "--openclaw-dir" && args[i + 1])
      config.openclawDir = resolve(args[i + 1]);
  }
  return config;
}

// ---------------------------------------------------------------------------
// OpenClaw detection
// ---------------------------------------------------------------------------

async function detectOpenClawDir(override) {
  if (override) {
    try {
      await access(override);
      return override;
    } catch {
      console.error(`Specified OpenClaw dir not found: ${override}`);
      process.exit(1);
    }
  }
  for (const candidate of OPENCLAW_DIR_CANDIDATES) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  console.error(
    "Could not find OpenClaw directory. Use --openclaw-dir to specify."
  );
  process.exit(1);
}

async function detectOpenClawVersion(dir) {
  // Try reading package.json or version file in common locations
  const versionPaths = [
    join(dir, "version"),
    join(dir, ".version"),
    join(dir, "package.json"),
  ];

  for (const p of versionPaths) {
    try {
      const content = await readFile(p, "utf-8");
      if (p.endsWith("package.json")) {
        return JSON.parse(content).version || "unknown";
      }
      return content.trim();
    } catch {
      continue;
    }
  }

  // Try CLI detection
  try {
    const version = execSync("openclaw --version 2>/dev/null", {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
    return version;
  } catch {
    return "unknown";
  }
}

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------

async function readJsonConfig(filePath) {
  try {
    const content = await readFile(filePath, "utf-8");
    return { ok: true, data: JSON5.parse(content), raw: content };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function readTextFile(filePath) {
  try {
    const content = await readFile(filePath, "utf-8");
    return { ok: true, data: content };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function listDir(dirPath) {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    return entries.map((e) => ({
      name: e.name,
      type: e.isDirectory() ? "directory" : "file",
    }));
  } catch {
    return [];
  }
}

async function getFileInfo(filePath) {
  try {
    const s = await stat(filePath);
    const content = await readFile(filePath, "utf-8");
    // Rough token estimate: ~4 chars per token for English
    const estimatedTokens = Math.ceil(content.length / 4);
    return {
      exists: true,
      size: s.size,
      modified: s.mtime.toISOString(),
      lines: content.split("\n").length,
      estimatedTokens,
    };
  } catch {
    return { exists: false };
  }
}

// ---------------------------------------------------------------------------
// Agent listing & status
// ---------------------------------------------------------------------------

async function listAgents(openclawDir) {
  const agentsDir = join(openclawDir, "agents");
  const entries = await listDir(agentsDir);
  const agents = [];

  for (const entry of entries) {
    if (entry.type !== "directory") continue;
    const agentDir = join(agentsDir, entry.name);
    const configResult = await readJsonConfig(
      join(agentDir, "agent.json")
    );

    agents.push({
      id: entry.name,
      name: configResult.ok ? configResult.data.name || entry.name : entry.name,
      config: configResult.ok ? configResult.data : null,
      hasSession: (await listDir(join(agentDir, "sessions"))).length > 0,
    });
  }

  return agents;
}


// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs();
  const openclawDir = await detectOpenClawDir(args.openclawDir);
  const version = await detectOpenClawVersion(openclawDir);

  // Generate auth token on first run
  const authToken = randomBytes(24).toString("hex");

  const app = express();
  app.use(cors());
  app.use(express.json());

  // Auth middleware
  function requireAuth(req, res, next) {
    const token =
      req.headers.authorization?.replace("Bearer ", "") ||
      req.query.token;
    if (token !== authToken) {
      return res.status(401).json({ error: "Invalid auth token" });
    }
    next();
  }

  // ---- Health / Info ----

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", version: "0.1.0" });
  });

  app.get("/api/info", requireAuth, async (req, res) => {
    const agents = await listAgents(openclawDir);
    const configResult = await readJsonConfig(
      join(openclawDir, "openclaw.json")
    );

    // Gather bootstrap file info
    const bootstrapFiles = {};
    for (const fname of [
      "SOUL.md",
      "USER.md",
      "AGENTS.md",
      "MEMORY.md",
      "IDENTITY.md",
      "TOOLS.md",
      "HEARTBEAT.md",
      "BOOTSTRAP.md",
    ]) {
      bootstrapFiles[fname] = await getFileInfo(join(openclawDir, fname));
    }

    res.json({
      openclawDir,
      version,
      agents,
      config: configResult.ok ? configResult.data : null,
      configRaw: configResult.ok ? configResult.raw : null,
      bootstrapFiles,
    });
  });

  // ---- Config operations ----

  app.get("/api/config", requireAuth, async (req, res) => {
    const result = await readJsonConfig(
      join(openclawDir, "openclaw.json")
    );
    if (!result.ok) return res.status(500).json({ error: result.error });
    res.json({ config: result.data, raw: result.raw });
  });

  app.put("/api/config", requireAuth, async (req, res) => {
    const { config } = req.body;
    if (!config) return res.status(400).json({ error: "Missing config body" });

    const filePath = join(openclawDir, "openclaw.json");

    // Backup current config
    try {
      const current = await readFile(filePath, "utf-8");
      const backupPath = join(
        openclawDir,
        `openclaw.backup.${Date.now()}.json`
      );
      await writeFile(backupPath, current, "utf-8");
    } catch {
      // No existing config to backup
    }

    try {
      const content =
        typeof config === "string" ? config : JSON.stringify(config, null, 2);
      await writeFile(filePath, content, "utf-8");
      res.json({ ok: true, message: "Configuration updated successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---- Bootstrap file operations ----

  app.get("/api/files/:filename", requireAuth, async (req, res) => {
    const allowed = [
      "SOUL.md",
      "USER.md",
      "AGENTS.md",
      "MEMORY.md",
      "IDENTITY.md",
      "TOOLS.md",
      "HEARTBEAT.md",
      "BOOTSTRAP.md",
    ];
    const { filename } = req.params;
    if (!allowed.includes(filename)) {
      return res.status(403).json({ error: "File not allowed" });
    }
    const result = await readTextFile(join(openclawDir, filename));
    if (!result.ok) return res.status(404).json({ error: result.error });

    const info = await getFileInfo(join(openclawDir, filename));
    res.json({ content: result.data, ...info });
  });

  app.put("/api/files/:filename", requireAuth, async (req, res) => {
    const allowed = [
      "SOUL.md",
      "USER.md",
      "AGENTS.md",
      "MEMORY.md",
      "IDENTITY.md",
      "TOOLS.md",
      "HEARTBEAT.md",
      "BOOTSTRAP.md",
    ];
    const { filename } = req.params;
    if (!allowed.includes(filename)) {
      return res.status(403).json({ error: "File not allowed" });
    }

    const { content } = req.body;
    if (content === undefined)
      return res.status(400).json({ error: "Missing content" });

    const filePath = join(openclawDir, filename);

    // Backup
    try {
      const current = await readFile(filePath, "utf-8");
      const backupPath = join(
        openclawDir,
        `${filename}.backup.${Date.now()}`
      );
      await writeFile(backupPath, current, "utf-8");
    } catch {
      // New file
    }

    try {
      await writeFile(filePath, content, "utf-8");
      res.json({ ok: true, message: `${filename} updated successfully` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---- LLM Brain endpoints ----

  const { tools: llmTools, handlers: toolHandlers } = createTools(openclawDir);

  // Cache the latest analysis for chat context
  let cachedAnalysis = null;

  // Brain status (no auth needed — only exposes model name, not secrets)
  app.get("/api/brain/status", async (req, res) => {
    const status = await getBrainStatus();
    res.json(status);
  });

  // Configure brain — save API key from Web UI (no SSH needed)
  app.post("/api/brain/configure", requireAuth, async (req, res) => {
    const { apiKey, model } = req.body;
    if (!apiKey) {
      return res.status(400).json({ error: "Missing apiKey" });
    }

    const configDir = join(homedir(), ".clawdoc");
    const configPath = join(configDir, "brain.json");

    // Ensure directory exists
    try {
      await access(configDir);
    } catch {
      const { mkdir } = await import("fs/promises");
      await mkdir(configDir, { recursive: true });
    }

    const config = {
      provider: "openrouter",
      model: model || "anthropic/claude-3.5-haiku",
      apiKey,
      maxTokens: 4096,
    };

    try {
      await writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");
      // Reset cached config so it reloads
      resetBrainConfig();
      res.json({ ok: true, message: "Brain configured successfully" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Analyze — LLM explores the OpenClaw installation
  app.post("/api/analyze", requireAuth, async (req, res) => {
    const brainConfig = await loadBrainConfig();
    if (!brainConfig) {
      return res.status(503).json({
        error: "Brain not configured. Create ~/.clawdoc/brain.json with your OpenRouter API key.",
      });
    }

    // SSE streaming for progress updates
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendEvent = (type, data) => {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    };

    try {
      sendEvent("status", { message: "Starting analysis..." });

      const result = await runAgentLoop({
        systemPrompt: getAnalyzePrompt(openclawDir),
        messages: [{ role: "user", content: "Analyze this OpenClaw installation and return the structured JSON." }],
        tools: llmTools,
        toolHandlers,
        maxIterations: 15,
        onProgress: (info) => {
          sendEvent("progress", { tool: info.tool, message: `Reading ${info.tool}...` });
        },
      });

      // Try to parse the JSON from the LLM response
      let analysis;
      try {
        // Try parsing the whole content as JSON first
        analysis = JSON.parse(result.content.trim());
      } catch {
        // Extract from markdown code block or find balanced JSON
        try {
          const codeBlockMatch = result.content.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
          if (codeBlockMatch) {
            analysis = JSON.parse(codeBlockMatch[1]);
          } else {
            analysis = extractBalancedJSON(result.content);
          }
        } catch {
          analysis = null;
        }
      }

      if (analysis) {
        cachedAnalysis = analysis;
        sendEvent("analysis", { data: analysis });
      } else {
        sendEvent("error", { message: "Failed to parse analysis result", raw: result.content });
      }

      sendEvent("done", {});
      res.end();
    } catch (err) {
      sendEvent("error", { message: err.message });
      res.end();
    }
  });

  // Chat — conversational config modification
  app.post("/api/chat", requireAuth, async (req, res) => {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: "Missing message" });

    const brainConfig = await loadBrainConfig();
    if (!brainConfig) {
      return res.status(503).json({ error: "Brain not configured." });
    }

    // SSE streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const sendEvent = (type, data) => {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    };

    try {
      sendEvent("status", { message: "Thinking..." });

      const messages = [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: message },
      ];

      const result = await runAgentLoop({
        systemPrompt: getChatPrompt(openclawDir, cachedAnalysis),
        messages,
        tools: llmTools,
        toolHandlers,
        maxIterations: 10,
        onProgress: (info) => {
          sendEvent("progress", { tool: info.tool });
        },
      });

      // Parse proposed changes if present
      let proposedChanges = null;
      const changesMatch = result.content.match(/```json:changes\s*\n([\s\S]*?)\n```/);
      if (changesMatch) {
        try {
          const parsed = JSON.parse(changesMatch[1]);
          proposedChanges = parsed.proposed_changes || null;
        } catch {
          // Ignore parse errors
        }
      }

      // Clean content (remove the json:changes block)
      const cleanContent = result.content.replace(/```json:changes[\s\S]*?```/, "").trim();

      sendEvent("response", {
        content: cleanContent,
        proposedChanges,
      });
      sendEvent("done", {});
      res.end();
    } catch (err) {
      sendEvent("error", { message: err.message });
      res.end();
    }
  });

  // Quick operation — canvas drag/drop or dropdown action
  app.post("/api/quick-op", requireAuth, async (req, res) => {
    const { action, agentId, slot, modelId, params } = req.body;
    if (!action) return res.status(400).json({ error: "Missing action" });

    const brainConfig = await loadBrainConfig();
    if (!brainConfig) {
      return res.status(503).json({ error: "Brain not configured." });
    }

    try {
      const userMessage = `The user performed this visual operation on the canvas:
Action: ${action}
${agentId ? `Agent: ${agentId}` : ""}
${slot ? `Slot: ${slot}` : ""}
${modelId ? `Model: ${modelId}` : ""}
${params ? `Parameters: ${JSON.stringify(params)}` : ""}

Read the relevant config files and generate the exact changes needed.`;

      const result = await runAgentLoop({
        systemPrompt: getQuickOpPrompt(openclawDir),
        messages: [{ role: "user", content: userMessage }],
        tools: llmTools,
        toolHandlers,
        maxIterations: 5,
      });

      // Parse the JSON response
      let parsed;
      try {
        parsed = JSON.parse(result.content.trim());
      } catch {
        try {
          const codeBlockMatch = result.content.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
          if (codeBlockMatch) {
            parsed = JSON.parse(codeBlockMatch[1]);
          } else {
            parsed = extractBalancedJSON(result.content);
          }
        } catch {
          parsed = null;
        }
      }

      if (parsed) {
        res.json(parsed);
      } else {
        res.status(500).json({ error: "Failed to process operation", raw: result.content });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Apply changes — write proposed file changes (with backup)
  app.post("/api/apply-changes", requireAuth, async (req, res) => {
    const { changes } = req.body;
    if (!changes || !Array.isArray(changes) || changes.length === 0) {
      return res.status(400).json({ error: "Missing or empty changes array" });
    }

    const results = [];
    for (const change of changes) {
      const { file, content } = change;
      if (!file || content === undefined) {
        results.push({ file, ok: false, error: "Missing file or content" });
        continue;
      }

      // Sandbox: resolve path within openclawDir only
      const absPath = resolve(openclawDir, file);
      const rel = relative(openclawDir, absPath);
      if (rel.startsWith("..")) {
        results.push({ file, ok: false, error: "Path escapes sandbox" });
        continue;
      }
      // Also check resolved symlinks
      try {
        const realAbs = await realpath(absPath);
        const realRoot = await realpath(openclawDir);
        if (!realAbs.startsWith(realRoot)) {
          results.push({ file, ok: false, error: "Path escapes sandbox via symlink" });
          continue;
        }
      } catch (err) {
        if (err.code !== "ENOENT") {
          results.push({ file, ok: false, error: "Path resolution failed" });
          continue;
        }
        // ENOENT = new file, that's OK
      }

      // Backup existing file
      try {
        const current = await readFile(absPath, "utf-8");
        const backupPath = `${absPath}.backup.${Date.now()}`;
        await writeFile(backupPath, current, "utf-8");
      } catch {
        // New file or can't backup — continue
      }

      // Write new content
      try {
        await writeFile(absPath, content, "utf-8");
        results.push({ file, ok: true });
      } catch (err) {
        results.push({ file, ok: false, error: err.message });
      }
    }

    const allOk = results.every((r) => r.ok);
    res.json({
      ok: allOk,
      message: allOk
        ? `${results.length} file(s) updated successfully`
        : "Some changes failed",
      results,
    });
  });

  // ---- Start server ----

  const server = createServer(app);

  // WebSocket for real-time file changes
  const wss = new WebSocketServer({ server, path: "/ws" });
  const connectedClients = new Set();

  wss.on("connection", (ws, req) => {
    // Verify auth via query param
    const url = new URL(req.url, `http://localhost:${args.port}`);
    if (url.searchParams.get("token") !== authToken) {
      ws.close(4001, "Unauthorized");
      return;
    }
    connectedClients.add(ws);
    ws.on("close", () => connectedClients.delete(ws));
  });

  // Watch OpenClaw directory for changes
  const watcher = watch(openclawDir, {
    ignoreInitial: true,
    depth: 2,
    ignored: [/\.backup\.\d+/, /node_modules/],
  });

  watcher.on("all", (event, path) => {
    const message = JSON.stringify({ event, path, timestamp: Date.now() });
    for (const client of connectedClients) {
      if (client.readyState === 1) {
        client.send(message);
      }
    }
  });

  server.listen(args.port, async () => {
    const brainStatus = await getBrainStatus();

    console.log("");
    console.log("  ╔══════════════════════════════════════════════╗");
    console.log("  ║       ClawDoc Companion Agent v0.2.0         ║");
    console.log("  ╠══════════════════════════════════════════════╣");
    console.log(`  ║  OpenClaw dir : ${openclawDir.padEnd(28)}║`);
    console.log(`  ║  Version      : ${version.padEnd(28)}║`);
    console.log(`  ║  Listening on : http://localhost:${String(args.port).padEnd(13)}║`);
    console.log("  ╠══════════════════════════════════════════════╣");
    if (brainStatus.configured) {
      console.log(`  ║  Brain model  : ${(brainStatus.model || "").padEnd(28)}║`);
    } else {
      console.log("  ║  Brain        : NOT CONFIGURED               ║");
      console.log("  ║  Create ~/.clawdoc/brain.json with API key   ║");
    }
    console.log("  ╠══════════════════════════════════════════════╣");
    console.log("  ║  Your auth token (paste in ClawDoc Web UI):  ║");
    console.log(`  ║  ${authToken}  ║`);
    console.log("  ╚══════════════════════════════════════════════╝");
    console.log("");
    console.log("  Watching for file changes...");
    console.log("");
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
