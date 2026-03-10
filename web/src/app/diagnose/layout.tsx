import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OpenClaw Config Diagnosis — ClawDoc",
  description:
    "Auto-scan your OpenClaw configuration for expensive mistakes, missing fallbacks, security issues, and performance problems. Get a health score with one-click fixes.",
  keywords: [
    "openclaw troubleshooting",
    "openclaw config fix",
    "openclaw debug",
    "openclaw slow response fix",
    "openclaw expensive fix",
    "openclaw configuration check",
  ],
  openGraph: {
    title: "OpenClaw Config Diagnosis — ClawDoc",
    description:
      "Auto-diagnose your OpenClaw config. Find expensive mistakes and fix them with one click.",
  },
};

export default function DiagnoseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
