import type { Metadata } from "next";
import "./globals.css";   // adjust path if needed

export const metadata: Metadata = {
  title: "MCPay — The Monetization Layer for MCP Tools",
  description:
    "The first native monetization layer for Model Context Protocol servers. No API keys, no subscriptions — just an OWS Wallet and an HTTP request.",
  keywords: ["MCPay", "MCP", "x402", "OWS", "micropayments", "AI agents", "XMTP", "Zerion"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts — loaded here so both pages get them */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
