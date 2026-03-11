/**
 * ClawDoc LLM Tools — file system tools the brain can use
 *
 * All paths are sandboxed to the OpenClaw directory.
 * Tools are read-only — the brain never writes directly.
 */

import { readFile, readdir, stat, access, realpath } from "fs/promises";
import { join, resolve, relative } from "path";

/**
 * Create sandboxed tool handlers for a given OpenClaw directory.
 *
 * @param {string} openclawDir - Absolute path to OpenClaw installation
 * @returns {{ tools: Array, handlers: Object }}
 */
export function createTools(openclawDir) {
  // Resolve the real openclawDir once (for symlink comparison)
  let _realOpenclawDir = null;
  async function getRealRoot() {
    if (!_realOpenclawDir) {
      _realOpenclawDir = await realpath(openclawDir);
    }
    return _realOpenclawDir;
  }

  // Ensure path stays within sandbox (symlink-safe)
  async function safePath(relPath) {
    const abs = resolve(openclawDir, relPath);
    const rel = relative(openclawDir, abs);
    if (rel.startsWith("..")) {
      throw new Error(`Path escapes sandbox: ${relPath}`);
    }
    // Also check after resolving symlinks
    try {
      const realAbs = await realpath(abs);
      const realRoot = await getRealRoot();
      if (!realAbs.startsWith(realRoot)) {
        throw new Error(`Path escapes sandbox via symlink: ${relPath}`);
      }
    } catch (err) {
      // File doesn't exist yet — that's OK for the check, the read will fail naturally
      if (err.code !== "ENOENT") throw err;
    }
    return abs;
  }

  // --- Tool handlers ---

  async function readFileHandler({ path }) {
    const abs = await safePath(path);
    try {
      const content = await readFile(abs, "utf-8");
      // Truncate very large files
      if (content.length > 50000) {
        return {
          content: content.slice(0, 50000),
          truncated: true,
          totalLength: content.length,
        };
      }
      return { content };
    } catch (err) {
      return { error: `Cannot read ${path}: ${err.message}` };
    }
  }

  async function listDirectoryHandler({ path = "." }) {
    const abs = await safePath(path);
    try {
      const entries = await readdir(abs, { withFileTypes: true });
      return {
        path,
        entries: entries.map((e) => ({
          name: e.name,
          type: e.isDirectory() ? "directory" : "file",
        })),
      };
    } catch (err) {
      return { error: `Cannot list ${path}: ${err.message}` };
    }
  }

  async function fileInfoHandler({ path }) {
    const abs = await safePath(path);
    try {
      const s = await stat(abs);
      const content = await readFile(abs, "utf-8");
      const estimatedTokens = Math.ceil(content.length / 4);
      return {
        path,
        exists: true,
        size: s.size,
        modified: s.mtime.toISOString(),
        lines: content.split("\n").length,
        estimatedTokens,
      };
    } catch {
      return { path, exists: false };
    }
  }

  async function searchConfigHandler({ query }) {
    // Search all JSON/JSON5 files in the OpenClaw dir for a key or value
    const results = [];

    async function searchDir(dir, depth = 0) {
      if (depth > 3) return; // Limit recursion
      try {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
          const fullPath = join(dir, entry.name);

          if (entry.isDirectory()) {
            await searchDir(fullPath, depth + 1);
          } else if (
            entry.name.endsWith(".json") ||
            entry.name.endsWith(".json5") ||
            entry.name.endsWith(".jsonc")
          ) {
            try {
              const content = await readFile(fullPath, "utf-8");
              if (content.toLowerCase().includes(query.toLowerCase())) {
                const relPath = relative(openclawDir, fullPath);
                results.push({
                  file: relPath,
                  preview: content.slice(0, 2000),
                });
              }
            } catch {
              // Skip unreadable files
            }
          }
        }
      } catch {
        // Skip unreadable directories
      }
    }

    await searchDir(openclawDir);
    return { query, matches: results };
  }

  // --- OpenAI-format tool definitions ---

  const tools = [
    {
      type: "function",
      function: {
        name: "read_file",
        description:
          "Read a file from the OpenClaw directory. Path is relative to the OpenClaw root. Returns file content as string.",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description:
                "Relative path to the file (e.g., 'openclaw.json', 'agents/default/agent.json', 'SOUL.md')",
            },
          },
          required: ["path"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "list_directory",
        description:
          "List files and directories within the OpenClaw directory. Path is relative to OpenClaw root.",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description:
                "Relative path to the directory (e.g., '.', 'agents', 'agents/default'). Defaults to root.",
            },
          },
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "file_info",
        description:
          "Get metadata about a file: size, modification date, line count, estimated token count.",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Relative path to the file",
            },
          },
          required: ["path"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "search_config",
        description:
          "Search all JSON/JSON5 config files in the OpenClaw directory for a keyword or config key. Useful for finding where a model, setting, or feature is defined.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search term (case-insensitive, e.g., 'claude', 'heartbeat', 'fallback')",
            },
          },
          required: ["query"],
        },
      },
    },
  ];

  const handlers = {
    read_file: readFileHandler,
    list_directory: listDirectoryHandler,
    file_info: fileInfoHandler,
    search_config: searchConfigHandler,
  };

  return { tools, handlers };
}
