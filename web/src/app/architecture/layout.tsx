import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OpenClaw Architecture Guide — ClawDoc",
  description:
    "Interactive guide to how OpenClaw works. Understand memory layers, bootstrap flow, gateway architecture, and token costs with visual diagrams.",
  keywords: [
    "how openclaw works",
    "openclaw architecture",
    "openclaw memory layers",
    "openclaw bootstrap files",
    "openclaw gateway explained",
    "openclaw token cost",
  ],
  openGraph: {
    title: "OpenClaw Architecture Guide — ClawDoc",
    description:
      "Interactive visual guide to OpenClaw architecture — memory layers, bootstrap flow, and token costs explained.",
  },
};

export default function ArchitectureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
