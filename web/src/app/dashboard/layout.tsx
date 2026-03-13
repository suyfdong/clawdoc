import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | ClawDoc",
  description: "Real-time monitoring dashboard for your OpenClaw instance",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
