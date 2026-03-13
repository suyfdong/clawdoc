/**
 * ClawDoc LLM Brain — OpenRouter client with tool use support
 *
 * Calls LLMs via OpenRouter API (compatible with OpenAI chat/completions format).
 * Supports tool use (function calling) and SSE streaming.
 *
 * Config priority:
 *   1. ~/.clawdoc/brain.json
 *   2. OPENROUTER_API_KEY environment variable
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "anthropic/claude-3.5-haiku";
const CONFIG_PATH = join(homedir(), ".clawdoc", "brain.json");

let _config = null;

/**
 * Load brain config. Returns { model, apiKey, maxTokens } or null if not configured.
 */
export async function loadBrainConfig() {
  if (_config) return _config;

  // Try config file first
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    const apiKey = parsed.apiKey?.startsWith("$")
      ? process.env[parsed.apiKey.slice(1)]
      : parsed.apiKey;

    if (apiKey) {
      _config = {
        model: parsed.model || DEFAULT_MODEL,
        apiKey,
        maxTokens: parsed.maxTokens || 4096,
      };
      return _config;
    }
  } catch {
    // Config file doesn't exist or is invalid
  }

  // Fall back to environment variable
  const envKey = process.env.OPENROUTER_API_KEY;
  if (envKey) {
    _config = {
      model: DEFAULT_MODEL,
      apiKey: envKey,
      maxTokens: 4096,
    };
    return _config;
  }

  return null;
}

/**
 * Reset cached config (for testing or after config changes).
 */
export function resetBrainConfig() {
  _config = null;
}

/**
 * Get brain status (safe to expose — no secrets).
 */
export async function getBrainStatus() {
  const config = await loadBrainConfig();
  return {
    configured: !!config,
    model: config?.model || null,
    maxTokens: config?.maxTokens || null,
    configPath: CONFIG_PATH,
  };
}

/**
 * Call LLM with streaming. Parses SSE chunks, accumulates the full response,
 * and calls onToken for each content delta.
 *
 * @param {Object} params
 * @param {Array} params.messages
 * @param {string} [params.systemPrompt]
 * @param {Array} [params.tools]
 * @param {number} [params.maxTokens]
 * @param {function} [params.onToken] - Called with each content delta string
 * @returns {Promise<{ content: string, toolCalls: Array|null, finishReason: string }>}
 */
export async function callLLMStream({ messages, systemPrompt, tools, maxTokens, onToken }) {
  const config = await loadBrainConfig();
  if (!config) {
    throw new Error(
      `Brain not configured. Create ${CONFIG_PATH} with your OpenRouter API key, or set OPENROUTER_API_KEY env var.`
    );
  }

  const body = {
    model: config.model,
    max_tokens: maxTokens || config.maxTokens,
    temperature: 0,
    stream: true,
    messages: [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      ...messages,
    ],
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "HTTP-Referer": "https://clawdoc.cc",
      "X-Title": "ClawDoc Brain",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API error (${res.status}): ${err}`);
  }

  let content = "";
  const toolCallsMap = new Map();
  let finishReason = "stop";

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
      let chunk;
      try { chunk = JSON.parse(line.slice(6)); } catch { continue; }

      const delta = chunk.choices?.[0]?.delta;
      if (!delta) continue;

      if (chunk.choices[0].finish_reason) {
        finishReason = chunk.choices[0].finish_reason;
      }

      if (delta.content) {
        content += delta.content;
        if (onToken) onToken(delta.content);
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          if (!toolCallsMap.has(idx)) {
            toolCallsMap.set(idx, { id: tc.id || "", type: "function", function: { name: "", arguments: "" } });
          }
          const existing = toolCallsMap.get(idx);
          if (tc.id) existing.id = tc.id;
          if (tc.function?.name) existing.function.name += tc.function.name;
          if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
        }
      }
    }
  }

  const toolCalls = toolCallsMap.size > 0
    ? Array.from(toolCallsMap.values())
    : null;

  return { content, toolCalls, finishReason };
}

/**
 * Run an agentic loop: call LLM with tools, execute tool calls, repeat until done.
 *
 * @param {Object} params
 * @param {string} params.systemPrompt
 * @param {Array} params.messages - Initial messages
 * @param {Array} params.tools - Tool definitions (OpenAI format)
 * @param {Object} params.toolHandlers - Map of tool name → async handler function
 * @param {number} [params.maxIterations=10] - Safety limit
 * @param {function} [params.onProgress] - Called with status updates
 * @returns {Promise<{ content: string, messages: Array }>}
 */
export async function runAgentLoop({
  systemPrompt,
  messages,
  tools,
  toolHandlers,
  maxIterations = 10,
  onProgress,
  onToken,
}) {
  const allMessages = [...messages];
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;

    const result = await callLLMStream({
      systemPrompt,
      messages: allMessages,
      tools,
      onToken,
    });

    // If no tool calls, we're done — append the final assistant response
    if (!result.toolCalls || result.toolCalls.length === 0) {
      allMessages.push({ role: "assistant", content: result.content });
      return { content: result.content, messages: allMessages };
    }

    // Add assistant message with tool calls
    allMessages.push({
      role: "assistant",
      content: result.content || null,
      tool_calls: result.toolCalls,
    });

    // Execute each tool call
    for (const toolCall of result.toolCalls) {
      const handler = toolHandlers[toolCall.function.name];
      if (!handler) {
        allMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: `Unknown tool: ${toolCall.function.name}` }),
        });
        continue;
      }

      if (onProgress) {
        onProgress({
          type: "tool_call",
          tool: toolCall.function.name,
          args: toolCall.function.arguments,
        });
      }

      try {
        const args = JSON.parse(toolCall.function.arguments);
        const toolResult = await handler(args);
        allMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult),
        });
      } catch (err) {
        allMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: err.message }),
        });
      }
    }
  }

  // Hit iteration limit
  return {
    content: "Analysis incomplete — reached maximum tool call iterations.",
    messages: allMessages,
  };
}
