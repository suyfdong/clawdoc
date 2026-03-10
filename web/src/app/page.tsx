"use client";

import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";
import {
  Plug,
  Terminal,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff,
  Shield,
  Cpu,
  HardDrive,
  Zap,
} from "lucide-react";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1.5 rounded-md transition-colors"
      style={{
        color: copied ? "var(--accent-green)" : "var(--text-tertiary)",
        background: copied ? "var(--accent-green-dim)" : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!copied) e.currentTarget.style.background = "var(--bg-elevated)";
      }}
      onMouseLeave={(e) => {
        if (!copied) e.currentTarget.style.background = "transparent";
      }}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ size: number }>;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}15`, color: accent }}
        >
          <Icon size={20} />
        </div>
        <div>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {label}
          </p>
          <p
            className="text-lg font-semibold"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ConnectPage() {
  const {
    serverUrl,
    authToken,
    connectionStatus,
    connectionError,
    serverInfo,
    setServerUrl,
    setAuthToken,
    connect,
    disconnect,
  } = useAppStore();

  const [urlInput, setUrlInput] = useState(serverUrl);
  const [tokenInput, setTokenInput] = useState(authToken);

  // Restore saved connection on mount
  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("clawdoc_connection");
      if (saved) {
        try {
          const { serverUrl: url, authToken: token } = JSON.parse(saved);
          setUrlInput(url);
          setTokenInput(token);
          setServerUrl(url);
          setAuthToken(token);
        } catch {
          // ignore
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-connect if we have saved credentials
  useEffect(() => {
    if (serverUrl && authToken && connectionStatus === "disconnected") {
      connect();
    }
  }, [serverUrl, authToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConnect = () => {
    setServerUrl(urlInput);
    setAuthToken(tokenInput);
    setTimeout(() => {
      useAppStore.getState().connect();
    }, 0);
  };

  const isConnected = connectionStatus === "connected";
  const isConnecting = connectionStatus === "connecting";

  const installCommand = "curl -fsSL https://clawdoc.dev/install.sh | sh";

  // ---- Connected: Dashboard ----
  if (isConnected && serverInfo) {
    const totalTokens = Object.values(serverInfo.bootstrapFiles).reduce(
      (sum, f) => sum + (f.estimatedTokens || 0),
      0
    );

    return (
      <div className="p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8 animate-fade-in-up">
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Mission Control
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Connected to your OpenClaw instance
            </p>
          </div>
          <button
            onClick={disconnect}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors"
            style={{
              background: "var(--accent-red-dim)",
              color: "var(--accent-red)",
            }}
          >
            <WifiOff size={14} />
            Disconnect
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8 stagger-children">
          <StatCard
            icon={Shield}
            label="OpenClaw Version"
            value={`v${serverInfo.version}`}
            accent="var(--accent-amber)"
          />
          <StatCard
            icon={Cpu}
            label="Agents"
            value={String(serverInfo.agents.length)}
            accent="var(--accent-blue)"
          />
          <StatCard
            icon={HardDrive}
            label="Bootstrap Tokens"
            value={totalTokens.toLocaleString()}
            accent={totalTokens > 5000 ? "var(--accent-red)" : "var(--accent-green)"}
          />
          <StatCard
            icon={Zap}
            label="Config Status"
            value={serverInfo.config ? "Loaded" : "Missing"}
            accent="var(--accent-purple)"
          />
        </div>

        {/* Agents */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <h2
            className="text-xs font-semibold mb-3 tracking-widest"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}
          >
            AGENTS
          </h2>
          <div className="space-y-2">
            {serverInfo.agents.length === 0 ? (
              <div
                className="p-6 rounded-xl text-center text-sm"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-tertiary)",
                }}
              >
                No agents found. Start an OpenClaw agent to see it here.
              </div>
            ) : (
              serverInfo.agents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center gap-4 p-4 rounded-xl"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{
                      background: "var(--accent-amber-dim)",
                      color: "var(--accent-amber)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {agent.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{agent.name}</p>
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-display)" }}
                    >
                      {agent.id}
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                    style={{
                      background: agent.hasSession
                        ? "var(--accent-green-dim)"
                        : "var(--bg-elevated)",
                      color: agent.hasSession
                        ? "var(--accent-green)"
                        : "var(--text-tertiary)",
                    }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: agent.hasSession
                          ? "var(--accent-green)"
                          : "var(--text-tertiary)",
                      }}
                    />
                    {agent.hasSession ? "Active" : "Idle"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bootstrap files */}
        <div className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <h2
            className="text-xs font-semibold mb-3 tracking-widest"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}
          >
            BOOTSTRAP FILES
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(serverInfo.bootstrapFiles).map(([name, info]) => (
              <div
                key={name}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{
                  background: info.exists ? "var(--bg-card)" : "transparent",
                  border: "1px solid var(--border-subtle)",
                  opacity: info.exists ? 1 : 0.4,
                }}
              >
                <span
                  className="text-xs font-medium"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {name}
                </span>
                {info.exists ? (
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      background:
                        (info.estimatedTokens || 0) > 2000
                          ? "var(--accent-red-dim)"
                          : "var(--bg-elevated)",
                      color:
                        (info.estimatedTokens || 0) > 2000
                          ? "var(--accent-red)"
                          : "var(--text-secondary)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    ~{info.estimatedTokens?.toLocaleString()} tokens
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    Not found
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---- Not Connected: Setup Flow ----
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-xl">
        {/* Hero */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{
              background: "linear-gradient(135deg, var(--accent-amber), #e67e22)",
              boxShadow: "var(--shadow-glow-amber)",
            }}
          >
            <span
              className="text-3xl font-black"
              style={{ color: "var(--bg-deep)", fontFamily: "var(--font-display)" }}
            >
              C
            </span>
          </div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            ClawDoc
          </h1>
          <p className="text-base" style={{ color: "var(--text-secondary)" }}>
            The visual control panel for OpenClaw.
            <br />
            <span style={{ color: "var(--accent-amber)" }}>
              Drag, drop, done.
            </span>
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-5 stagger-children">
          {/* Step 1 */}
          <div
            className="rounded-xl p-5"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: "var(--accent-amber-dim)",
                  color: "var(--accent-amber)",
                  fontFamily: "var(--font-display)",
                }}
              >
                1
              </div>
              <h2 className="font-semibold text-sm">
                Install Companion Agent on your server
              </h2>
            </div>
            <div
              className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{
                background: "var(--bg-deep)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Terminal size={14} style={{ color: "var(--text-tertiary)" }} className="shrink-0" />
                <code
                  className="text-xs truncate"
                  style={{ fontFamily: "var(--font-display)", color: "var(--accent-green)" }}
                >
                  {installCommand}
                </code>
              </div>
              <CopyButton text={installCommand} />
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--text-tertiary)" }}>
              Run this on the same machine where OpenClaw is installed.
            </p>
          </div>

          {/* Step 2 */}
          <div
            className="rounded-xl p-5"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: "var(--accent-amber-dim)",
                  color: "var(--accent-amber)",
                  fontFamily: "var(--font-display)",
                }}
              >
                2
              </div>
              <h2 className="font-semibold text-sm">Connect to your Companion Agent</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  className="text-xs mb-1.5 block"
                  style={{ color: "var(--text-secondary)", fontFamily: "var(--font-display)" }}
                >
                  Server URL
                </label>
                <input
                  type="text"
                  placeholder="http://your-server:17017"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: "var(--bg-deep)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-display)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-active)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}
                />
              </div>

              <div>
                <label
                  className="text-xs mb-1.5 block"
                  style={{ color: "var(--text-secondary)", fontFamily: "var(--font-display)" }}
                >
                  Auth Token
                </label>
                <input
                  type="password"
                  placeholder="Paste the token shown by the agent"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
                  style={{
                    background: "var(--bg-deep)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-display)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--border-active)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-default)")}
                />
              </div>

              {connectionError && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                  style={{ background: "var(--accent-red-dim)", color: "var(--accent-red)" }}
                >
                  <AlertCircle size={14} />
                  {connectionError}
                </div>
              )}

              <button
                onClick={handleConnect}
                disabled={isConnecting || !urlInput || !tokenInput}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background:
                    isConnecting || !urlInput || !tokenInput
                      ? "var(--bg-elevated)"
                      : "linear-gradient(135deg, var(--accent-amber), #e67e22)",
                  color:
                    isConnecting || !urlInput || !tokenInput
                      ? "var(--text-tertiary)"
                      : "var(--bg-deep)",
                  boxShadow:
                    !isConnecting && urlInput && tokenInput
                      ? "var(--shadow-glow-amber)"
                      : "none",
                  cursor:
                    isConnecting || !urlInput || !tokenInput ? "not-allowed" : "pointer",
                }}
              >
                {isConnecting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wifi size={16} />
                    Connect
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Security note */}
          <div
            className="flex items-start gap-3 px-4 py-3 rounded-lg"
            style={{
              background: "var(--accent-blue-dim)",
              border: "1px solid rgba(91, 156, 245, 0.1)",
            }}
          >
            <Shield size={16} style={{ color: "var(--accent-blue)" }} className="shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed" style={{ color: "var(--accent-blue)" }}>
              Your data never leaves your network. ClawDoc communicates directly
              between your browser and the Companion Agent on your server.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
