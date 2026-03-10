"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  Wand2,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Sparkles,
  Loader2,
} from "lucide-react";

interface WizardAnswer {
  useCase: string[];
  budget: number;
  agentCount: string;
  serverSpec: string;
  languages: string[];
  // Advanced
  needsVision: boolean;
  needsToolCalling: boolean;
  speedVsQuality: number;
  existingKeys: string[];
}

const USE_CASES = [
  "Chat assistant",
  "Customer service",
  "Research",
  "Coding",
  "Automation",
  "Social media",
  "Data analysis",
];

const LANGUAGES = ["English only", "English + Chinese", "English + European", "Multilingual (5+)"];

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-2.5 rounded-lg text-sm transition-all"
      style={{
        background: selected ? "var(--accent-amber-dim)" : "var(--bg-card)",
        border: `1px solid ${selected ? "var(--border-active)" : "var(--border-subtle)"}`,
        color: selected ? "var(--accent-amber)" : "var(--text-secondary)",
      }}
    >
      {label}
    </button>
  );
}

function Slider({
  value,
  onChange,
  min,
  max,
  labels,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  labels: string[];
}) {
  return (
    <div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, var(--accent-amber) ${((value - min) / (max - min)) * 100}%, var(--bg-elevated) ${((value - min) / (max - min)) * 100}%)`,
        }}
      />
      <div className="flex justify-between mt-2">
        {labels.map((l) => (
          <span key={l} className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function generateRecommendation(answers: WizardAnswer) {
  let primary = "anthropic/claude-sonnet-4-6";
  let fallbacks = ["anthropic/claude-haiku-3-5"];
  let heartbeat = "ollama/llama3";
  let maxTokens = 4096;
  let reasoning = [];

  // Budget-driven
  if (answers.budget <= 10) {
    primary = "anthropic/claude-haiku-3-5";
    fallbacks = ["openai/gpt-4o-mini"];
    maxTokens = 2048;
    reasoning.push("Haiku is your best bet on a tight budget — fast, cheap, and surprisingly capable for most tasks.");
  } else if (answers.budget <= 50) {
    primary = "anthropic/claude-sonnet-4-6";
    fallbacks = ["anthropic/claude-haiku-3-5", "openai/gpt-4o-mini"];
    reasoning.push("Sonnet 4.6 gives you the best quality-to-cost ratio. Haiku fallback keeps costs down when Sonnet rate-limits.");
  } else {
    primary = "anthropic/claude-sonnet-4-6";
    fallbacks = ["anthropic/claude-opus-4-6", "openai/gpt-4o"];
    maxTokens = 8192;
    reasoning.push("With your budget, Sonnet as primary with Opus fallback for complex reasoning gives you the best of both worlds.");
  }

  // Use case adjustments
  if (answers.useCase.includes("Coding")) {
    if (answers.budget > 30) {
      fallbacks = ["anthropic/claude-opus-4-6"];
      reasoning.push("Opus fallback added for complex code generation and debugging.");
    }
    maxTokens = Math.max(maxTokens, 8192);
  }

  if (answers.useCase.includes("Research")) {
    maxTokens = Math.max(maxTokens, 8192);
    reasoning.push("Higher token limit for longer research outputs.");
  }

  if (answers.useCase.includes("Customer service")) {
    if (answers.budget <= 30) {
      primary = "anthropic/claude-haiku-3-5";
      reasoning.push("Haiku is ideal for customer service — fast responses keep customers happy, and most queries don't need deep reasoning.");
    }
  }

  // Server spec
  if (answers.serverSpec === "powerful") {
    heartbeat = "ollama/llama3";
    reasoning.push("Your server can run local models — using Ollama for heartbeats saves money.");
  } else {
    heartbeat = "anthropic/claude-haiku-3-5";
    reasoning.push("Without local GPU, using Haiku for heartbeats (cheapest cloud option).");
  }

  // Agent count
  if (answers.agentCount === "4+") {
    reasoning.push("With 4+ agents, consider using Haiku for less critical agents to manage costs.");
  }

  const estimatedMonthlyCost =
    primary.includes("opus") ? "$80-200" :
    primary.includes("sonnet") ? "$20-80" :
    primary.includes("haiku") ? "$5-25" :
    "$0 (local)";

  const config = {
    agents: {
      defaults: {
        model: { primary, fallbacks, heartbeat },
        memoryFlush: true,
        maxTokens,
        cacheControlTtl: 300,
      },
    },
  };

  return { config, reasoning, estimatedMonthlyCost, primary, fallbacks, heartbeat };
}

export default function WizardPage() {
  const { connectionStatus, applyOperation } = useAppStore();
  const isConnected = connectionStatus === "connected";

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<WizardAnswer>({
    useCase: [],
    budget: 30,
    agentCount: "1",
    serverSpec: "basic",
    languages: ["English only"],
    needsVision: false,
    needsToolCalling: false,
    speedVsQuality: 50,
    existingKeys: [],
  });
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ ok: boolean; message: string } | null>(null);

  const STEPS = [
    {
      question: "What do you mainly use OpenClaw for?",
      hint: "Select all that apply",
      render: () => (
        <div className="flex flex-wrap gap-2">
          {USE_CASES.map((uc) => (
            <OptionButton
              key={uc}
              label={uc}
              selected={answers.useCase.includes(uc)}
              onClick={() =>
                setAnswers((a) => ({
                  ...a,
                  useCase: a.useCase.includes(uc)
                    ? a.useCase.filter((x) => x !== uc)
                    : [...a.useCase, uc],
                }))
              }
            />
          ))}
        </div>
      ),
    },
    {
      question: "What's your monthly budget?",
      hint: `$${answers.budget}/month`,
      render: () => (
        <Slider
          value={answers.budget}
          onChange={(v) => setAnswers((a) => ({ ...a, budget: v }))}
          min={0}
          max={150}
          labels={["$0 Free", "$30", "$75", "$150+"]}
        />
      ),
    },
    {
      question: "How many agents do you run?",
      hint: "",
      render: () => (
        <div className="flex gap-2">
          {["1", "2-3", "4+"].map((n) => (
            <OptionButton
              key={n}
              label={n}
              selected={answers.agentCount === n}
              onClick={() => setAnswers((a) => ({ ...a, agentCount: n }))}
            />
          ))}
        </div>
      ),
    },
    {
      question: "What's your server spec?",
      hint: "Affects whether we recommend local models",
      render: () => (
        <div className="flex gap-2">
          {[
            { id: "basic", label: "Basic (no GPU)" },
            { id: "moderate", label: "Moderate (8GB+ VRAM)" },
            { id: "powerful", label: "Powerful (24GB+ VRAM)" },
          ].map((s) => (
            <OptionButton
              key={s.id}
              label={s.label}
              selected={answers.serverSpec === s.id}
              onClick={() => setAnswers((a) => ({ ...a, serverSpec: s.id }))}
            />
          ))}
        </div>
      ),
    },
    {
      question: "What languages does your agent need to support?",
      hint: "Some models have weaker multilingual capabilities",
      render: () => (
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => (
            <OptionButton
              key={lang}
              label={lang}
              selected={answers.languages.includes(lang)}
              onClick={() => setAnswers((a) => ({ ...a, languages: [lang] }))}
            />
          ))}
        </div>
      ),
    },
  ];

  const recommendation = showResult ? generateRecommendation(answers) : null;
  const configJson = recommendation ? JSON.stringify(recommendation.config, null, 2) : "";

  const handleApply = async () => {
    if (!recommendation || !isConnected) return;
    setApplying(true);

    try {
      const mc = recommendation.config.agents.defaults.model;
      await applyOperation("set-primary-model", { model: mc.primary });
      await applyOperation("set-fallback-models", { models: mc.fallbacks });
      await applyOperation("set-heartbeat-model", { model: mc.heartbeat });
      await applyOperation("enable-memory-flush", {});
      await applyOperation("set-cache-ttl", { ttl: 300 });
      await applyOperation("set-max-tokens", { maxTokens: recommendation.config.agents.defaults.maxTokens });
      setApplyResult({ ok: true, message: "Recommendation applied!" });
    } catch {
      setApplyResult({ ok: false, message: "Failed to apply." });
    } finally {
      setApplying(false);
      setTimeout(() => setApplyResult(null), 4000);
    }
  };

  if (showResult && recommendation) {
    return (
      <div className="p-8 max-w-2xl animate-fade-in-up">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            Your Recommendation
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Based on your answers, here is the optimal configuration.
          </p>
        </div>

        {applyResult && (
          <div
            className="mb-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm"
            style={{
              background: applyResult.ok ? "var(--accent-green-dim)" : "var(--accent-red-dim)",
              color: applyResult.ok ? "var(--accent-green)" : "var(--accent-red)",
            }}
          >
            <Check size={16} />
            {applyResult.message}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-4 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-[10px] tracking-wider mb-1" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-display)" }}>PRIMARY</p>
            <p className="text-sm font-medium" style={{ fontFamily: "var(--font-display)" }}>{recommendation.primary.split("/").pop()}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-[10px] tracking-wider mb-1" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-display)" }}>HEARTBEAT</p>
            <p className="text-sm font-medium" style={{ fontFamily: "var(--font-display)" }}>{recommendation.heartbeat.split("/").pop()}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-[10px] tracking-wider mb-1" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-display)" }}>EST. COST</p>
            <p className="text-sm font-medium" style={{ color: "var(--accent-amber)", fontFamily: "var(--font-display)" }}>{recommendation.estimatedMonthlyCost}</p>
          </div>
        </div>

        {/* Reasoning */}
        <div className="rounded-xl p-5 mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
          <h3 className="text-xs font-semibold tracking-wider mb-3" style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}>
            WHY THIS CONFIGURATION
          </h3>
          <ul className="space-y-2">
            {recommendation.reasoning.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                <span style={{ color: "var(--accent-amber)" }}>-</span>
                {r}
              </li>
            ))}
          </ul>
        </div>

        {/* Config JSON */}
        <div className="rounded-xl overflow-hidden mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <span className="text-xs" style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}>
              openclaw.json
            </span>
            <button
              onClick={() => { navigator.clipboard.writeText(configJson); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              className="flex items-center gap-1.5 text-xs"
              style={{ color: copied ? "var(--accent-green)" : "var(--text-tertiary)" }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="p-5 text-xs overflow-x-auto" style={{ fontFamily: "var(--font-display)", color: "var(--accent-green)" }}>
            {configJson}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => { setShowResult(false); setStep(0); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm"
            style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}
          >
            <ArrowLeft size={14} />
            Start Over
          </button>
          {isConnected && (
            <button
              onClick={handleApply}
              disabled={applying}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold"
              style={{
                background: applying ? "var(--bg-elevated)" : "linear-gradient(135deg, var(--accent-amber), #e67e22)",
                color: applying ? "var(--text-tertiary)" : "var(--bg-deep)",
                boxShadow: applying ? "none" : "var(--shadow-glow-amber)",
              }}
            >
              {applying ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {applying ? "Applying..." : "Apply to my OpenClaw"}
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentStep = STEPS[step];

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-lg animate-fade-in-up">
        <div className="text-center mb-10">
          <Wand2 size={36} style={{ color: "var(--accent-amber)" }} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            Model Wizard
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Answer a few questions, get the optimal configuration.
          </p>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full transition-all"
              style={{
                background: i <= step ? "var(--accent-amber)" : "var(--bg-elevated)",
              }}
            />
          ))}
        </div>

        {/* Question */}
        <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)" }}>
          <p className="text-xs mb-1" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-display)" }}>
            Question {step + 1} of {STEPS.length}
          </p>
          <h2 className="text-lg font-semibold mb-1">{currentStep.question}</h2>
          {currentStep.hint && (
            <p className="text-xs mb-4" style={{ color: "var(--accent-amber)", fontFamily: "var(--font-display)" }}>
              {currentStep.hint}
            </p>
          )}
          {!currentStep.hint && <div className="mb-4" />}
          {currentStep.render()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-colors"
            style={{
              background: "var(--bg-card)",
              color: step === 0 ? "var(--text-tertiary)" : "var(--text-secondary)",
              opacity: step === 0 ? 0.5 : 1,
            }}
          >
            <ArrowLeft size={14} />
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold"
              style={{
                background: "linear-gradient(135deg, var(--accent-amber), #e67e22)",
                color: "var(--bg-deep)",
              }}
            >
              Next
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={() => setShowResult(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold"
              style={{
                background: "linear-gradient(135deg, var(--accent-amber), #e67e22)",
                color: "var(--bg-deep)",
                boxShadow: "var(--shadow-glow-amber)",
              }}
            >
              <Sparkles size={14} />
              Get Recommendation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
