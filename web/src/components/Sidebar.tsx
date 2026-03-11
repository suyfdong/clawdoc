"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";
import {
  Plug,
  LayoutDashboard,
  GitFork,
  Wand2,
  Stethoscope,
  BookTemplate,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/connect", label: "Connect", icon: Plug, requiresConnection: false },
  {
    href: "/canvas",
    label: "Visual Config",
    icon: LayoutDashboard,
    requiresConnection: false,
  },
  {
    href: "/architecture",
    label: "Architecture",
    icon: GitFork,
    requiresConnection: false,
  },
  {
    href: "/wizard",
    label: "Model Wizard",
    icon: Wand2,
    requiresConnection: false,
  },
  {
    href: "/diagnose",
    label: "Diagnosis",
    icon: Stethoscope,
    requiresConnection: true,
  },
  {
    href: "/templates",
    label: "Templates",
    icon: BookTemplate,
    requiresConnection: false,
  },
  {
    href: "/optimizer",
    label: "Cost Optimizer",
    icon: DollarSign,
    requiresConnection: true,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const serverInfo = useAppStore((s) => s.serverInfo);
  const [collapsed, setCollapsed] = useState(false);

  const isConnected = connectionStatus === "connected";

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-40 flex flex-col transition-all duration-300 ease-out ${
        collapsed ? "w-[68px]" : "w-[240px]"
      }`}
      style={{
        background: "var(--bg-panel)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      {/* Logo area — links back to landing page */}
      <Link href="/" className="flex items-center gap-3 px-4 h-16 shrink-0 transition-opacity hover:opacity-80">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background:
              "linear-gradient(135deg, var(--accent-amber), #e67e22)",
            boxShadow: "var(--shadow-glow-amber)",
          }}
        >
          <span className="text-lg font-bold" style={{ color: "var(--bg-deep)", fontFamily: "var(--font-display)" }}>C</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1
              className="text-sm font-bold tracking-wide"
              style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
            >
              ClawDoc
            </h1>
            <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              v0.1.0
            </p>
          </div>
        )}
      </Link>

      {/* Connection status */}
      {!collapsed && (
        <div className="mx-3 mb-3 px-3 py-2 rounded-lg" style={{ background: "var(--bg-card)" }}>
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                background: isConnected
                  ? "var(--accent-green)"
                  : "var(--text-tertiary)",
                boxShadow: isConnected
                  ? "0 0 8px var(--accent-green)"
                  : "none",
                animation: isConnected ? "pulse-glow 2s ease-in-out infinite" : "none",
              }}
            />
            <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
              {isConnected
                ? `v${serverInfo?.version || "?"}`
                : "Not connected"}
            </span>
          </div>
          {isConnected && serverInfo && (
            <p
              className="text-[10px] mt-1 truncate"
              style={{ color: "var(--text-tertiary)" }}
            >
              {serverInfo.agents.length} agent
              {serverInfo.agents.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const isDisabled = item.requiresConnection && !isConnected;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={isDisabled ? "#" : item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                isDisabled ? "pointer-events-none" : ""
              }`}
              style={{
                background: isActive
                  ? "var(--accent-amber-dim)"
                  : "transparent",
                color: isActive
                  ? "var(--accent-amber)"
                  : isDisabled
                    ? "var(--text-tertiary)"
                    : "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                if (!isActive && !isDisabled)
                  e.currentTarget.style.background = "var(--bg-card)";
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  e.currentTarget.style.background = "transparent";
              }}
            >
              {isActive && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{ background: "var(--accent-amber)" }}
                />
              )}
              <Icon size={18} className="shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              {isDisabled && !collapsed && (
                <span
                  className="ml-auto text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    background: "var(--bg-elevated)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  Connect
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mx-2 mb-3 p-2.5 rounded-lg flex items-center justify-center transition-colors"
        style={{ color: "var(--text-tertiary)" }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.background = "var(--bg-card)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = "transparent")
        }
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
