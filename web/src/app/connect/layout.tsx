import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connect Your OpenClaw — ClawDoc",
  description:
    "Connect ClawDoc to your OpenClaw server in 2 minutes. Install the lightweight companion agent and manage your configuration from the browser.",
  keywords: [
    "openclaw setup",
    "openclaw companion agent",
    "openclaw connect",
    "openclaw remote management",
    "openclaw web dashboard",
  ],
  openGraph: {
    title: "Connect Your OpenClaw — ClawDoc",
    description:
      "Install the companion agent on your server and manage OpenClaw from your browser.",
  },
};

export default function ConnectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
