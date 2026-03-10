import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OpenClaw Cost Calculator & Optimizer — ClawDoc",
  description:
    "Calculate and optimize your OpenClaw API costs. What-if simulator for model switching, heartbeat cost analysis, and bootstrap token budget calculator.",
  keywords: [
    "openclaw cost",
    "openclaw reduce cost",
    "openclaw api cost calculator",
    "openclaw expensive",
    "openclaw save money",
    "openclaw cost optimization",
  ],
  openGraph: {
    title: "OpenClaw Cost Calculator & Optimizer — ClawDoc",
    description:
      "See exactly how much your OpenClaw costs. Simulate model switches and find savings.",
  },
};

export default function OptimizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
