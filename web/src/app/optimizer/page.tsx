"use client";

import { useAppStore } from "@/lib/store";
import { useState } from "react";
import { DollarSign, ArrowRight, TrendingDown } from "lucide-react";

const MODEL_PRICING: Record<string, { input: number; output: number; label: string }> = {
  "anthropic/claude-opus-4-6": { input: 15, output: 75, label: "Claude Opus 4.6" },
  "anthropic/claude-sonnet-4-6": { input: 3, output: 15, label: "Claude Sonnet 4.6" },
  "anthropic/claude-haiku-3-5": { input: 0.25, output: 1.25, label: "Claude Haiku 3.5" },
  "openai/gpt-4o": { input: 2.5, output: 10, label: "GPT-4o" },
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6, label: "GPT-4o Mini" },
  "ollama/llama3": { input: 0, output: 0, label: "Ollama Llama 3" },
  "ollama/mistral": { input: 0, output: 0, label: "Ollama Mistral" },
};

function calculateMonthlyCost(
  model: string,
  messagesPerDay: number,
  avgInputTokens: number,
  avgOutputTokens: number
) {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  const dailyCost =
    messagesPerDay *
    ((avgInputTokens / 1_000_000) * pricing.input +
      (avgOutputTokens / 1_000_000) * pricing.output);
  return dailyCost * 30;
}

export default function OptimizerPage() {
  const { connectionStatus, serverInfo } = useAppStore();
  const isConnected = connectionStatus === "connected";

  const [messagesPerDay, setMessagesPerDay] = useState(50);
  const [avgInputTokens, setAvgInputTokens] = useState(5000);
  const [avgOutputTokens, setAvgOutputTokens] = useState(1000);
  const [currentModel, setCurrentModel] = useState("anthropic/claude-sonnet-4-6");

  // Auto-fill from server info
  const config = serverInfo?.config as Record<string, unknown> | null;
  const agentsConfig = config?.agents as Record<string, unknown> | undefined;
  const defaultsConfig = agentsConfig?.defaults as Record<string, unknown> | undefined;
  const modelConfig = defaultsConfig?.model as Record<string, unknown> | undefined;
  const detectedModel = (modelConfig?.primary as string) || "";

  if (detectedModel && detectedModel !== currentModel && isConnected) {
    // Will set on first render only
  }

  const currentCost = calculateMonthlyCost(currentModel, messagesPerDay, avgInputTokens, avgOutputTokens);

  // Calculate costs for all models
  const comparisons = Object.entries(MODEL_PRICING)
    .map(([id, pricing]) => ({
      id,
      label: pricing.label,
      cost: calculateMonthlyCost(id, messagesPerDay, avgInputTokens, avgOutputTokens),
      savings: currentCost - calculateMonthlyCost(id, messagesPerDay, avgInputTokens, avgOutputTokens),
    }))
    .sort((a, b) => a.cost - b.cost);

  // Bootstrap overhead
  const totalBootstrapTokens = isConnected
    ? Object.values(serverInfo?.bootstrapFiles || {}).reduce(
        (s, f) => s + (f.estimatedTokens || 0),
        0
      )
    : 0;

  const bootstrapMonthlyCost = isConnected
    ? calculateMonthlyCost(currentModel, messagesPerDay, totalBootstrapTokens, 0)
    : 0;

  return (
    <div className="p-8 w-full max-w-4xl">
      <div className="mb-8 animate-fade-in-up">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          Cost Optimizer
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          See how much you could save by switching models or optimizing config.
        </p>
        <p className="text-xs mt-2" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-display)" }}>
          * All costs are estimates based on public API pricing. Actual costs may vary.
        </p>
      </div>

      {/* Input controls */}
      <div className="rounded-xl p-5 mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
        <h2 className="text-xs font-semibold tracking-wider mb-4" style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}>
          YOUR USAGE
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-display)" }}>
              Current Model
            </label>
            <select
              value={currentModel}
              onChange={(e) => setCurrentModel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-deep)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
            >
              {Object.entries(MODEL_PRICING).map(([id, p]) => (
                <option key={id} value={id}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-display)" }}>
              Messages per day
            </label>
            <input
              type="number"
              value={messagesPerDay}
              onChange={(e) => setMessagesPerDay(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-deep)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
            />
          </div>
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-display)" }}>
              Avg input tokens/message
            </label>
            <input
              type="number"
              value={avgInputTokens}
              onChange={(e) => setAvgInputTokens(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-deep)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
            />
          </div>
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-display)" }}>
              Avg output tokens/message
            </label>
            <input
              type="number"
              value={avgOutputTokens}
              onChange={(e) => setAvgOutputTokens(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-deep)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontFamily: "var(--font-display)" }}
            />
          </div>
        </div>
      </div>

      {/* Current cost */}
      <div className="rounded-xl p-5 mb-6 text-center" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
        <p className="text-xs tracking-wider mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}>
          EST. MONTHLY COST
        </p>
        <p className="text-4xl font-bold" style={{ fontFamily: "var(--font-display)", color: currentCost > 100 ? "var(--accent-red)" : currentCost > 30 ? "var(--accent-amber)" : "var(--accent-green)" }}>
          ${currentCost.toFixed(2)}
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
          with {MODEL_PRICING[currentModel]?.label || currentModel}
        </p>
      </div>

      {/* Bootstrap overhead */}
      {isConnected && totalBootstrapTokens > 0 && (
        <div className="rounded-xl p-5 mb-6" style={{ background: "var(--accent-red-dim)", border: "1px solid rgba(239, 100, 97, 0.15)" }}>
          <div className="flex items-center gap-3">
            <DollarSign size={20} style={{ color: "var(--accent-red)" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--accent-red)" }}>
                Bootstrap Overhead: ${bootstrapMonthlyCost.toFixed(2)}/month
              </p>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Your {totalBootstrapTokens.toLocaleString()} bootstrap tokens cost you this much just in overhead.
                Reducing bootstrap files is the easiest way to save.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* What-if comparisons */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
        <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <h2 className="text-xs font-semibold tracking-wider" style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}>
            WHAT-IF: SWITCH MODELS
          </h2>
        </div>
        <div>
          {comparisons.map((comp) => {
            const isCurrent = comp.id === currentModel;
            const savesMore = comp.savings > 0;
            return (
              <div
                key={comp.id}
                className="flex items-center justify-between px-5 py-3"
                style={{
                  borderBottom: "1px solid var(--border-subtle)",
                  background: isCurrent ? "var(--accent-amber-dim)" : "transparent",
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium" style={{ color: isCurrent ? "var(--accent-amber)" : "var(--text-primary)" }}>
                    {comp.label}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--accent-amber-dim)", color: "var(--accent-amber)" }}>
                      Current
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                    ${comp.cost.toFixed(2)}/mo
                  </span>
                  {!isCurrent && savesMore && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: "var(--accent-green)" }}>
                      <TrendingDown size={12} />
                      Save ${comp.savings.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
