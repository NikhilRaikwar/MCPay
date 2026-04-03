"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

/* ─────────────────────────────────────────
   MCPay — Landing Page
   File: app/page.tsx
   ───────────────────────────────────────── */

const TICKER_ITEMS = [
  "x402 Payment Protocol", "OWS CLI Wallet Signing", "Base Sepolia USDC", "XMTP Wallet Receipts",
  "Zerion Real Balances", "Dynamic Surge Pricing", "AIML API Inference", "Claude · GPT-4o · Gemini",
  "No API Keys — Ever", "Agent-Native Payments", "npm i @nikhilraikwar/mcpay", "Live on Base Sepolia",
];

const FLOW_STEPS = [
  { n:"01", t:"Agent Sends HTTP POST",  d:"An autonomous Claude or GPT agent calls any MCPay-wrapped tool endpoint via standard HTTP. Zero agent-side changes — works with any MCP client.",                                           tag:"Standard HTTP"    },
  { n:"02", t:"402 Payment Required",   d:"MCPay middleware intercepts instantly, returning HTTP 402 with x402 headers: USDC amount, destination OWS wallet, and Base Sepolia chain ID.",                             tag:"x402 Protocol"   },
  { n:"03", t:"OWS Wallet Signs",       d:"The agent's OWS CLI evaluates spend policy (maxPrice, chain allowlist), signs the USDC transfer with its private key, and broadcasts to Base Sepolia.",                   tag:"OWS CLI + EIP-155" },
  { n:"04", t:"x402 Verifies On-Chain", d:"MCPay's x402 facilitator confirms the on-chain USDC transfer. Only after cryptographic verification does the tool execute and return results.",                            tag:"Trustless"        },
  { n:"05", t:"XMTP + Dashboard",       d:"Owner receives XMTP wallet notification instantly. Dashboard updates with real Zerion balance, call count, and settlement proof — all verifiable on-chain.",              tag:"Live Proof"       },
];

const INTEGRATIONS = [
  {
    icon:"⛓", name:"OWS + x402", badge:"Core Protocol", badgeColor:"var(--gd)", badgeText:"var(--green)",
    desc:"Every payment in MCPay flows through OWS CLI for wallet signing and x402 for protocol enforcement. Agents never share private keys — OWS signs every USDC transfer autonomously using its policy engine.",
    features:["OWS spend policy: maxPrice, chain allowlist, vendor restrictions","x402 facilitator verifies on-chain USDC before tool executes","Settlement on Base Sepolia — every tx verifiable on Basescan"],
  },
  {
    icon:"💬", name:"XMTP", badge:"Shipped", badgeColor:"var(--bd)", badgeText:"var(--blue)",
    desc:"Every OWS payment triggers a wallet-native XMTP message — no email, no webhooks. Tool owner gets a push notification instantly. Agent receives a cryptographically signed receipt.",
    features:["Tool owner alert: '0xCc9A paid $0.01 for weather-data'","Agent receipt stored in XMTP conversation as on-chain proof","Built with @xmtp/node-sdk — decentralised, censorship-resistant"],
  },
  {
    icon:"◈", name:"Zerion API", badge:"Live Balance", badgeColor:"var(--pd)", badgeText:"var(--purple)",
    desc:"Dashboard shows real USDC earned — not a fake counter. Zerion API pulls live wallet balance, DeFi positions, and decoded transaction history for the OWS tool wallet.",
    features:["Real-time USDC balance from Base Sepolia on-chain state","Per-transaction earnings visible immediately after settlement","Portfolio P&L tracking — proves actual revenue, not simulation"],
  },
  {
    icon:"🧠", name:"AIML API", badge:"Dynamic Pricing", badgeColor:"var(--od)", badgeText:"var(--orange)",
    desc:"MCPay is the first x402 inference marketplace. Each AI model has its own price tier — Claude Opus at $0.05, Llama at $0.001. Surge multiplier activates under queue pressure. OWS policy prevents overpay.",
    features:["5 models live: Claude, GPT-4o, Gemini, Llama, Sonnet","Surge pricing (1x–10x) based on real queue depth","OWS maxPrice ceiling — agent budget is always enforced"],
  },
];

const SDK_CARDS = [
  { name:"mcpay middleware",  pkg:"npm install @nikhilraikwar/mcpay",                     desc:"3-line Express middleware. Wraps any route with x402 enforcement, OWS wallet destination, XMTP notification dispatch, and stats tracking. Ships to npm.",              status:"done", label:"Shipped ✓" },
  { name:"x402 Agent Client", pkg:"ows pay request <url> --wallet mcpay-agent",     desc:"OWS CLI is the agent's payment engine. Evaluates spend policy, signs USDC transfers on Base Sepolia, and retries the original request after settlement.",          status:"done", label:"Shipped ✓" },
  { name:"AI Playground",     pkg:"localhost:3000 → AI Playground tab",             desc:"ChatGPT-style interface where any prompt triggers a real agent loop: Plan → OWS Pay → Execute → Respond. Full live demo with payment receipts visible.",           status:"done", label:"Shipped ✓" },
  { name:"XMTP Notifier",     pkg:"import { sendPaymentAlert } from './xmtp'",       desc:"On every x402 settlement, MCPay sends a wallet-to-wallet XMTP message to the tool owner. Receipt goes to agent's XMTP inbox. No email, no config.",              status:"done", label:"Shipped ✓" },
  { name:"Registry API",      pkg:"GET /tools · GET /stats · GET /agent-logs",      desc:"MCPay server exposes a full REST API. Agents auto-discover tools, prices, and chains. Dashboard polls live stats, earnings, and settlement history.",              status:"done", label:"Shipped ✓" },
  { name:"mcpay CLI",         pkg:"npx mcpay wrap --port 3001 --price $0.01",       desc:"Wrap any HTTP server with x402 payments from the terminal. Zero code changes — point it at a running port. Planned for next release of the mcpay npm package.",   status:"soon", label:"Coming Soon" },
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
  { icon:"⚡", title:"3-Line Middleware",     desc:"app.use(mcpay({ price:'$0.01', walletAddress })) — works on any Express route. No restructuring, no new infra. Ship in minutes." },
  { icon:"🔐", title:"OWS Wallet Native",     desc:"Agents sign every payment with OWS CLI. No shared secrets, no API keys. Private key never leaves the agent's machine. Fully self-sovereign." },
  { icon:"💬", title:"XMTP Push Receipts",    desc:"Real-time wallet-to-wallet XMTP alert on every settlement. Owners know instantly when paid. Agents get a signed receipt in their inbox." },
  { icon:"📊", title:"On-Chain Proof",        desc:"Every dollar earned is a real USDC transfer on Base Sepolia. Zerion API shows live balance. Basescan link on every transaction. Nothing is simulated." },
  { icon:"💹", title:"Surge Pricing Engine",  desc:"Static or dynamic price functions. claude-opus-4-6 costs $0.05, llama-3.3-70b costs $0.001. Queue-depth surge 1x–10x — first of its kind on x402." },
  { icon:"🛡", title:"OWS Spend Governance", desc:"OWS policy engine enforces maxPrice ceiling, chain allowlists, and vendor restrictions before signing. Agents can never be drained or overspend." },
];

export default function LandingPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("npm install @nikhilraikwar/mcpay");
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
          <span className="install-cmd">npm install @nikhilraikwar/mcpay</span>
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
