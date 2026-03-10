import type { Metadata } from "next";
import { JetBrains_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ClawDoc — Visual Control Panel for OpenClaw",
  description:
    "Finally understand your OpenClaw and configure it right. Drag, drop, done.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} ${dmSans.variable}`}>
      <body className="antialiased">
        <Sidebar />
        <main
          className="min-h-screen transition-all duration-300 w-full"
          style={{ marginLeft: "240px", maxWidth: "calc(100vw - 240px)" }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
