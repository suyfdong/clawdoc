import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Visual Config Editor — ClawDoc",
  description:
    "Drag-and-drop visual configuration editor for OpenClaw. Switch models, edit memory files, and manage agent configs without touching JSON.",
  keywords: [
    "openclaw config editor",
    "openclaw visual configuration",
    "openclaw drag and drop",
    "openclaw model switch",
    "openclaw agent configuration",
  ],
  openGraph: {
    title: "Visual Config Editor — ClawDoc",
    description:
      "Drag-and-drop visual configuration editor for OpenClaw. No more JSON editing.",
  },
};

export default function CanvasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
