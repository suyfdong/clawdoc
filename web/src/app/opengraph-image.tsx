import { ImageResponse } from "next/og";

export const alt = "ClawDoc — Visual Control Panel for OpenClaw";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c0e14",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "linear-gradient(135deg, #f59e42, #e67e22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 36, fontWeight: 800, color: "#0c0e14" }}>
              C
            </span>
          </div>
          <span style={{ fontSize: 48, fontWeight: 700, color: "#ffffff" }}>
            ClawDoc
          </span>
        </div>

        <div
          style={{
            fontSize: 28,
            color: "#a0a6b8",
            textAlign: "center",
            maxWidth: 700,
            lineHeight: 1.4,
            display: "flex",
          }}
        >
          The visual control panel for OpenClaw
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 32,
          }}
        >
          <div
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              border: "1px solid rgba(245,158,66,0.3)",
              color: "#f59e42",
              fontSize: 16,
              display: "flex",
            }}
          >
            Drag & Drop Config
          </div>
          <div
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              border: "1px solid rgba(245,158,66,0.3)",
              color: "#f59e42",
              fontSize: 16,
              display: "flex",
            }}
          >
            Cost Optimizer
          </div>
          <div
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              border: "1px solid rgba(245,158,66,0.3)",
              color: "#f59e42",
              fontSize: 16,
              display: "flex",
            }}
          >
            One-Click Diagnosis
          </div>
        </div>

        <div
          style={{
            marginTop: 32,
            fontSize: 16,
            color: "#4a5068",
            display: "flex",
          }}
        >
          clawdoc.cc
        </div>
      </div>
    ),
    { ...size }
  );
}
