"use client";

import { useAppStore } from "@/lib/store";
import { useState } from "react";
import {
  GitFork,
  ChevronDown,
  Server,
  Brain,
  FileText,
  Radio,
  Cpu,
  Database,
  ArrowDown,
  Eye,
} from "lucide-react";

interface LayerInfo {
  id: string;
  title: string;
  icon: React.ComponentType<{ size: number }>;
  color: string;
  shortDesc: string;
  fullDesc: string;
  shared: boolean;
  tokenCost: string;
  realData?: string;
}

export default function ArchitecturePage() {
  const { serverInfo, connectionStatus } = useAppStore();
  const isConnected = connectionStatus === "connected";
  const [expandedLayer, setExpandedLayer] = useState<string | null>(null);

  const bootstrapFiles = serverInfo?.bootstrapFiles || {};

  const LAYERS: LayerInfo[] = [
    {
      id: "gateway",
      title: "Gateway Process",
      icon: Server,
      color: "var(--accent-amber)",
      shortDesc: "The central hub that routes messages between you and your agents.",
      fullDesc:
        "The Gateway is a single Node.js process that manages all agents, handles API communication, and routes messages. It maintains WebSocket connections and serves the web interface. All agents share the same Gateway process — if it goes down, all agents go down. This is why you see 'gateway not responding' errors affecting everything at once.",
      shared: true,
      tokenCost: "0 tokens (infrastructure layer)",
    },
    {
      id: "bootstrap",
      title: "Bootstrap Files",
      icon: FileText,
      color: "var(--accent-red)",
      shortDesc: "SOUL.md, USER.md, AGENTS.md, MEMORY.md — sent with EVERY message.",
      fullDesc:
        "Every time your agent processes a message, ALL bootstrap files are injected into the prompt. This means a 5,000-token SOUL.md costs you 5,000 tokens per message BEFORE your actual question. This is the #1 hidden cost. Most users don't realize their MEMORY.md has grown to 10K+ tokens and is silently burning money with every interaction. The total is capped by bootstrapMaxChars (default 20,000) and bootstrapTotalMaxChars (default 150,000).",
      shared: false,
      tokenCost: "Sent per message",
      realData: isConnected
        ? `Your total: ~${Object.values(bootstrapFiles)
            .reduce((s, f) => s + (f.estimatedTokens || 0), 0)
            .toLocaleString()} tokens per message`
        : undefined,
    },
    {
      id: "memory-session",
      title: "Session Memory",
      icon: Brain,
      color: "var(--accent-blue)",
      shortDesc: "Active conversation context. Grows with each message until flushed.",
      fullDesc:
        "Each conversation (session) accumulates messages. The full history is sent with every new message, which is why long conversations get expensive. When you hit the context limit, older messages get dropped — unless memoryFlush is enabled, in which case important info gets saved to MEMORY.md first. Without memoryFlush, switching models mid-conversation can cause 'amnesia' — the new model has no access to what the previous model learned.",
      shared: false,
      tokenCost: "Grows linearly per message",
    },
    {
      id: "memory-knowledge",
      title: "Knowledge Graph",
      icon: Database,
      color: "var(--accent-purple)",
      shortDesc: "Long-term memory stored in SQLite. Persists across sessions.",
      fullDesc:
        "OpenClaw uses SQLite with FTS5 (full-text search) for long-term memory. When the agent learns something important, it can store it here. This persists across sessions and model switches. However, the agent DECIDES what to save — there's no guarantee important info will be stored. This is why you sometimes feel the agent 'forgot' something you told it — it may never have saved it in the first place.",
      shared: false,
      tokenCost: "Only retrieved when relevant (RAG)",
    },
    {
      id: "model-routing",
      title: "Model Routing",
      icon: Cpu,
      color: "var(--accent-green)",
      shortDesc: "Primary → Fallback → Heartbeat. Different models for different tasks.",
      fullDesc:
        "OpenClaw supports a model cascade: Primary model handles main tasks. Fallback activates when primary rate-limits or errors. Heartbeat model runs periodic checks (is the agent alive? any pending tasks?). Common mistake: using the same expensive model for all three. Your heartbeat runs every few seconds — using Opus for heartbeats is like hiring a surgeon to take your temperature. Use Haiku or Ollama for heartbeats, save Opus/Sonnet for actual work.",
      shared: true,
      tokenCost: "Varies by model tier",
      realData: isConnected && serverInfo?.config
        ? (() => {
            const mc = (serverInfo.config as Record<string, unknown>)?.agents as Record<string, unknown>;
            const defaults = mc?.defaults as Record<string, unknown>;
            const model = defaults?.model as Record<string, unknown>;
            return model?.primary
              ? `Your primary: ${model.primary}`
              : "No primary model set";
          })()
        : undefined,
    },
    {
      id: "channels",
      title: "Channels & Skills",
      icon: Radio,
      color: "var(--accent-amber)",
      shortDesc: "How agents connect to the outside world. Each adds token overhead.",
      fullDesc:
        "Channels (Slack, Discord, Telegram, etc.) are how agents communicate externally. Skills are tools agents can use (web search, file management, etc.). Each enabled skill adds to the system prompt, increasing token cost per message. Having 50 skills enabled when you only use 5 is wasteful. Skills can also conflict — two web-search skills will confuse the agent about which to use.",
      shared: true,
      tokenCost: "Skill descriptions added to system prompt",
    },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          How OpenClaw Actually Works
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Interactive architecture guide. Click each layer to learn more.
          {isConnected && (
            <span style={{ color: "var(--accent-amber)" }}>
              {" "}Showing your real data.
            </span>
          )}
        </p>
      </div>

      {/* Visual flow */}
      <div className="space-y-3 stagger-children">
        {LAYERS.map((layer, i) => {
          const isExpanded = expandedLayer === layer.id;
          const Icon = layer.icon;

          return (
            <div key={layer.id}>
              {/* Connector arrow */}
              {i > 0 && (
                <div className="flex justify-center py-1">
                  <ArrowDown size={16} style={{ color: "var(--text-tertiary)" }} />
                </div>
              )}

              <button
                onClick={() => setExpandedLayer(isExpanded ? null : layer.id)}
                className="w-full rounded-xl p-5 text-left transition-all"
                style={{
                  background: isExpanded ? "var(--bg-card-hover)" : "var(--bg-card)",
                  border: `1px solid ${isExpanded ? layer.color + "40" : "var(--border-subtle)"}`,
                  boxShadow: isExpanded ? `0 0 20px ${layer.color}10` : "none",
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${layer.color}15`, color: layer.color }}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-sm">{layer.title}</h3>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          background: layer.shared ? "var(--accent-blue-dim)" : "var(--accent-green-dim)",
                          color: layer.shared ? "var(--accent-blue)" : "var(--accent-green)",
                        }}
                      >
                        {layer.shared ? "Shared" : "Per-Agent"}
                      </span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                      {layer.shortDesc}
                    </p>
                    {layer.realData && (
                      <p
                        className="text-xs mt-1.5 flex items-center gap-1"
                        style={{ color: "var(--accent-amber)", fontFamily: "var(--font-display)" }}
                      >
                        <Eye size={10} />
                        {layer.realData}
                      </p>
                    )}
                  </div>
                  <ChevronDown
                    size={16}
                    style={{
                      color: "var(--text-tertiary)",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                      transition: "transform 0.2s",
                    }}
                  />
                </div>

                {isExpanded && (
                  <div className="mt-4 pl-14">
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                      {layer.fullDesc}
                    </p>
                    <div
                      className="mt-3 px-3 py-2 rounded-lg inline-flex items-center gap-2"
                      style={{ background: "var(--bg-deep)" }}
                    >
                      <span className="text-[10px] tracking-wider" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-display)" }}>
                        TOKEN COST:
                      </span>
                      <span className="text-xs font-medium" style={{ color: layer.color, fontFamily: "var(--font-display)" }}>
                        {layer.tokenCost}
                      </span>
                    </div>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Key insight */}
      <div
        className="mt-8 rounded-xl p-6"
        style={{
          background: "var(--accent-amber-dim)",
          border: "1px solid rgba(245, 158, 66, 0.2)",
        }}
      >
        <h3 className="font-bold text-sm mb-2" style={{ color: "var(--accent-amber)" }}>
          The Key Insight Most Users Miss
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Every message you send triggers this full pipeline: Bootstrap files + conversation history + skill descriptions + your actual question.
          A &ldquo;simple&rdquo; question can easily consume 20,000+ tokens before the model even starts thinking about your answer.
          This is why OpenClaw feels expensive and why trimming your bootstrap files and disabling unused skills has such a massive impact on cost.
        </p>
      </div>
    </div>
  );
}
