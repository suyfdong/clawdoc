"use client";

import Link from "next/link";
import {
  ArrowRight,
  LayoutDashboard,
  GitFork,
  Wand2,
  Stethoscope,
  BookTemplate,
  DollarSign,
  Terminal,
  Shield,
  Zap,
  Brain,
  AlertTriangle,
  CheckCircle2,
  Github,
  ExternalLink,
  HelpCircle,
  ChevronDown,
} from "lucide-react";

// ─── Pain Points ─────────────────────────────────────────────────

const PAIN_POINTS = [
  {
    quote: "My OpenClaw experience has been endless debugging, frustration, and struggle.",
    source: "Reddit user",
  },
  {
    quote: "Memory is the most confusing aspect of OpenClaw because there are multiple layers, each behaving differently.",
    source: "Discord community",
  },
  {
    quote: "I spent $3,600 last month because I didn't realize my heartbeat was using Opus.",
    source: "GitHub Issues",
  },
];

// ─── Features ────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Visual Config Canvas",
    desc: "Drag models onto your agent config. Connect with lines. No JSON editing.",
    accent: "var(--accent-amber)",
    href: "/canvas",
  },
  {
    icon: GitFork,
    title: "Architecture Explainer",
    desc: "Interactive diagram of how OpenClaw actually works — memory layers, bootstrap flow, token costs.",
    accent: "var(--accent-blue)",
    href: "/architecture",
  },
  {
    icon: Wand2,
    title: "Model Selection Wizard",
    desc: "Answer 5 questions, get a personalized model recommendation with cost estimate.",
    accent: "var(--accent-purple)",
    href: "/wizard",
  },
  {
    icon: Stethoscope,
    title: "Config Diagnosis",
    desc: "Auto-scan your config for expensive mistakes, missing fallbacks, and security issues.",
    accent: "var(--accent-red)",
    href: "/diagnose",
  },
  {
    icon: BookTemplate,
    title: "Best Practice Templates",
    desc: "16 pre-built configs for common use cases. Budget starter to multi-agent team.",
    accent: "var(--accent-green)",
    href: "/templates",
  },
  {
    icon: DollarSign,
    title: "Cost Optimizer",
    desc: "See exactly how much you spend. What-if simulator for switching models.",
    accent: "var(--accent-amber)",
    href: "/optimizer",
  },
];

// ─── How It Works ────────────────────────────────────────────────

const STEPS = [
  {
    num: "1",
    title: "Install the Companion Agent",
    desc: "One command on your OpenClaw server. Takes 30 seconds.",
    code: "curl -fsSL https://clawdoc.cc/install.sh | sh",
  },
  {
    num: "2",
    title: "Connect from your browser",
    desc: "Paste the auth token into ClawDoc. Your data never leaves your network.",
  },
  {
    num: "3",
    title: "Drag, drop, done",
    desc: "Visually configure models, diagnose issues, optimize costs — all in one place.",
  },
];

// ─── Page ────────────────────────────────────────────────────────

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I configure OpenClaw models?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "With ClawDoc, you drag models from the sidebar onto your agent config canvas. Choose a primary model, fallback, and heartbeat model visually — then click Apply. No JSON editing needed.",
      },
    },
    {
      "@type": "Question",
      name: "Why is my OpenClaw so expensive?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Common causes: using an expensive model for heartbeat checks, oversized bootstrap files that add tokens to every message, or missing prompt caching. ClawDoc's Cost Optimizer can identify exactly where your money goes.",
      },
    },
    {
      "@type": "Question",
      name: "How do OpenClaw memory layers work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "OpenClaw has multiple memory layers: SOUL.md (persistent personality), USER.md (user preferences), MEMORY.md (accumulated knowledge), and session context. Each gets injected into every message, consuming tokens.",
      },
    },
    {
      "@type": "Question",
      name: "What is the best model for OpenClaw in 2026?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Claude Sonnet 4.6 offers the best quality-to-cost ratio for most users. Haiku 3.5 is great for budget setups. Use ClawDoc's Model Wizard for a personalized recommendation.",
      },
    },
    {
      "@type": "Question",
      name: "How to fix OpenClaw slow response?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Slow responses usually come from oversized context, wrong model selection, missing fallback configuration, or network issues. ClawDoc's Diagnosis tool checks all of these automatically.",
      },
    },
  ],
};

export default function LandingPage() {
  return (
    <div className="w-full">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* ─── Nav ─────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
        style={{
          background: "rgba(12, 14, 20, 0.8)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, var(--accent-amber), #e67e22)",
            }}
          >
            <span
              className="text-sm font-bold"
              style={{ color: "var(--bg-deep)", fontFamily: "var(--font-display)" }}
            >
              C
            </span>
          </div>
          <span className="font-bold text-sm" style={{ fontFamily: "var(--font-display)" }}>
            ClawDoc
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/suyfdong/clawdoc"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
          >
            <Github size={16} />
            GitHub
          </a>
          <Link
            href="/connect"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, var(--accent-amber), #e67e22)",
              color: "var(--bg-deep)",
            }}
          >
            Get Started
            <ArrowRight size={12} />
          </Link>
        </div>
      </nav>

      {/* ─── Hero ─────────────────────────────────── */}
      <section className="pt-32 pb-20 px-6 text-center relative overflow-hidden">
        {/* Subtle radial glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(245,158,66,0.08) 0%, transparent 70%)",
          }}
        />

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6 text-xs" style={{
            background: "var(--accent-amber-dim)",
            color: "var(--accent-amber)",
            fontFamily: "var(--font-display)",
          }}>
            <Zap size={12} />
            Free &amp; open source
          </div>

          <h1
            className="text-5xl font-bold leading-tight mb-5"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Stop guessing your
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, var(--accent-amber), #e67e22)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              OpenClaw config
            </span>
          </h1>

          <p
            className="text-lg leading-relaxed max-w-xl mx-auto mb-8"
            style={{ color: "var(--text-secondary)" }}
          >
            ClawDoc is the visual control panel for OpenClaw.
            Drag-and-drop model configuration, one-click diagnosis,
            cost optimization — no more editing JSON in the dark.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/connect"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, var(--accent-amber), #e67e22)",
                color: "var(--bg-deep)",
                boxShadow: "var(--shadow-glow-amber)",
              }}
            >
              Connect Your OpenClaw
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/canvas"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-default)",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-active)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              Try Demo
              <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Pain Points ──────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-3">
              <AlertTriangle size={16} style={{ color: "var(--accent-red)" }} />
              <span className="text-xs font-semibold tracking-widest" style={{ color: "var(--accent-red)", fontFamily: "var(--font-display)" }}>
                THE PROBLEM
              </span>
            </div>
            <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
              OpenClaw is powerful. Configuring it shouldn&apos;t be painful.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PAIN_POINTS.map((p, i) => (
              <div
                key={i}
                className="rounded-xl p-5"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <p className="text-sm leading-relaxed mb-3 italic" style={{ color: "var(--text-secondary)" }}>
                  &ldquo;{p.quote}&rdquo;
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-display)" }}>
                  — {p.source}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-3">
              <CheckCircle2 size={16} style={{ color: "var(--accent-green)" }} />
              <span className="text-xs font-semibold tracking-widest" style={{ color: "var(--accent-green)", fontFamily: "var(--font-display)" }}>
                THE SOLUTION
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Everything you need to master OpenClaw
            </h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Six tools that replace hours of JSON editing and GPT conversations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <Link
                  key={f.title}
                  href={f.href}
                  className="group rounded-xl p-5 transition-all"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${f.accent}44`;
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-subtle)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: `${f.accent}15`, color: f.accent }}
                  >
                    <Icon size={20} />
                  </div>
                  <h3 className="text-sm font-bold mb-1.5" style={{ fontFamily: "var(--font-display)" }}>
                    {f.title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {f.desc}
                  </p>
                  <div className="flex items-center gap-1 mt-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: f.accent }}>
                    Try it <ArrowRight size={10} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
              Up and running in 2 minutes
            </h2>
          </div>

          <div className="space-y-6">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="flex gap-5 items-start"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                  style={{
                    background: "var(--accent-amber-dim)",
                    color: "var(--accent-amber)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {step.num}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold mb-1" style={{ fontFamily: "var(--font-display)" }}>
                    {step.title}
                  </h3>
                  <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                    {step.desc}
                  </p>
                  {step.code && (
                    <div
                      className="flex items-center gap-2 rounded-lg px-4 py-2.5"
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <Terminal size={12} style={{ color: "var(--text-tertiary)" }} />
                      <code
                        className="text-xs"
                        style={{ fontFamily: "var(--font-display)", color: "var(--accent-green)" }}
                      >
                        {step.code}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ──────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-3">
              <HelpCircle size={16} style={{ color: "var(--accent-blue)" }} />
              <span className="text-xs font-semibold tracking-widest" style={{ color: "var(--accent-blue)", fontFamily: "var(--font-display)" }}>
                FAQ
              </span>
            </div>
            <h2 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
              Common questions about OpenClaw configuration
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "How do I configure OpenClaw models?",
                a: "With ClawDoc, you drag models from the sidebar onto your agent config canvas. Choose a primary model, fallback, and heartbeat model visually — then click Apply. No JSON editing needed. Without ClawDoc, you edit the openclaw.json file manually.",
              },
              {
                q: "Why is my OpenClaw so expensive?",
                a: "Common causes: using an expensive model (like Opus) for heartbeat checks, oversized bootstrap files (SOUL.md, MEMORY.md) that add tokens to every message, or missing prompt caching. ClawDoc's Cost Optimizer and Config Diagnosis can identify exactly where your money goes.",
              },
              {
                q: "How do OpenClaw memory layers work?",
                a: "OpenClaw has multiple memory layers: SOUL.md (persistent personality), USER.md (user preferences), MEMORY.md (accumulated knowledge), and session context. Each gets injected into every message, consuming tokens. ClawDoc's Architecture Guide visualizes all layers and shows their token cost impact.",
              },
              {
                q: "What's the best model for OpenClaw in 2026?",
                a: "It depends on your use case and budget. Claude Sonnet 4.6 offers the best quality-to-cost ratio for most users. Haiku 3.5 is great for budget setups and heartbeat. Use ClawDoc's Model Wizard to get a personalized recommendation based on your specific needs.",
              },
              {
                q: "How to fix OpenClaw slow response?",
                a: "Slow responses usually come from: oversized context (check your bootstrap files), wrong model selection, missing fallback configuration, or network issues between your server and the API. ClawDoc's Diagnosis tool checks all of these automatically.",
              },
            ].map((faq, i) => (
              <details
                key={i}
                className="group rounded-xl"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <summary
                  className="flex items-center justify-between px-5 py-4 cursor-pointer list-none text-sm font-medium"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {faq.q}
                  <ChevronDown
                    size={16}
                    className="shrink-0 ml-2 transition-transform group-open:rotate-180"
                    style={{ color: "var(--text-tertiary)" }}
                  />
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {faq.a}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────── */}
      <section className="py-20 px-6">
        <div
          className="max-w-3xl mx-auto text-center rounded-2xl p-10 relative overflow-hidden"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, rgba(245,158,66,0.06) 0%, transparent 70%)",
            }}
          />
          <div className="relative">
            <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Ready to take control?
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              Connect your OpenClaw in 2 minutes. Free forever for single instances.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/connect"
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg, var(--accent-amber), #e67e22)",
                  color: "var(--bg-deep)",
                  boxShadow: "var(--shadow-glow-amber)",
                }}
              >
                Get Started Free
                <ArrowRight size={16} />
              </Link>
              <a
                href="https://github.com/suyfdong/clawdoc"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-secondary)",
                }}
              >
                <Github size={16} />
                Star on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────── */}
      <footer
        className="py-8 px-6 text-center"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <div
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--accent-amber), #e67e22)" }}
          >
            <span className="text-[8px] font-bold" style={{ color: "var(--bg-deep)", fontFamily: "var(--font-display)" }}>C</span>
          </div>
          <span className="text-xs font-semibold" style={{ fontFamily: "var(--font-display)" }}>ClawDoc</span>
        </div>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Open source visual control panel for OpenClaw.
        </p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <a href="https://github.com/suyfdong/clawdoc" target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            GitHub
          </a>
          <span style={{ color: "var(--text-tertiary)" }}>·</span>
          <Link href="/connect" className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Connect
          </Link>
          <span style={{ color: "var(--text-tertiary)" }}>·</span>
          <Link href="/architecture" className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Architecture Guide
          </Link>
        </div>
      </footer>
    </div>
  );
}
