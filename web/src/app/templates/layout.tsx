import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OpenClaw Config Templates — ClawDoc",
  description:
    "16 ready-to-use OpenClaw configuration templates. From budget starter ($5/mo) to multi-agent team setups. One-click deploy to your server.",
  keywords: [
    "openclaw config template",
    "openclaw best practices",
    "openclaw starter config",
    "openclaw example configuration",
    "openclaw setup template",
    "openclaw budget config",
  ],
  openGraph: {
    title: "OpenClaw Config Templates — ClawDoc",
    description:
      "16 pre-built OpenClaw configurations for every use case and budget. One-click deploy.",
  },
};

export default function TemplatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
