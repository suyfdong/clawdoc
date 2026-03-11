"use client";

import { ProposedChange } from "@/lib/store";
import { FileText } from "lucide-react";

export default function DiffPreview({ change }: { change: ProposedChange }) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <FileText size={10} style={{ color: "var(--accent-amber)" }} />
        <span
          className="text-[11px] font-medium"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {change.file}
        </span>
      </div>

      {/* Description */}
      <p
        className="px-3 py-1.5 text-[10px]"
        style={{ color: "var(--text-tertiary)" }}
      >
        {change.description}
      </p>

      {/* Content preview (simplified — show first ~20 lines) */}
      <div
        className="px-3 pb-2 overflow-x-auto"
        style={{ maxHeight: 200 }}
      >
        <pre
          className="text-[10px] leading-relaxed whitespace-pre-wrap"
          style={{
            color: "var(--text-secondary)",
            fontFamily: "var(--font-display)",
          }}
        >
          {(() => {
            const lines = change.content.split("\n");
            return (
              <>
                {lines.slice(0, 20).join("\n")}
                {lines.length > 20 && (
                  <span style={{ color: "var(--text-tertiary)" }}>
                    {"\n"}... ({lines.length - 20} more lines)
                  </span>
                )}
              </>
            );
          })()}
        </pre>
      </div>
    </div>
  );
}
