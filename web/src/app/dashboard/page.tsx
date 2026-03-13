"use client";

import { useAppStore } from "@/lib/store";
import { useEffect, useState } from "react";
import {
  Cpu,
  Users,
  FileText,
  Clock,
  FilePlus,
  FileEdit,
  FileX,
  WifiOff,
} from "lucide-react";

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

function relativeTime(ts: number): string {
  if (!ts) return "Never";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return "Just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function eventIcon(event: string) {
  if (event === "add") return FilePlus;
  if (event === "unlink") return FileX;
  return FileEdit;
}

function shortenPath(path: string): string {
  const parts = path.split("/");
  if (parts.length <= 3) return path;
  return ".../" + parts.slice(-2).join("/");
}

type BeaconState = "active" | "idle" | "offline";

function getBeaconState(
  isConnected: boolean,
  agentPulse: number,
  processRunning: boolean | undefined
): BeaconState {
  if (!isConnected || processRunning === false) return "offline";
  if (agentPulse && Date.now() - agentPulse < 30000) return "active";
  if (processRunning) return "idle";
  return "offline";
}

export default function DashboardPage() {
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const serverInfo = useAppStore((s) => s.serverInfo);
  const serverStatus = useAppStore((s) => s.serverStatus);
  const agentPulse = useAppStore((s) => s.agentPulse);
  const recentEvents = useAppStore((s) => s.recentEvents);
  const fetchStatus = useAppStore((s) => s.fetchStatus);
  const [, setTick] = useState(0);

  const isConnected = connectionStatus === "connected";

  useEffect(() => {
    if (!isConnected) return;
    const id = setInterval(() => {
      fetchStatus();
      setTick((t) => t + 1);
    }, 15000);
    return () => clearInterval(id);
  }, [isConnected, fetchStatus]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const beacon = getBeaconState(
    isConnected,
    agentPulse,
    serverStatus?.openclawProcess.running
  );

  const beaconStyles: Record<BeaconState, { bg: string; animation: string; label: string }> = {
    active: {
      bg: "var(--accent-green)",
      animation: "beacon-active 2s ease-in-out infinite",
      label: "Active",
    },
    idle: {
      bg: "var(--accent-amber)",
      animation: "beacon-idle 3s ease-in-out infinite",
      label: "Idle",
    },
    offline: {
      bg: "var(--accent-red)",
      animation: "beacon-offline 2s ease-in-out infinite",
      label: "Offline",
    },
  };

  const bs = beaconStyles[beacon];

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8 animate-fade-in-up">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {isConnected ? "Real-time monitoring" : "Not connected to an instance"}
          </p>
        </div>
      </div>

      {/* Status Beacon */}
      <div className="flex justify-center mb-8 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center"
          style={{
            background: `${bs.bg}20`,
            border: `2px solid ${bs.bg}`,
            animation: bs.animation,
          }}
        >
          <div className="text-center">
            <div className="text-3xl mb-1">{beacon === "offline" ? "" : ""}</div>
            <span
              className="text-xs font-semibold"
              style={{ color: bs.bg, fontFamily: "var(--font-display)" }}
            >
              {bs.label}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-8 stagger-children">
        <StatCard
          icon={Cpu}
          label="Process Memory"
          value={serverStatus?.openclawProcess.memoryMB ? `${serverStatus.openclawProcess.memoryMB} MB` : "--"}
          accent="var(--accent-blue)"
        />
        <StatCard
          icon={Users}
          label="Active Sessions"
          value={serverStatus ? String(serverStatus.activeSessions) : "--"}
          accent="var(--accent-green)"
        />
        <StatCard
          icon={FileText}
          label="File Changes"
          value={serverStatus ? String(serverStatus.recentFileChanges) : String(recentEvents.length)}
          accent="var(--accent-purple)"
        />
        <StatCard
          icon={Clock}
          label="Agent Uptime"
          value={serverStatus?.agentUptime || "--"}
          accent="var(--accent-amber)"
        />
      </div>

      {/* Agent Cards */}
      {serverInfo && serverInfo.agents.length > 0 && (
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <h2
            className="text-xs font-semibold mb-3 tracking-widest"
            style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}
          >
            AGENTS
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {serverInfo.agents.map((agent) => {
              const agentActive = agent.hasSession && beacon !== "offline";
              return (
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
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: agentActive
                          ? "var(--accent-green)"
                          : agent.hasSession
                            ? "var(--accent-amber)"
                            : "var(--accent-red)",
                      }}
                    />
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: agentActive ? "var(--accent-green-dim)" : "var(--bg-elevated)",
                        color: agentActive ? "var(--accent-green)" : "var(--text-tertiary)",
                      }}
                    >
                      {agentActive ? "Active" : "Idle"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
        <h2
          className="text-xs font-semibold mb-3 tracking-widest"
          style={{ fontFamily: "var(--font-display)", color: "var(--text-tertiary)" }}
        >
          ACTIVITY FEED
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            maxHeight: "360px",
            overflowY: "auto",
          }}
        >
          {recentEvents.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 gap-2"
              style={{ color: "var(--text-tertiary)" }}
            >
              <WifiOff size={24} />
              <p className="text-sm">Waiting for activity...</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
              {recentEvents.map((ev, i) => {
                const EvIcon = eventIcon(ev.event);
                const iconColor =
                  ev.event === "add"
                    ? "var(--accent-green)"
                    : ev.event === "unlink"
                      ? "var(--accent-red)"
                      : "var(--accent-blue)";
                return (
                  <div key={`${ev.timestamp}-${i}`} className="flex items-center gap-3 px-4 py-2.5">
                    <EvIcon size={14} style={{ color: iconColor }} className="shrink-0" />
                    <span
                      className="text-xs flex-1 truncate"
                      style={{ fontFamily: "var(--font-display)", color: "var(--text-secondary)" }}
                    >
                      {shortenPath(ev.path)}
                    </span>
                    <span className="text-[10px] shrink-0" style={{ color: "var(--text-tertiary)" }}>
                      {relativeTime(ev.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
