import type { Metadata } from "next";
import { JetBrains_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";

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
    "Stop editing JSON configs blindly. ClawDoc gives you a drag-and-drop visual interface to configure OpenClaw models, diagnose issues, and optimize costs. Free and open source.",
  keywords: [
    "openclaw",
    "openclaw configuration",
    "openclaw config editor",
    "openclaw visual config",
    "openclaw setup guide",
    "openclaw model selection",
    "openclaw model routing",
    "openclaw cost optimization",
    "openclaw reduce api cost",
    "openclaw memory layers",
    "openclaw memory configuration",
    "openclaw failover configuration",
    "openclaw troubleshooting",
    "openclaw gateway fix",
    "openclaw cost calculator",
    "openclaw best model 2026",
    "ai agent configuration",
    "llm agent setup",
  ],
  openGraph: {
    title: "ClawDoc — Visual Control Panel for OpenClaw",
    description:
      "Drag-and-drop visual configuration for OpenClaw. Pick models, diagnose config issues, optimize costs — no more JSON guessing.",
    url: "https://clawdoc.cc",
    siteName: "ClawDoc",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClawDoc — Visual Control Panel for OpenClaw",
    description:
      "Drag-and-drop visual configuration for OpenClaw. Pick models, diagnose config issues, optimize costs.",
  },
  metadataBase: new URL("https://clawdoc.cc"),
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ClawDoc",
  description:
    "Visual control panel for OpenClaw. Drag-and-drop model configuration, one-click diagnosis, and cost optimization.",
  url: "https://clawdoc.cc",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Organization",
    name: "ClawDoc",
    url: "https://clawdoc.cc",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} ${dmSans.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
