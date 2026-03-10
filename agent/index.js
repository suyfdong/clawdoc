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
import { readFile, writeFile, readdir, stat, access } from "fs/promises";
import { join, resolve } from "path";
import { homedir } from "os";
import { randomBytes, createHash } from "crypto";
import { execSync, exec } from "child_process";

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
// Diagnosis engine
// ---------------------------------------------------------------------------

function diagnoseConfig(config, fileInfos) {
  const issues = [];
  let score = 100;

  // Rule 1: No model fallbacks
  const fallbacks =
    config?.agents?.defaults?.model?.fallbacks ||
    config?.model?.fallbacks;
  if (!fallbacks || fallbacks.length === 0) {
    issues.push({
      id: "no-fallbacks",
      severity: "medium",
      title: "No model fallbacks configured",
      description:
        "If your primary model goes down or rate-limits, your agent will stop working entirely.",
      fix: {
        path: "agents.defaults.model.fallbacks",
        suggestion: '["claude-haiku-3-5", "openai/gpt-4o-mini"]',
      },
    });
    score -= 10;
  }

  // Rule 2: Expensive heartbeat model
  const heartbeat =
    config?.agents?.defaults?.model?.heartbeat ||
    config?.model?.heartbeat;
  if (heartbeat) {
    const expensive = ["opus", "sonnet", "gpt-4o", "gpt-4"];
    if (expensive.some((e) => heartbeat.toLowerCase().includes(e))) {
      issues.push({
        id: "expensive-heartbeat",
        severity: "high",
        title: "Heartbeat uses an expensive model",
        description: `Your heartbeat model is "${heartbeat}". Heartbeats run frequently and don't need intelligence. Switch to a cheap model.`,
        fix: {
          path: "agents.defaults.model.heartbeat",
          suggestion: '"ollama/llama3" or "claude-haiku-3-5"',
        },
      });
      score -= 15;
    }
  }

  // Rule 3: memoryFlush disabled
  const memoryFlush =
    config?.agents?.defaults?.memoryFlush ?? config?.memoryFlush;
  if (memoryFlush === false || memoryFlush === undefined) {
    issues.push({
      id: "memory-flush-off",
      severity: "high",
      title: "Memory flush is disabled (default)",
      description:
        "When disabled, important context can be lost when switching models or hitting context limits. This is a known source of 'data residue' problems.",
      fix: {
        path: "agents.defaults.memoryFlush",
        suggestion: "true",
      },
    });
    score -= 15;
  }

  // Rule 4: Bootstrap files too large
  const bootstrapFiles = ["SOUL.md", "USER.md", "AGENTS.md", "MEMORY.md"];
  let totalBootstrapTokens = 0;
  for (const fname of bootstrapFiles) {
    const info = fileInfos[fname];
    if (info && info.exists) {
      totalBootstrapTokens += info.estimatedTokens;
    }
  }
  if (totalBootstrapTokens > 5000) {
    issues.push({
      id: "bootstrap-too-large",
      severity: "high",
      title: `Bootstrap files are ~${totalBootstrapTokens.toLocaleString()} tokens`,
      description: `These files are sent with EVERY message. At current prices, that's ~$${((totalBootstrapTokens / 1000000) * 3).toFixed(4)} per message just for bootstrap overhead.`,
      fix: {
        path: "Bootstrap files (SOUL.md, USER.md, etc.)",
        suggestion:
          "Keep total bootstrap under 5,000 tokens. Remove redundant content.",
      },
    });
    score -= 15;
  }

  // Rule 5: maxTokens too high
  const maxTokens =
    config?.agents?.defaults?.maxTokens || config?.maxTokens;
  if (maxTokens && maxTokens > 4096) {
    issues.push({
      id: "max-tokens-high",
      severity: "medium",
      title: `maxTokens is set to ${maxTokens}`,
      description:
        "Higher maxTokens means the model reserves more output capacity, increasing cost. Most tasks work fine with 2048-4096.",
      fix: {
        path: "agents.defaults.maxTokens",
        suggestion: "2048 or 4096",
      },
    });
    score -= 8;
  }

  // Rule 6: No prompt caching
  const cacheControl =
    config?.agents?.defaults?.cacheControlTtl ?? config?.cacheControlTtl;
  if (cacheControl === undefined || cacheControl === null) {
    issues.push({
      id: "no-cache-control",
      severity: "medium",
      title: "No prompt caching configured",
      description:
        "Without cacheControlTtl, you pay full price for repeated system prompts. Enabling caching can save 50-90% on prompt tokens.",
      fix: {
        path: "agents.defaults.cacheControlTtl",
        suggestion: "300 (5 minutes)",
      },
    });
    score -= 10;
  }

  // Rule 7: API keys in config (security)
  const raw = JSON.stringify(config);
  const keyPatterns = [
    /sk-[a-zA-Z0-9]{20,}/,
    /sk-ant-[a-zA-Z0-9-]{20,}/,
    /key-[a-zA-Z0-9]{20,}/,
  ];
  for (const pattern of keyPatterns) {
    if (pattern.test(raw)) {
      issues.push({
        id: "api-key-in-config",
        severity: "critical",
        title: "API key detected in configuration",
        description:
          "Your config file contains what appears to be a raw API key. This is a security risk. Use environment variables instead.",
        fix: {
          path: "Various",
          suggestion: 'Use $ANTHROPIC_API_KEY or process.env references',
        },
      });
      score -= 25;
      break;
    }
  }

  // Rule 8: No primary model set
  const primaryModel =
    config?.agents?.defaults?.model?.primary ||
    config?.model?.primary;
  if (!primaryModel) {
    issues.push({
      id: "no-primary-model",
      severity: "medium",
      title: "No explicit primary model set",
      description:
        "Without an explicit primary model, OpenClaw picks a default that may not suit your needs. Set it explicitly to avoid surprises.",
      fix: {
        path: "agents.defaults.model.primary",
        suggestion: '"anthropic/claude-sonnet-4-6" or your preferred model',
      },
    });
    score -= 10;
  }

  score = Math.max(0, score);

  return {
    score,
    grade:
      score >= 90
        ? "A"
        : score >= 75
          ? "B"
          : score >= 60
            ? "C"
            : score >= 40
              ? "D"
              : "F",
    issues,
    summary:
      score >= 90
        ? "Your configuration looks great!"
        : score >= 75
          ? "Good overall, but some optimizations available."
          : score >= 60
            ? "Several issues found that may affect performance and cost."
            : "Significant configuration problems detected. Fixing these will noticeably improve your experience.",
  };
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

  // ---- Diagnosis ----

  app.get("/api/diagnose", requireAuth, async (req, res) => {
    const configResult = await readJsonConfig(
      join(openclawDir, "openclaw.json")
    );
    if (!configResult.ok) {
      return res
        .status(500)
        .json({ error: "Cannot read config: " + configResult.error });
    }

    const fileInfos = {};
    for (const fname of ["SOUL.md", "USER.md", "AGENTS.md", "MEMORY.md"]) {
      fileInfos[fname] = await getFileInfo(join(openclawDir, fname));
    }

    const result = diagnoseConfig(configResult.data, fileInfos);
    res.json(result);
  });

  // ---- Apply config change (atomic operation) ----

  app.post("/api/apply", requireAuth, async (req, res) => {
    const { operation, params } = req.body;

    if (!operation) {
      return res.status(400).json({ error: "Missing operation" });
    }

    try {
      const configPath = join(openclawDir, "openclaw.json");
      const configResult = await readJsonConfig(configPath);
      if (!configResult.ok) throw new Error(configResult.error);

      const config = configResult.data;

      switch (operation) {
        case "set-primary-model": {
          if (!config.agents) config.agents = {};
          if (!config.agents.defaults) config.agents.defaults = {};
          if (!config.agents.defaults.model) config.agents.defaults.model = {};
          config.agents.defaults.model.primary = params.model;
          break;
        }
        case "set-fallback-models": {
          if (!config.agents) config.agents = {};
          if (!config.agents.defaults) config.agents.defaults = {};
          if (!config.agents.defaults.model) config.agents.defaults.model = {};
          config.agents.defaults.model.fallbacks = params.models;
          break;
        }
        case "set-heartbeat-model": {
          if (!config.agents) config.agents = {};
          if (!config.agents.defaults) config.agents.defaults = {};
          if (!config.agents.defaults.model) config.agents.defaults.model = {};
          config.agents.defaults.model.heartbeat = params.model;
          break;
        }
        case "enable-memory-flush": {
          if (!config.agents) config.agents = {};
          if (!config.agents.defaults) config.agents.defaults = {};
          config.agents.defaults.memoryFlush = true;
          break;
        }
        case "set-cache-ttl": {
          if (!config.agents) config.agents = {};
          if (!config.agents.defaults) config.agents.defaults = {};
          config.agents.defaults.cacheControlTtl = params.ttl || 300;
          break;
        }
        case "set-max-tokens": {
          if (!config.agents) config.agents = {};
          if (!config.agents.defaults) config.agents.defaults = {};
          config.agents.defaults.maxTokens = params.maxTokens;
          break;
        }
        default:
          return res
            .status(400)
            .json({ error: `Unknown operation: ${operation}` });
      }

      // Backup & write
      const backupPath = join(
        openclawDir,
        `openclaw.backup.${Date.now()}.json`
      );
      await writeFile(backupPath, configResult.raw, "utf-8");
      await writeFile(configPath, JSON.stringify(config, null, 2), "utf-8");

      res.json({
        ok: true,
        message: `Operation "${operation}" applied successfully`,
        config,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
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

  server.listen(args.port, () => {
    console.log("");
    console.log("  ╔══════════════════════════════════════════════╗");
    console.log("  ║         ClawDoc Companion Agent v0.1         ║");
    console.log("  ╠══════════════════════════════════════════════╣");
    console.log(`  ║  OpenClaw dir : ${openclawDir.padEnd(28)}║`);
    console.log(`  ║  Version      : ${version.padEnd(28)}║`);
    console.log(`  ║  Listening on : http://localhost:${String(args.port).padEnd(13)}║`);
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
