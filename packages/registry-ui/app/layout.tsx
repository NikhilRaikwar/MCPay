import type { Metadata } from "next";
import "./globals.css";   // adjust path if needed

export const metadata: Metadata = {
  title: "MCPay — The Native Monetization Layer for MCP Tools",
  description:
    "Wrap any MCP tool server in 3 lines with x402 payment enforcement. Machine-to-machine payments on Base Sepolia USDC via OWS CLI.",
  keywords: ["MCPay", "MCP", "x402", "OWS", "micropayments", "AI agents", "XMTP", "Zerion", "Base Sepolia"],
  openGraph: {
    title: "MCPay — Monetize Any MCP Tool",
    description: "The first native monetization layer for AI Agents. Pay-per-inference on machine-to-machine rails.",
    images: ["/banner.png"],
    type: "website",
    url: "https://mcpay.dev"
  },
  twitter: {
    card: "summary_large_image",
    title: "MCPay — Monetize Any MCP Tool",
    description: "Machine-to-machine payments on Base Sepolia USDC via OWS CLI. No API keys, no subscriptions.",
    images: ["/banner.png"]
  },
  icons: {
    icon: "/favicon.png",
  }
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
