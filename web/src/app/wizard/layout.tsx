import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OpenClaw Model Selection Guide — ClawDoc",
  description:
    "Find the best AI model for your OpenClaw setup. Answer 5 questions and get a personalized recommendation with cost estimates. Supports Claude, GPT, Gemini, DeepSeek, and local models.",
  keywords: [
    "openclaw model selection",
    "best model for openclaw",
    "openclaw model recommendation",
    "openclaw claude vs gpt",
    "openclaw which model to use",
    "openclaw model comparison",
  ],
  openGraph: {
    title: "OpenClaw Model Selection Guide — ClawDoc",
    description:
      "Find the perfect AI model for your OpenClaw agents. Personalized recommendations with cost estimates.",
  },
};

export default function WizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
