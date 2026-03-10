"use client";

import { useAppStore, DiagnosisIssue } from "@/lib/store";
import { useEffect, useState } from "react";
import {
  Stethoscope,
  AlertTriangle,
  AlertCircle,
  Info,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Wrench,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

const SEVERITY_CONFIG: Record<
  string,
  { icon: React.ComponentType<{ size: number }>; color: string; bg: string; label: string }
> = {
  critical: {
    icon: ShieldAlert,
    color: "var(--accent-red)",
    bg: "var(--accent-red-dim)",
    label: "Critical",
  },
  high: {
    icon: AlertTriangle,
    color: "#f59e42",
    bg: "rgba(245, 158, 66, 0.15)",
    label: "High",
  },
  medium: {
    icon: AlertCircle,
    color: "var(--accent-blue)",
    bg: "var(--accent-blue-dim)",
    label: "Medium",
  },
  low: {
    icon: Info,
    color: "var(--text-tertiary)",
    bg: "var(--bg-elevated)",
    label: "Low",
  },
};

function ScoreGauge({ score, grade }: { score: number; grade: string }) {
  const circumference = 2 * Math.PI * 54;
  const progress = (score / 100) * circumference;
  const color =
    score >= 90
      ? "var(--accent-green)"
      : score >= 75
        ? "var(--accent-amber)"
        : score >= 60
          ? "#f59e42"
          : "var(--accent-red)";

  return (
    <div className="relative w-36 h-36">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="var(--bg-elevated)"
          strokeWidth="8"
        />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          style={{
            transition: "stroke-dashoffset 1s ease-out",
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-3xl font-bold"
          style={{ fontFamily: "var(--font-display)", color }}
        >
          {score}
        </span>
        <span
          className="text-xs"
          style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-display)" }}
        >
          Grade {grade}
        </span>
      </div>
    </div>
  );
}

function IssueCard({
  issue,
  onFix,
}: {
  issue: DiagnosisIssue;
  onFix: (issue: DiagnosisIssue) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = SEVERITY_CONFIG[issue.severity];
  const Icon = config.icon;

  return (
    <div
      className="rounded-xl overflow-hidden transition-colors"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: config.bg, color: config.color }}
        >
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{issue.title}</p>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded mt-0.5 inline-block"
            style={{ background: config.bg, color: config.color }}
          >
            {config.label}
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={16} style={{ color: "var(--text-tertiary)" }} />
        ) : (
          <ChevronDown size={16} style={{ color: "var(--text-tertiary)" }} />
        )}
      </button>

      {expanded && (
        <div
          className="px-4 pb-4 space-y-3"
          style={{ borderTop: "1px solid var(--border-subtle)" }}
        >
          <p
            className="text-sm leading-relaxed pt-3"
            style={{ color: "var(--text-secondary)" }}
          >
            {issue.description}
          </p>

          <div
            className="rounded-lg p-3"
            style={{ background: "var(--bg-deep)" }}
          >
            <p
              className="text-[10px] mb-1 tracking-wider"
              style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-display)" }}
            >
              FIX: {issue.fix.path}
            </p>
            <code
              className="text-xs"
              style={{ color: "var(--accent-green)", fontFamily: "var(--font-display)" }}
            >
              {issue.fix.suggestion}
            </code>
          </div>

          <button
            onClick={() => onFix(issue)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: "var(--accent-amber-dim)",
              color: "var(--accent-amber)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background =
                "linear-gradient(135deg, var(--accent-amber), #e67e22)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--accent-amber-dim)")
            }
            onMouseOver={(e) =>
              (e.currentTarget.style.color = "var(--bg-deep)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.color = "var(--accent-amber)")
            }
          >
            <Wrench size={14} />
            Apply Fix
          </button>
        </div>
      )}
    </div>
  );
}

export default function DiagnosePage() {
  const {
    connectionStatus,
    diagnosis,
    runDiagnosis,
    applyOperation,
  } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [fixResult, setFixResult] = useState<{
    ok: boolean;
    message?: string;
  } | null>(null);

  const isConnected = connectionStatus === "connected";

  useEffect(() => {
    if (isConnected && !diagnosis) {
      setLoading(true);
      runDiagnosis().finally(() => setLoading(false));
    }
  }, [isConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = async () => {
    setLoading(true);
    setFixResult(null);
    await runDiagnosis();
    setLoading(false);
  };

  const handleFix = async (issue: DiagnosisIssue) => {
    const operationMap: Record<string, { operation: string; params: Record<string, unknown> }> = {
      "no-fallbacks": {
        operation: "set-fallback-models",
        params: { models: ["claude-haiku-3-5", "openai/gpt-4o-mini"] },
      },
      "expensive-heartbeat": {
        operation: "set-heartbeat-model",
        params: { model: "ollama/llama3" },
      },
      "memory-flush-off": {
        operation: "enable-memory-flush",
        params: {},
      },
      "no-cache-control": {
        operation: "set-cache-ttl",
        params: { ttl: 300 },
      },
      "max-tokens-high": {
        operation: "set-max-tokens",
        params: { maxTokens: 4096 },
      },
      "no-primary-model": {
        operation: "set-primary-model",
        params: { model: "anthropic/claude-sonnet-4-6" },
      },
    };

    const op = operationMap[issue.id];
    if (!op) {
      setFixResult({ ok: false, message: "This fix requires manual intervention." });
      return;
    }

    const result = await applyOperation(op.operation, op.params);
    setFixResult(result);

    if (result.ok) {
      // Re-run diagnosis after fix
      setTimeout(() => {
        runDiagnosis();
        setTimeout(() => setFixResult(null), 3000);
      }, 500);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <Stethoscope size={48} style={{ color: "var(--text-tertiary)" }} className="mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
            Config Diagnosis
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Connect to your OpenClaw instance first to auto-diagnose your configuration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 w-full max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            Config Diagnosis
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Auto-scanned from your OpenClaw instance
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors"
          style={{ background: "var(--bg-card)", color: "var(--text-secondary)" }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Re-scan
        </button>
      </div>

      {/* Fix result toast */}
      {fixResult && (
        <div
          className="mb-6 flex items-center gap-2 px-4 py-3 rounded-lg text-sm animate-fade-in-up"
          style={{
            background: fixResult.ok ? "var(--accent-green-dim)" : "var(--accent-red-dim)",
            color: fixResult.ok ? "var(--accent-green)" : "var(--accent-red)",
          }}
        >
          {fixResult.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {fixResult.message || (fixResult.ok ? "Fix applied successfully!" : "Fix failed.")}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin mb-4" style={{ color: "var(--accent-amber)" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Scanning your configuration...
          </p>
        </div>
      ) : diagnosis ? (
        <div className="stagger-children">
          {/* Score */}
          <div
            className="rounded-xl p-6 mb-6 flex items-center gap-8"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <ScoreGauge score={diagnosis.score} grade={diagnosis.grade} />
            <div>
              <p className="text-lg font-semibold mb-1">{diagnosis.summary}</p>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {diagnosis.issues.length} issue
                {diagnosis.issues.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>

          {/* Issues */}
          {diagnosis.issues.length === 0 ? (
            <div
              className="rounded-xl p-8 text-center"
              style={{
                background: "var(--accent-green-dim)",
                border: "1px solid rgba(78, 205, 196, 0.2)",
              }}
            >
              <CheckCircle2
                size={40}
                style={{ color: "var(--accent-green)" }}
                className="mx-auto mb-3"
              />
              <p className="font-semibold" style={{ color: "var(--accent-green)" }}>
                No issues found!
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                Your configuration is looking great.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {diagnosis.issues
                .sort((a, b) => {
                  const order = { critical: 0, high: 1, medium: 2, low: 3 };
                  return (
                    (order[a.severity] ?? 4) - (order[b.severity] ?? 4)
                  );
                })
                .map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    onFix={handleFix}
                  />
                ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
