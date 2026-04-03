"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/* ─────────────────────────────────────────
   MCPay — Landing Page
   File: app/page.tsx
   ───────────────────────────────────────── */

const TICKER_ITEMS = [
  "x402 Protocol","OWS Policy Engine","Base Sepolia USDC","XMTP Notifications",
  "Zerion Portfolio","Dynamic Pricing","AIML API Models","Claude · GPT · Gemini",
  "No API Keys Ever","Agent-Native",
];

const FLOW_STEPS = [
  { n:"01", t:"Agent Calls Tool",   d:"Claude / GPT sends a standard POST to your MCPay-wrapped endpoint. Zero changes on the agent side. Any HTTP client works.",        tag:"HTTP POST"       },
  { n:"02", t:"402 Intercepted",    d:"MCPay middleware returns HTTP 402 Payment Required with x402 headers specifying the USDC amount and OWS wallet destination.",         tag:"x402 Standard"   },
  { n:"03", t:"OWS Signs & Pays",   d:"Agent's OWS CLI intercepts the 402, evaluates spend policy, signs and broadcasts a USDC transaction on Base Sepolia.",              tag:"OWS CLI"          },
  { n:"04", t:"Tool Executes",      d:"Payment verified by x402 facilitator. MCPay middleware allows the request through and the tool returns its result to the agent.",    tag:"Instant Payout"  },
  { n:"05", t:"Stats Updated",      d:"MCPay registry logs the call — earnings, call count, wallet address, timestamp. Zerion API shows real on-chain balance.",            tag:"Live Dashboard"  },
];

const INTEGRATIONS = [
  {
    icon:"⛓", name:"OWS + x402", badge:"Core", badgeColor:"var(--gd)", badgeText:"var(--green)",
    desc:"The backbone. OWS CLI handles wallet signing, policy enforcement, and USDC settlement on Base Sepolia. x402 is the payment protocol standard.",
    features:["Spend policies enforce per-session limits automatically","API key revocation if policy violated","Full audit log of every transaction"],
  },
  {
    icon:"💬", name:"XMTP", badge:"New", badgeColor:"var(--bd)", badgeText:"var(--blue)",
    desc:"Wallet-to-wallet push notifications on every payment. Tool owner gets an XMTP message the instant an agent pays. Agent gets a receipt. No email, no webhook config.",
    features:['Tool owner: "0x4a3b paid $0.01 for weather-data"','Agent receipt: "Payment confirmed, tx: 0x..."',"Built with XMTP JS SDK, 30-min integration"],
  },
  {
    icon:"◈", name:"Zerion API", badge:"New", badgeColor:"var(--pd)", badgeText:"var(--purple)",
    desc:"Real on-chain earnings instead of simulated counters. Zerion API fetches live USDC balance and DeFi positions for the tool wallet. Dashboard shows actual money earned.",
    features:["Live wallet balance — not a fake counter","Multi-chain portfolio tracking","Transaction history with decoded labels"],
  },
  {
    icon:"🧠", name:"AIML API", badge:"Dynamic Pricing", badgeColor:"var(--od)", badgeText:"var(--orange)",
    desc:"MCPay wraps AIML API inference behind x402. Price adjusts per model — Claude Opus costs more than Llama. First dynamic pricing inference API on OWS. Covers Track 04 too.",
    features:["Claude Opus: $0.05 · GPT-4o: $0.03 · Llama: $0.001","Surge pricing under queue pressure (1x–10x)","OWS policy lets buyer set max-price ceiling"],
  },
  {
    icon:"🌐", name:"Allium API", badge:"Oracle", badgeColor:"var(--gd)", badgeText:"var(--green)",
    desc:"Cross-chain data oracle tool — wraps Allium's multi-chain explorer behind x402. Agents pay $0.005 per query to fetch decoded on-chain data from 9 chains. Covers Track 07.",
    features:["Query Ethereum, Solana, Base, Polygon state","Decoded, enriched — not raw RPC","$0.005 per query, no rate limits"],
  },
  {
    icon:"💰", name:"MoonPay", badge:"On-ramp", badgeColor:"var(--bd)", badgeText:"var(--blue)",
    desc:"New agents need USDC to pay for tools. MCPay dashboard integrates MoonPay for one-click fiat → USDC on-ramp. Fund an OWS wallet in 2 minutes without leaving the registry.",
    features:["Fund wallet with card directly in dashboard","MoonPay CLI for agent auto top-up","Solves the cold-start problem for new agents"],
  },
];

const SDK_CARDS = [
  { name:"mcpay/express",  pkg:"npm install mcpay",                        desc:"Express middleware. One line wraps any route with x402 payment enforcement, stats tracking, and XMTP notifications.", status:"done", label:"Shipped ✓" },
  { name:"mcpay/fetch",    pkg:"import { mcpayFetch } from 'mcpay'",       desc:"Client-side x402 fetch wrapper for agents. Intercepts 402 responses, triggers OWS CLI payment, retries automatically.", status:"done", label:"Shipped ✓" },
  { name:"mcpay/fastify",  pkg:"import { mcpayFastify } from 'mcpay'",     desc:"Same middleware pattern for Fastify servers. Plugin-based. Same config API as Express version — zero learning curve.", status:"wip",  label:"In Progress" },
  { name:"mcpay CLI",      pkg:"npx mcpay wrap --port 3001 --price $0.01", desc:"Wrap any running HTTP server with x402 payments from the terminal. No code changes. Point it at a port and go.", status:"soon", label:"Coming Soon" },
  { name:"mcpay/react",    pkg:"import { MCPayDashboard } from 'mcpay/react'", desc:"Drop-in React component. Embed the registry dashboard in any Next.js or React app. Real-time stats, live feed.", status:"soon", label:"Coming Soon" },
  { name:"Registry API",   pkg:"GET /.well-known/mcp",                     desc:"Every MCPay server auto-exposes a manifest endpoint. Agents discover tools, prices, and chains programmatically.", status:"done", label:"Shipped ✓" },
];

const MODELS = [
  { model:"claude-opus-4-6",    provider:"Anthropic via AIML API", base:"$0.05", surge:"$0.50", surgeColor:"var(--orange)", tag:"Live", tagStyle:{background:"var(--gd)", color:"var(--green)"} },
  { model:"gpt-4o",             provider:"OpenAI via AIML API",    base:"$0.03", surge:"$0.30", surgeColor:"var(--orange)", tag:"Live", tagStyle:{background:"var(--gd)", color:"var(--green)"} },
  { model:"claude-sonnet-4-6",  provider:"Anthropic via AIML API", base:"$0.02", surge:"$0.20", surgeColor:"var(--orange)", tag:"Live", tagStyle:{background:"var(--gd)", color:"var(--green)"} },
  { model:"gemini-2.0-flash",   provider:"Google via AIML API",    base:"$0.005",surge:"$0.05", surgeColor:"var(--muted)",  tag:"Live", tagStyle:{background:"var(--gd)", color:"var(--green)"} },
  { model:"llama-3.3-70b",      provider:"Meta via AIML API",      base:"$0.001",surge:"$0.01", surgeColor:"var(--muted)",  tag:"Live", tagStyle:{background:"var(--gd)", color:"var(--green)"} },
  { model:"deepseek-r1",        provider:"DeepSeek via AIML API",  base:"$0.001",surge:"$0.01", surgeColor:"var(--muted)",  tag:"Soon", tagStyle:{background:"var(--bd)", color:"var(--blue)"}  },
];

const FEATURES = [
  { icon:"⚡", title:"3-Line Integration",  desc:"app.use(mcpay(...)) wraps any Express route. No changes to your existing tool logic. Works with any MCP server." },
  { icon:"🔑", title:"No API Keys Ever",    desc:"Agents authenticate with OWS wallet signatures. No accounts, no subscriptions, no rate limits. Just wallet + HTTP." },
  { icon:"💬", title:"XMTP Receipts",       desc:"Every payment triggers a wallet-to-wallet XMTP message. Tool owners get paid AND notified. Agents get on-chain receipts." },
  { icon:"📊", title:"Real Earnings",       desc:"Zerion API shows your actual on-chain USDC balance. Not a simulated counter — real money, verified on Base Sepolia." },
  { icon:"🧠", title:"Dynamic Pricing",     desc:"Price function can be static ($0.01) or dynamic — per model, per load, per data size. First surge-pricing x402 middleware." },
  { icon:"🛡", title:"Spend Governance",    desc:"OWS policy engine enforces per-session limits, chain allowlists, and vendor restrictions. Agents can never overspend." },
];

export default function LandingPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("npm install mcpay");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Double ticker items for seamless loop
  const tickerItems = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="scanlines">

      {/* ── NAV ── */}
      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:200,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"18px 48px",
        background:"rgba(7,7,9,0.88)", borderBottom:"1px solid var(--border)",
        backdropFilter:"blur(16px)"
      }}>
        <Link href="/" style={{ fontFamily:"var(--display)", fontWeight:800, fontSize:20, color:"var(--green)", textDecoration:"none", letterSpacing:"-0.5px" }}>
          MC<span style={{color:"var(--white)"}}>Pay</span>
        </Link>
        <div style={{display:"flex", alignItems:"center", gap:24}}>
          {[["#how","Protocol"],["#integrations","Integrations"],["#sdk","SDK"],["#pricing","Pricing"]].map(([href,label]) => (
            <a key={href} href={href} style={{ fontSize:11, color:"var(--muted)", textDecoration:"none", letterSpacing:"0.1em", textTransform:"uppercase" }}
               onMouseEnter={e=>(e.currentTarget.style.color="var(--green)")}
               onMouseLeave={e=>(e.currentTarget.style.color="var(--muted)")}>
              {label}
            </a>
          ))}
          <Link href="/dashboard" style={{
            background:"var(--green)", color:"var(--bg)", padding:"8px 20px",
            fontFamily:"var(--mono)", fontSize:11, fontWeight:700, letterSpacing:"0.08em",
            textTransform:"uppercase", textDecoration:"none"
          }}>
            Live Dashboard →
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-orb" />

        <div className="pill">
          <span className="blink-dot" />
          OWS Hackathon 2026 · Track 03 · Live on Base Sepolia
        </div>

        <h1 className="hero-h1">
          Monetize Any<br />
          <span className="g">MCP Tool</span><br />
          <span className="dim">in 3 Lines</span>
        </h1>

        <p className="hero-sub">
          The first native monetization layer for Model Context Protocol servers.
          No API keys, no subscriptions, no accounts — just an OWS Wallet and an HTTP request.
        </p>

        <div className="hero-btns">
          <a href="#sdk" className="btn-primary">Get Started →</a>
          <Link href="/dashboard" className="btn-ghost">Live Dashboard</Link>
        </div>

        <div className="install-strip">
          <span className="install-label">Install</span>
          <span className="install-cmd">npm install mcpay</span>
          <button className="copy-btn" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </section>

      {/* ── TICKER ── */}
      <div className="ticker-outer">
        <div className="ticker-inner">
          {tickerItems.map((item, i) => (
            <span className="ti" key={i}>
              <span className="dot">◆</span>{item}
            </span>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <section className="sec" id="how">
        <div className="sec-label">Protocol Flow</div>
        <h2 className="sec-title">How MCPay Works</h2>
        <div className="flow">
          {FLOW_STEPS.map(s => (
            <div className="flow-item" key={s.n}>
              <div className="flow-n">{s.n}</div>
              <div className="flow-t">{s.t}</div>
              <div className="flow-d">{s.d}</div>
              <span className="flow-tag">{s.tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CODE BLOCK ── */}
      <div style={{background:"var(--s1)", borderTop:"1px solid var(--border)", borderBottom:"1px solid var(--border)", padding:"60px 48px"}}>
        <div style={{maxWidth:1200, margin:"0 auto"}}>
          <div className="sec-label">Integration</div>
          <h2 className="sec-title">One Middleware.<br />Any Tool.</h2>
          <div className="code-wrap" data-file="server.ts">
            <div className="dots"><span className="dr"/><span className="dy"/><span className="dg"/></div>
            <pre dangerouslySetInnerHTML={{ __html: `<span class="kw">import</span> <span class="fn">express</span> <span class="kw">from</span> <span class="st">'express'</span>
<span class="kw">import</span> { <span class="fn">mcpay</span> } <span class="kw">from</span> <span class="st">'mcpay'</span>         <span class="cm">// npm install mcpay</span>

<span class="kw">const</span> app = <span class="fn">express</span>()

<span class="cm">// ── TOOL 1: Weather — $0.01 flat ──</span>
app.<span class="fn">use</span>(...<span class="fn">mcpay</span>({
  price:         <span class="st">'$0.01'</span>,
  walletAddress: process.env.<span class="fn">TOOL_WALLET</span>,
  toolName:      <span class="st">'weather-data'</span>,
}))

<span class="cm">// ── TOOL 2: AI Inference — dynamic pricing by model ──</span>
app.<span class="fn">use</span>(...<span class="fn">mcpay</span>({
  price:         (<span class="fn">req</span>) => <span class="fn">getDynamicPrice</span>(req.body.model),
  walletAddress: process.env.<span class="fn">TOOL_WALLET</span>,
  toolName:      <span class="st">'ai-inference'</span>,
}))` }} />
          </div>
        </div>
      </div>

      {/* ── INTEGRATIONS ── */}
      <section className="sec" id="integrations">
        <div className="sec-label">Partner Stack</div>
        <h2 className="sec-title">Integrations That<br />Win Prizes</h2>
        <div className="int-grid">
          {INTEGRATIONS.map(int => (
            <div className="int-card" key={int.name}>
              <div className="int-head">
                <div className="int-icon">{int.icon}</div>
                <div>
                  <div className="int-name">{int.name}</div>
                  <span className="int-badge" style={{background:int.badgeColor, color:int.badgeText}}>{int.badge}</span>
                </div>
              </div>
              <div className="int-desc">{int.desc}</div>
              {int.features.map((f,i) => <div className="int-feature" key={i}>{f}</div>)}
            </div>
          ))}
        </div>
      </section>

      {/* ── SDK ── */}
      <div style={{background:"var(--s1)", borderTop:"1px solid var(--border)", borderBottom:"1px solid var(--border)", padding:"80px 48px"}} id="sdk">
        <div style={{maxWidth:1200, margin:"0 auto"}}>
          <div className="sec-label">Developer SDK</div>
          <h2 className="sec-title">mcpay — The Full SDK</h2>
          <div className="sdk-grid">
            {SDK_CARDS.map(c => (
              <div className="sdk-card" key={c.name}>
                <div className="sdk-name">{c.name}</div>
                <div className="sdk-pkg">{c.pkg}</div>
                <div className="sdk-desc">{c.desc}</div>
                <span className={`sdk-status ${c.status}`}>{c.label}</span>
              </div>
            ))}
          </div>

          {/* Agent-side code example */}
          <div className="code-wrap" data-file="agent.ts" style={{marginTop:0}}>
            <div className="dots"><span className="dr"/><span className="dy"/><span className="dg"/></div>
            <pre dangerouslySetInnerHTML={{ __html: `<span class="cm">// Agent-side: mcpayFetch auto-handles 402 + OWS payment</span>
<span class="kw">import</span> { <span class="fn">mcpayFetch</span> } <span class="kw">from</span> <span class="st">'mcpay'</span>

<span class="kw">const</span> result = <span class="kw">await</span> <span class="fn">mcpayFetch</span>(<span class="st">'http://tools.mcpay.dev/weather-data'</span>, {
  method:    <span class="st">'POST'</span>,
  body:      <span class="fn">JSON.stringify</span>({ city: <span class="st">'Delhi'</span> }),
  owsWallet: <span class="st">'mcpay-agent'</span>,   <span class="cm">// OWS wallet name</span>
  maxPrice:  <span class="st">'$0.05'</span>            <span class="cm">// OWS policy ceiling</span>
})
<span class="cm">// → { temperature: '28', city: 'Delhi', _mcpay: { paid: '$0.01' } }</span>
<span class="cm">// That's it. 402 intercepted, OWS paid, result returned. 🎉</span>` }} />
          </div>
        </div>
      </div>

      {/* ── DYNAMIC PRICING ── */}
      <section className="sec" id="pricing">
        <div className="sec-label">AIML API Integration</div>
        <h2 className="sec-title">Dynamic Inference Pricing</h2>
        <p style={{fontSize:13, color:"var(--text)", marginBottom:32, maxWidth:560, lineHeight:1.7}}>
          MCPay wraps AIML API behind x402 with per-model pricing.
          The first pay-per-inference layer that covers Track 03 and Track 04 simultaneously.
        </p>

        <div className="pricing-table">
          <div className="pt-head">
            <span className="pt-label">Model</span>
            <span className="pt-label">Base Price</span>
            <span className="pt-label">Surge (10x)</span>
            <span className="pt-label">Status</span>
          </div>
          {MODELS.map(m => (
            <div className="pt-row" key={m.model}>
              <div>
                <div className="pt-model">{m.model}</div>
                <div className="pt-provider">{m.provider}</div>
              </div>
              <div className="pt-price">{m.base}</div>
              <div className="pt-surge" style={{color:m.surgeColor}}>{m.surge}</div>
              <span className="pt-tag" style={m.tagStyle}>{m.tag}</span>
            </div>
          ))}
        </div>
        <p style={{fontSize:11, color:"var(--muted)", marginTop:16}}>
          Surge pricing activates when queue depth &gt; 10 concurrent requests.
          OWS policy maxPrice ceiling prevents agents from overpaying.
        </p>
      </section>

      {/* ── FEATURES ── */}
      <section className="sec">
        <div className="sec-label">Why MCPay</div>
        <h2 className="sec-title">Built for the<br />Agentic Economy</h2>
        <div className="feat-grid">
          {FEATURES.map(f => (
            <div className="feat" key={f.title}>
              <div className="feat-icon">{f.icon}</div>
              <div className="feat-title">{f.title}</div>
              <div className="feat-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer>
        <div>
          <div className="foot-logo">MCPay</div>
          <p className="foot-desc">
            The first native monetization layer for Model Context Protocol servers.
            Built on OWS + x402. No API keys. No subscriptions. Just a wallet.
          </p>
        </div>
        <div className="foot-r">
          <p>Built by <strong style={{color:"var(--white)"}}>Nikhil Raikwar</strong></p>
          <p style={{color:"var(--green)", marginTop:4}}>OWS Hackathon 2026 · Track 03</p>
          <p style={{marginTop:12}}>Pay-Per-Call Services &amp; API Monetization</p>
          <Link href="/dashboard" style={{color:"var(--green)", textDecoration:"none", fontSize:11}}>
            Live Dashboard →
          </Link>
        </div>
      </footer>

    </div>
  );
}
