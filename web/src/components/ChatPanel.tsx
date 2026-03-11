"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore, ChatMessage } from "@/lib/store";
import {
  MessageSquare,
  Send,
  Loader2,
  X,
  Check,
  Trash2,
  ChevronRight,
} from "lucide-react";
import DiffPreview from "./DiffPreview";

export default function ChatPanel() {
  const {
    chatMessages,
    chatLoading,
    proposedChanges,
    sendChatMessage,
    applyProposedChanges,
    clearChat,
    clearProposedChanges,
    brainStatus,
  } = useAppStore();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [applyingChanges, setApplyingChanges] = useState(false);
  const [applyResult, setApplyResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, proposedChanges]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || chatLoading) return;
    setInput("");
    sendChatMessage(msg);
  };

  const handleApply = async () => {
    setApplyingChanges(true);
    setApplyResult(null);
    try {
      const result = await applyProposedChanges();
      setApplyResult(result);
      setTimeout(() => setApplyResult(null), 4000);
    } finally {
      setApplyingChanges(false);
    }
  };

  const brainConfigured = brainStatus?.configured ?? false;

  // Collapsed state — thin sidebar with toggle button
  if (!isOpen) {
    return (
      <div
        className="shrink-0 flex flex-col items-center py-4"
        style={{
          borderLeft: "1px solid var(--border-subtle)",
          background: "var(--bg-panel)",
          width: 44,
        }}
      >
        <button
          onClick={() => setIsOpen(true)}
          className="flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all"
          style={{ color: "var(--text-secondary)" }}
          title="Open AI Chat"
        >
          <MessageSquare size={16} style={{ color: "var(--accent-amber)" }} />
          <span className="text-[9px] font-medium" style={{ fontFamily: "var(--font-display)" }}>Chat</span>
          {chatMessages.length > 0 && (
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
              style={{
                background: "var(--accent-amber)",
                color: "var(--bg-deep)",
              }}
            >
              {chatMessages.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-80 shrink-0 flex flex-col h-full"
      style={{
        borderLeft: "1px solid var(--border-subtle)",
        background: "var(--bg-panel)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2">
          <MessageSquare
            size={14}
            style={{ color: "var(--accent-amber)" }}
          />
          <span
            className="text-sm font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            AI Assistant
          </span>
          {brainStatus?.model && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{
                background: "var(--accent-amber-dim)",
                color: "var(--accent-amber)",
              }}
            >
              {brainStatus.model.split("/").pop()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {chatMessages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-1 rounded transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              title="Clear chat"
            >
              <Trash2 size={12} />
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!brainConfigured && (
          <div
            className="rounded-lg p-3 text-xs"
            style={{
              background: "var(--accent-amber-dim)",
              color: "var(--accent-amber)",
            }}
          >
            <p className="font-semibold mb-1">Brain not configured</p>
            <p style={{ color: "var(--text-secondary)" }}>
              SSH into your server and create{" "}
              <code
                className="px-1 py-0.5 rounded text-[10px]"
                style={{ background: "var(--bg-deep)" }}
              >
                ~/.clawdoc/brain.json
              </code>{" "}
              with your OpenRouter API key.
            </p>
          </div>
        )}

        {chatMessages.length === 0 && brainConfigured && (
          <div
            className="text-center py-8 text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            <MessageSquare
              size={24}
              className="mx-auto mb-2 opacity-30"
            />
            <p>Ask me anything about your OpenClaw config.</p>
            <p className="mt-1 opacity-60">
              e.g., &quot;Change my primary model to DeepSeek V3&quot;
            </p>
          </div>
        )}

        {chatMessages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}

        {chatLoading && (
          <div
            className="flex items-center gap-2 px-3 py-2 text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            <Loader2 size={12} className="animate-spin" />
            Thinking...
          </div>
        )}

        {/* Proposed changes */}
        {proposedChanges && proposedChanges.length > 0 && (
          <div className="space-y-2">
            <p
              className="text-[10px] font-semibold tracking-wider px-1"
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--accent-amber)",
              }}
            >
              PROPOSED CHANGES
            </p>
            {proposedChanges.map((change, i) => (
              <DiffPreview key={i} change={change} />
            ))}
            <div className="flex gap-2">
              <button
                onClick={handleApply}
                disabled={applyingChanges}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: applyingChanges
                    ? "var(--bg-elevated)"
                    : "linear-gradient(135deg, var(--accent-amber), #e67e22)",
                  color: applyingChanges
                    ? "var(--text-tertiary)"
                    : "var(--bg-deep)",
                  boxShadow: applyingChanges
                    ? "none"
                    : "var(--shadow-glow-amber)",
                }}
              >
                {applyingChanges ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Check size={12} />
                    Apply All
                  </>
                )}
              </button>
              <button
                onClick={clearProposedChanges}
                className="px-3 py-2 rounded-lg text-xs transition-colors"
                style={{
                  background: "var(--bg-elevated)",
                  color: "var(--text-secondary)",
                }}
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Apply result */}
        {applyResult && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{
              background: applyResult.ok
                ? "var(--accent-green-dim)"
                : "var(--accent-red-dim)",
              color: applyResult.ok
                ? "var(--accent-green)"
                : "var(--accent-red)",
            }}
          >
            {applyResult.ok ? <Check size={12} /> : <X size={12} />}
            {applyResult.message}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        className="shrink-0 p-3"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{
            background: "var(--bg-deep)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={
              brainConfigured
                ? "Ask or describe a change..."
                : "Configure brain first"
            }
            disabled={!brainConfigured || chatLoading}
            className="flex-1 bg-transparent text-xs outline-none"
            style={{ color: "var(--text-primary)" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || chatLoading || !brainConfigured}
            className="p-1 rounded transition-colors"
            style={{
              color:
                input.trim() && brainConfigured
                  ? "var(--accent-amber)"
                  : "var(--text-tertiary)",
            }}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed"
        style={{
          background: isUser ? "var(--accent-amber-dim)" : "var(--bg-card)",
          color: isUser ? "var(--accent-amber)" : "var(--text-secondary)",
          border: `1px solid ${isUser ? "transparent" : "var(--border-subtle)"}`,
        }}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
