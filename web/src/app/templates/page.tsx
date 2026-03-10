"use client";

import { useAppStore } from "@/lib/store";
import { useState } from "react";
import {
  BookTemplate,
  Copy,
  Check,
  Loader2,
  DollarSign,
  Cpu,
  Sparkles,
  Shield,
  Code,
  MessageSquare,
  BarChart3,
  Users,
  Lock,
  Megaphone,
  Lightbulb,
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ size: number }>;
  accent: string;
  cost: string;
  primaryModel: string;
  config: Record<string, unknown>;
  skills: string[];
  notes: string;
}

const TEMPLATES: Template[] = [
  {
    id: "budget-starter",
    name: "Budget Starter",
    description: "Perfect for trying OpenClaw without breaking the bank. Fast responses, low cost.",
    icon: DollarSign,
    accent: "var(--accent-green)",
    cost: "$5-15/mo",
    primaryModel: "claude-haiku-3-5",
    config: {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-haiku-3-5",
            fallbacks: ["openai/gpt-4o-mini"],
            heartbeat: "ollama/llama3",
          },
          memoryFlush: true,
          maxTokens: 2048,
          cacheControlTtl: 300,
        },
      },
    },
    skills: ["web-search", "file-manager"],
    notes: "Best for: Getting started, simple tasks, Q&A, light automation.",
  },
  {
    id: "smart-assistant",
    name: "Smart Assistant",
    description: "Balanced quality and cost. Great for daily use as a general-purpose AI assistant.",
    icon: Sparkles,
    accent: "var(--accent-blue)",
    cost: "$20-40/mo",
    primaryModel: "claude-sonnet-4-6",
    config: {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-sonnet-4-6",
            fallbacks: ["anthropic/claude-haiku-3-5", "openai/gpt-4o-mini"],
            heartbeat: "ollama/llama3",
          },
          memoryFlush: true,
          maxTokens: 4096,
          cacheControlTtl: 300,
        },
      },
    },
    skills: ["web-search", "file-manager", "calendar", "email"],
    notes: "Best for: Daily assistant, email, scheduling, research queries.",
  },
  {
    id: "power-researcher",
    name: "Power Researcher",
    description: "Deep research with Opus fallback for complex reasoning. Extended memory for long projects.",
    icon: Lightbulb,
    accent: "var(--accent-purple)",
    cost: "$30-60/mo",
    primaryModel: "claude-sonnet-4-6 + opus fallback",
    config: {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-sonnet-4-6",
            fallbacks: ["anthropic/claude-opus-4-6", "openai/gpt-4o"],
            heartbeat: "ollama/llama3",
          },
          memoryFlush: true,
          maxTokens: 8192,
          cacheControlTtl: 600,
        },
      },
    },
    skills: ["web-search", "web-scraper", "file-manager", "pdf-reader"],
    notes: "Best for: Academic research, market analysis, long-form writing.",
  },
  {
    id: "coding-partner",
    name: "Coding Partner",
    description: "Optimized for software development with sandbox mode and code-focused skills.",
    icon: Code,
    accent: "var(--accent-amber)",
    cost: "$40-80/mo",
    primaryModel: "claude-sonnet-4-6 + opus fallback",
    config: {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-sonnet-4-6",
            fallbacks: ["anthropic/claude-opus-4-6"],
            heartbeat: "ollama/llama3",
          },
          memoryFlush: true,
          maxTokens: 8192,
          cacheControlTtl: 300,
          sandbox: true,
        },
      },
    },
    skills: ["git", "code-runner", "file-manager", "web-search", "terminal"],
    notes: "Best for: Writing code, debugging, code review, DevOps tasks.",
  },
  {
    id: "customer-service",
    name: "Customer Service",
    description: "Fast, cheap, and reliable for handling customer inquiries across channels.",
    icon: MessageSquare,
    accent: "var(--accent-green)",
    cost: "$10-25/mo",
    primaryModel: "claude-haiku-3-5",
    config: {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-haiku-3-5",
            fallbacks: ["openai/gpt-4o-mini"],
            heartbeat: "ollama/llama3",
          },
          memoryFlush: true,
          maxTokens: 2048,
          cacheControlTtl: 300,
        },
      },
    },
    skills: ["slack", "discord", "email", "web-search"],
    notes: "Best for: Customer support, ticket triage, FAQ automation.",
  },
  {
    id: "social-media",
    name: "Social Media Manager",
    description: "Manage social media content with a mix of speed (Haiku) and quality (Sonnet).",
    icon: Megaphone,
    accent: "var(--accent-blue)",
    cost: "$15-35/mo",
    primaryModel: "haiku + sonnet",
    config: {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-haiku-3-5",
            fallbacks: ["anthropic/claude-sonnet-4-6"],
            heartbeat: "ollama/llama3",
          },
          memoryFlush: true,
          maxTokens: 2048,
          cacheControlTtl: 300,
        },
      },
    },
    skills: ["web-search", "image-gen", "scheduler"],
    notes: "Best for: Content creation, scheduling posts, engagement monitoring.",
  },
  {
    id: "data-analyst",
    name: "Data Analyst",
    description: "Sonnet-powered analysis with tools for data processing and visualization.",
    icon: BarChart3,
    accent: "var(--accent-purple)",
    cost: "$25-50/mo",
    primaryModel: "claude-sonnet-4-6",
    config: {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-sonnet-4-6",
            fallbacks: ["openai/gpt-4o"],
            heartbeat: "ollama/llama3",
          },
          memoryFlush: true,
          maxTokens: 8192,
          cacheControlTtl: 300,
        },
      },
    },
    skills: ["code-runner", "file-manager", "web-search", "csv-reader"],
    notes: "Best for: Data analysis, report generation, trend detection.",
  },
  {
    id: "multi-agent",
    name: "Multi-Agent Team",
    description: "Mixed models for a team of specialized agents working together.",
    icon: Users,
    accent: "var(--accent-amber)",
    cost: "$50-150/mo",
    primaryModel: "mixed models",
    config: {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-sonnet-4-6",
            fallbacks: ["anthropic/claude-haiku-3-5"],
            heartbeat: "ollama/llama3",
          },
          memoryFlush: true,
          maxTokens: 4096,
          cacheControlTtl: 300,
        },
      },
    },
    skills: ["All skills based on agent specialization"],
    notes: "Best for: Complex workflows requiring multiple specialized agents.",
  },
  {
    id: "privacy-local",
    name: "Privacy-First (Local)",
    description: "100% local with Ollama. No API calls, no cost, complete privacy.",
    icon: Lock,
    accent: "var(--text-secondary)",
    cost: "Free",
    primaryModel: "ollama/llama3",
    config: {
      agents: {
        defaults: {
          model: {
            primary: "ollama/llama3",
            fallbacks: ["ollama/mistral"],
            heartbeat: "ollama/llama3",
          },
          memoryFlush: true,
          maxTokens: 4096,
        },
      },
    },
    skills: ["file-manager", "terminal"],
    notes: "Best for: Sensitive data, offline use, zero cost. Requires local GPU.",
  },
];

function TemplateCard({
  template,
  onApply,
}: {
  template: Template;
  onApply: (t: Template) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const Icon = template.icon;

  const configJson = JSON.stringify(template.config, null, 2);

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${template.accent}15`, color: template.accent }}
          >
            <Icon size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-bold text-sm">{template.name}</h3>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: `${template.accent}15`,
                  color: template.accent,
                  fontFamily: "var(--font-display)",
                }}
              >
                est. {template.cost}
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {template.description}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span
            className="text-[10px] px-2 py-1 rounded"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-display)",
            }}
          >
            <Cpu size={10} className="inline mr-1" style={{ verticalAlign: "middle" }} />
            {template.primaryModel}
          </span>
          {template.skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="text-[10px] px-2 py-1 rounded"
              style={{ background: "var(--bg-elevated)", color: "var(--text-tertiary)" }}
            >
              {skill}
            </span>
          ))}
          {template.skills.length > 3 && (
            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              +{template.skills.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Expandable config preview */}
      <div style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-3 text-xs"
          style={{ color: "var(--text-tertiary)" }}
        >
          <span>{expanded ? "Hide" : "View"} configuration</span>
          <span>{expanded ? "−" : "+"}</span>
        </button>

        {expanded && (
          <div className="px-5 pb-4 space-y-3">
            <div
              className="rounded-lg p-3 overflow-x-auto"
              style={{ background: "var(--bg-deep)" }}
            >
              <pre
                className="text-xs whitespace-pre"
                style={{ fontFamily: "var(--font-display)", color: "var(--accent-green)" }}
              >
                {configJson}
              </pre>
            </div>
            <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {template.notes}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(configJson);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition-colors"
                style={{
                  background: "var(--bg-elevated)",
                  color: copied ? "var(--accent-green)" : "var(--text-secondary)",
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied!" : "Copy JSON"}
              </button>
              <button
                onClick={() => onApply(template)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
                style={{
                  background: "var(--accent-amber-dim)",
                  color: "var(--accent-amber)",
                }}
              >
                <Sparkles size={12} />
                Apply to my OpenClaw
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  const { connectionStatus, applyOperation } = useAppStore();
  const isConnected = connectionStatus === "connected";
  const [applying, setApplying] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleApply = async (template: Template) => {
    if (!isConnected) {
      setResult({ ok: false, message: "Connect to your OpenClaw instance first." });
      return;
    }

    setApplying(template.id);
    setResult(null);

    try {
      const model = template.config.agents as Record<string, unknown>;
      const defaults = (model.defaults as Record<string, unknown>);
      const modelConfig = defaults.model as Record<string, unknown>;

      await applyOperation("set-primary-model", { model: modelConfig.primary });
      if (modelConfig.fallbacks) {
        await applyOperation("set-fallback-models", { models: modelConfig.fallbacks });
      }
      if (modelConfig.heartbeat) {
        await applyOperation("set-heartbeat-model", { model: modelConfig.heartbeat });
      }
      if (defaults.memoryFlush) {
        await applyOperation("enable-memory-flush", {});
      }
      if (defaults.cacheControlTtl) {
        await applyOperation("set-cache-ttl", { ttl: defaults.cacheControlTtl });
      }
      if (defaults.maxTokens) {
        await applyOperation("set-max-tokens", { maxTokens: defaults.maxTokens });
      }

      setResult({ ok: true, message: `"${template.name}" template applied successfully!` });
    } catch {
      setResult({ ok: false, message: "Failed to apply template." });
    } finally {
      setApplying(null);
      setTimeout(() => setResult(null), 5000);
    }
  };

  return (
    <div className="p-8 w-full">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          Configuration Templates
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Pre-built configurations for common use cases. Copy the JSON or apply directly.
        </p>
        <p className="text-xs mt-2" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-display)" }}>
          * All costs are estimates based on typical usage patterns. Actual costs may vary.
        </p>
      </div>

      {result && (
        <div
          className="mb-6 flex items-center gap-2 px-4 py-3 rounded-lg text-sm animate-fade-in-up"
          style={{
            background: result.ok ? "var(--accent-green-dim)" : "var(--accent-red-dim)",
            color: result.ok ? "var(--accent-green)" : "var(--accent-red)",
          }}
        >
          {result.ok ? <Check size={16} /> : <Shield size={16} />}
          {result.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 stagger-children">
        {TEMPLATES.map((template) => (
          <TemplateCard key={template.id} template={template} onApply={handleApply} />
        ))}
      </div>
    </div>
  );
}
