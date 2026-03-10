"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  if (isLanding) {
    return <main className="min-h-screen w-full">{children}</main>;
  }

  return (
    <>
      <Sidebar />
      <main
        className="min-h-screen transition-all duration-300 w-full"
        style={{ marginLeft: "240px", maxWidth: "calc(100vw - 240px)" }}
      >
        {children}
      </main>
    </>
  );
}
