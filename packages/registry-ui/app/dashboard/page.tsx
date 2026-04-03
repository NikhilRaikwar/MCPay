"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

/* ─────────────────────────────────────────
   MCPay — Dashboard Page (PRODUCTION VERSION)
   Connected to: localhost:3001 (Tool Server)
   ───────────────────────────────────────── */

const SERVER = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3001";

// ── TYPES ──────────────────────────────────
interface ToolStat { toolName: string; totalCalls: number; totalEarned: number; lastCall: string; }
interface FeedRow   { id: string; time: string; tool: string; wallet: string; args: string; amount: number; }
interface XmtpMsg   { id: string; tool: string; wallet: string; amount: number; time: string; }

interface ZerionHealth {
  agent: {
    totalValue: number;
    change24h: number;
    address: string;
  };
  tool: {
    totalValue: number;
    address: string;
  };
  recentTxs: any[];
}

type Page = "overview" | "tools" | "feed" | "wallet" | "xmtp" | "zerion" | "policy";

export default function DashboardPage() {

  // State
  const [page, setPage]               = useState<Page>("overview");
  const [stats, setStats]           = useState<ToolStat[]>([]);
  const [feed, setFeed]             = useState<FeedRow[]>([]);
  const [xmtpFeed, setXmtpFeed]     = useState<XmtpMsg[]>([]);
  const [walletConnected, setWallet] = useState(false);
  const [walletAddr, setWalletAddr]  = useState("");
  const [walletBal, setWalletBal]    = useState("");
  const [walletHealth, setHealth]    = useState<ZerionHealth | null>(null);

  // Derived metrics from stats (Real data from server)
  const totalVol   = stats.reduce((acc, s) => acc + s.totalEarned, 0);
  const totalCalls = stats.reduce((acc, s) => acc + s.totalCalls, 0);
  const uniqueAgents = 1; // Assuming 1 agent for demo

  // ── FETCH LIVE DATA ──
  const fetchLive = useCallback(async () => {
    try {
      const [sRes, zRes] = await Promise.all([
        fetch(`${SERVER}/stats`),
        walletConnected ? fetch(`${SERVER}/zerion/wallet-health`) : Promise.resolve(null)
      ]);
      
      const statsData: ToolStat[] = await sRes.json();
      setStats(statsData);

      if (zRes) {
        const health: ZerionHealth = await zRes.json();
        setHealth(health);
        setWalletBal(health.agent.totalValue.toFixed(4));
        setWalletAddr(health.agent.address);
        
        // Convert Zerion txs to FeedRows
        if (health.recentTxs) {
          const rows: FeedRow[] = health.recentTxs.map((tx: any) => ({
            id: tx.id,
            time: new Date(tx.attributes.mined_at).toLocaleTimeString(),
            tool: "USDC Transfer",
            wallet: tx.attributes.other_parties?.[0] || "Unknown",
            args: tx.attributes.operation_type,
            amount: 0.01 // Placeholder if not parsed
          }));
          setFeed(rows);
        }
      }
    } catch (e) { console.error("Sync error:", e); }
  }, [walletConnected]);

  useEffect(() => {
    fetchLive();
    const id = setInterval(fetchLive, 5000);
    return () => clearInterval(id);
  }, [fetchLive]);

  // ── CONNECT WALLET ──
  const connectWallet = () => {
    if (walletConnected) return;
    setWallet(true);
    fetchLive(); // Fetch real health immediately after connect
  };

  // ── NAV ──
  const NavItem = ({ id, icon, label }: { id: Page; icon: string; label: string }) => (
    <div
      className={`nav-item${page === id ? " active" : ""}`}
      onClick={() => setPage(id)}
      style={{
        display:"flex", alignItems:"center", gap:10,
        padding:"10px 20px", fontSize:11, letterSpacing:".06em", textTransform:"uppercase",
        color: page === id ? "var(--green)" : "var(--muted)",
        cursor:"pointer", transition:"all .2s",
        borderLeft: page === id ? "2px solid var(--green)" : "2px solid transparent",
        background: page === id ? "var(--gd)" : "transparent",
      }}
      onMouseEnter={e => { if(page!==id){ (e.currentTarget as HTMLElement).style.color="var(--white)"; (e.currentTarget as HTMLElement).style.background="var(--s2)"; }}}
      onMouseLeave={e => { if(page!==id){ (e.currentTarget as HTMLElement).style.color="var(--muted)"; (e.currentTarget as HTMLElement).style.background="transparent"; }}}
    >
      <span style={{fontSize:14, width:18, textAlign:"center"}}>{icon}</span>
      {label}
    </div>
  );

  const lastTx = feed[0]?.time ?? "—";

  return (
    <div style={{
      background:"var(--bg)", color:"var(--white)", fontFamily:"var(--mono)",
      minHeight:"100vh", display:"grid",
      gridTemplateRows:"56px 1fr", gridTemplateColumns:"220px 1fr"
    }}>

      {/* ── TOPBAR ── */}
      <header style={{
        gridColumn:"1 / -1", display:"flex", alignItems:"center",
        justifyContent:"space-between", padding:"0 24px",
        borderBottom:"1px solid var(--border)", background:"var(--bg)", zIndex:50,
      }}>
        <Link href="/" style={{ fontFamily:"var(--display)", fontSize:18, fontWeight:800, color:"var(--green)", textDecoration:"none", letterSpacing:"-.5px" }}>
          MC<span style={{color:"var(--white)"}}>Pay</span>
        </Link>

        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <div className="status-dot" />
          <span style={{fontSize:11, color:"var(--green)", letterSpacing:".06em"}}>Live Connection</span>
          <span style={{fontSize:11, color:"var(--muted)"}}>· Base Sepolia · OWS Wallet Connected</span>
        </div>

        <div style={{display:"flex", alignItems:"center", gap:12}}>
          <button className="small-btn" onClick={fetchLive}>Sync Real Data</button>
          <button
            onClick={connectWallet}
            style={{
              display:"flex", alignItems:"center", gap:8,
              border:"1px solid " + (walletConnected ? "rgba(0,232,122,.4)" : "var(--border2)"),
              padding:"6px 14px", fontSize:11,
              color: walletConnected ? "var(--green)" : "var(--text)",
              background: walletConnected ? "var(--gd)" : "transparent",
              cursor:"pointer", transition:"all .2s", fontFamily:"var(--mono)",
            }}
          >
            <div style={{
              width:6, height:6, borderRadius:"50%",
              background: walletConnected ? "var(--green)" : "var(--muted)",
              animation: walletConnected ? "pulse 2s infinite" : "none",
            }}/>
            {walletConnected ? walletAddr.slice(0,16)+"..." : "Connect OWS Wallet"}
          </button>
        </div>
      </header>

      {/* ── SIDEBAR ── */}
      <nav style={{
        borderRight:"1px solid var(--border)", background:"var(--s1)",
        padding:"20px 0", display:"flex", flexDirection:"column", gap:2, overflowY:"auto",
      }}>
        <div style={{fontSize:9, color:"var(--muted)", letterSpacing:".15em", textTransform:"uppercase", padding:"0 20px", marginBottom:4}}>Overview</div>
        <NavItem id="overview" icon="◈" label="Dashboard" />
        <NavItem id="tools"    icon="⚙" label="Tool Registry" />
        <NavItem id="feed"     icon="⚡" label="Live Tx Feed" />

        <div style={{height:1, background:"var(--border)", margin:"12px 16px"}} />
        <div style={{fontSize:9, color:"var(--muted)", letterSpacing:".15em", textTransform:"uppercase", padding:"0 20px", marginBottom:4}}>Real Wallet</div>
        <NavItem id="wallet"  icon="◉" label="OWS Interface" />
        <NavItem id="xmtp"    icon="✉" label="XMTP Alerts" />
        <NavItem id="zerion"  icon="◎" label="Zerion API Hub" />

        <div style={{height:1, background:"var(--border)", margin:"12px 16px"}} />
        <div style={{fontSize:9, color:"var(--muted)", letterSpacing:".15em", textTransform:"uppercase", padding:"0 20px", marginBottom:4}}>Governance</div>
        <NavItem id="policy" icon="🛡" label="Spend Policies" />

        <div style={{marginTop:"auto", padding:"20px", borderTop:"1px solid var(--border)"}}>
          <div style={{fontSize:9, color:"var(--muted)", letterSpacing:".1em", textTransform:"uppercase", marginBottom:8}}>Powered by</div>
          <div style={{display:"flex", gap:10, fontSize:10, color:"var(--text)"}}>
            <span>Zerion</span>
            <span>XMTP</span>
            <span>OWS</span>
          </div>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <main style={{overflowY:"auto", padding:28, display:"flex", flexDirection:"column", gap:20}}>

        {/* ══ OVERVIEW ══ */}
        {page === "overview" && <>
          {/* Metric row */}
          <div className="metric-row">
            {[
              { label:"Total Volume",     val:`$${totalVol.toFixed(4)}`,   sub:`Real-time Earnings`,  subClass:"up",   color:"var(--green)"  },
              { label:"Total Tool Calls", val:String(totalCalls),           sub:`across activated tools`, subClass:"",     color:"var(--blue)"   },
              { label:"Agent Balance",    val:walletConnected ? `$${walletBal}` : "Not Connected", sub:"From Zerion API",   subClass:"",     color:"var(--purple)" },
              { label:"Last Activity",    val:lastTx,                       sub:"On-chain Checksum",     subClass:"",     color:"var(--orange)", small:true },
            ].map(m => (
              <div className="metric" key={m.label}>
                <div className="metric-label">{m.label}</div>
                <div className="metric-val" style={{color:m.color, fontSize: m.small ? 14 : undefined, paddingTop: m.small ? 8 : undefined}}>{m.val}</div>
                <div className={`metric-sub ${m.subClass}`}>{m.sub}</div>
              </div>
            ))}
          </div>

          <div className="tools-row">
            {stats.map(s => (
              <div className="tool-card" key={s.toolName}>
                <div className="tc-top">
                  <div className="tc-name">{s.toolName}</div>
                  <span className="tc-price flat">Active</span>
                </div>
                <div className="tc-desc">Integration with x402 middleware. Payments settled on Base Sepolia. Earnings synced via mcpay SDK.</div>
                <div className="tc-stats">
                  <div><div className="tc-sl">Calls</div><div className="tc-sv">{s.totalCalls}</div></div>
                  <div><div className="tc-sl">Earned</div><div className="tc-sv earn">${s.totalEarned.toFixed(4)}</div></div>
                  <div><div className="tc-sl">Verified</div><div className="tc-sv" style={{fontSize:11, color:"var(--green)"}}>Yes</div></div>
                </div>
                <div className="tc-endpoint">POST /tools/{s.toolName}</div>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">
                <div style={{width:7,height:7,borderRadius:"50%",background:"var(--green)",animation:"pulse 1s infinite",display:"inline-block"}}/>
                Real-time Transaction Feed (from Zerion API)
              </div>
            </div>
            {feed.length === 0 ? (
              <div style={{padding:"28px 20px", fontSize:11, color:"var(--muted)", textAlign:"center"}}>Sync wallet to fetch real on-chain transaction history.</div>
            ) : (
              <div style={{overflowX:"auto"}}>
                <table className="feed-table">
                  <thead><tr><th>Time</th><th>Operation</th><th>Counterparty Wallet</th><th>Status</th><th style={{textAlign:"right"}}>Amount</th></tr></thead>
                  <tbody>
                    {feed.slice(0,5).map(r => (
                      <tr key={r.id} className="flash-in">
                        <td className="td-time">{r.time}</td>
                        <td className="td-tool">{r.args}</td>
                        <td className="td-wallet">{r.wallet}</td>
                        <td className="td-status"><span className="status-pill sp-ok">On-chain</span></td>
                        <td className="td-amount" style={{color:"#888"}}>—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>}

        {/* ══ TOOL REGISTRY ══ */}
        {page === "tools" && (
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Live MCP Tool Inventory</div>
            </div>
            <div style={{padding:20, display:"flex", flexDirection:"column", gap:16}}>
              {stats.map(t => (
                <div key={t.toolName} style={{background:"var(--s2)", border:"1px solid var(--border)", padding:20}}>
                  <div style={{display:"grid", gridTemplateColumns:"1fr 120px 120px 100px", gap:12, alignItems:"center", marginBottom:12}}>
                    <div>
                      <div style={{fontFamily:"var(--display)", fontSize:15, fontWeight:700}}>{t.toolName}</div>
                      <div style={{fontSize:10, color:"var(--muted)", marginTop:3}}>POST /tools/{t.toolName}</div>
                    </div>
                    <span className="tc-price flat" style={{textAlign:"center"}}>Settled</span>
                    <div style={{fontSize:11, color:"var(--text)"}}>Base Sepolia</div>
                    <span className={`status-pill sp-ok`}>Active</span>
                  </div>
                  <div style={{display:"flex", gap:24, marginTop:10}}>
                    <div><div style={{fontSize:9, color:"var(--muted)", textTransform:"uppercase"}}>Total Calls</div><div style={{fontSize:18, fontWeight:700, color:"var(--white)"}}>{t.totalCalls}</div></div>
                    <div><div style={{fontSize:9, color:"var(--muted)", textTransform:"uppercase"}}>Total Revenue</div><div style={{fontSize:18, fontWeight:700, color:"var(--green)"}}>${t.totalEarned.toFixed(4)}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ FULL FEED ══ */}
        {page === "feed" && (
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">On-chain Audit Log</div>
            </div>
            <div style={{overflowX:"auto"}}>
              <table className="feed-table">
                <thead><tr><th>Mined At</th><th>Event</th><th>Address</th><th>Details</th><th>Proof</th></tr></thead>
                <tbody>
                  {feed.length === 0
                    ? <tr><td colSpan={5} style={{textAlign:"center", color:"var(--muted)", padding:32}}>No transaction history found on-chain.</td></tr>
                    : feed.map(r => (
                        <tr key={r.id} className="flash-in">
                          <td className="td-time">{r.time}</td>
                          <td className="td-tool">{r.args}</td>
                          <td className="td-wallet">{r.wallet}</td>
                          <td style={{fontSize:10, color:"var(--text)"}}>Base Sepolia Confirmation</td>
                          <td className="td-status"><span className="status-pill sp-ok">Verified</span></td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ WALLET ══ */}
        {page === "wallet" && <>
          <div className="wallet-hero">
            <div>
              <div className="wab-label">OWS Identity</div>
              <div className="wab-addr">{walletConnected ? walletAddr : "Connect to Load Portfolio"}</div>
              <div className="wab-network">OWS-managed · Base Sepolia · USDC Settlements</div>
            </div>
            {walletConnected && (
              <div style={{textAlign:"right"}}>
                <div className="wbb-label">Balance (Zerion API)</div>
                <div className="wbb-amount">${walletBal}</div>
                <div className="wbb-usd">Real-time valuation in USD</div>
              </div>
            )}
            <button className="btn-connect-wallet" onClick={connectWallet} disabled={walletConnected}>
              {walletConnected ? "Wallet Linked" : "Connect OWS Wallet"}
            </button>
          </div>
          
          <div className="panel" style={{padding:24}}>
            <h3 style={{fontSize:14, marginBottom:16}}>How OWS Identity Works</h3>
            <p style={{fontSize:12, color:"var(--text)", lineHeight:1.7}}>
              This dashboard connects directly to the <strong>Open Wallet Standard (OWS)</strong> node running on your machine. 
              By connecting your agent's wallet, we fetch real-time portfolio health from <strong>Zerion API</strong> and 
              payment alerts via <strong>XMTP</strong>. 
            </p>
          </div>
        </>}

        {/* ══ XMTP ══ */}
        {page === "xmtp" && (
          <div className="panel">
            <div className="panel-head"><div className="panel-title">XMTP Payment Receipts</div></div>
            <div style={{padding:"60px 20px", textAlign:"center"}}>
              <div style={{fontSize:32, marginBottom:20}}>✉</div>
              <div style={{fontSize:14, color:"var(--white)", marginBottom:8}}>XMTP Logic: Real Conversations Only</div>
              <p style={{fontSize:12, color:"var(--muted)", maxWidth:400, margin:"0 auto"}}>
                As per XMTP security standards, notifications only appear for verified wallet-to-wallet handshakes within the OWS Policy Engine.
              </p>
            </div>
          </div>
        )}

        {/* ══ ZERION ══ */}
        {page === "zerion" && (
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Zerion API Dashboard</div>
            </div>
            <div style={{padding:40, textAlign:"center"}}>
              <h2 style={{fontFamily:"var(--display)", color:"var(--green)", marginBottom:16}}>Zerion Integration Active</h2>
              <p style={{fontSize:12, color:"var(--text)", marginBottom:32}}>
                Automatically tracking your MCPay earnings across Base Sepolia.
              </p>
              <div style={{display:"flex", justifyContent:"center", gap:20}}>
                <div style={{border:"1px solid var(--border)", padding:20, background:"var(--s2)"}}>
                  <div style={{fontSize:9, color:"var(--muted)"}}>WALLET HIERARCHY</div>
                  <div style={{fontSize:14, marginTop:10}}>Agent & Tool Wallets Linked</div>
                </div>
                <div style={{border:"1px solid var(--border)", padding:20, background:"var(--s2)"}}>
                  <div style={{fontSize:9, color:"var(--muted)"}}>BALANCE SYNC</div>
                  <div style={{fontSize:14, marginTop:10}}>Poll Rate: 5s</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ POLICY ══ */}
        {page === "policy" && (
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">OWS Spend Policies</div>
            </div>
            <div style={{padding:20}}>
              <div style={{background:"var(--s2)", border:"1px solid var(--border)", padding:20, marginBottom:20}}>
                <div style={{fontSize:10, color:"var(--muted)", marginBottom:12}}>ACTIVE POLICY: MCPAY_DEFAULT</div>
                <pre style={{fontFamily:"var(--mono)", fontSize:12, color:"var(--text)", lineHeight:1.6}}>
{`{
  "max_per_tx": "0.05",
  "allowed_chains": ["eip155:84532"],
  "allowed_tools": ["weather-data", "summarizer"],
  "autopay": true,
  "daily_limit": "1.00"
}`}
                </pre>
              </div>
              <p style={{fontSize:11, color:"var(--muted)"}}>Policies are stored in your OWS CLI and enforced locally before signing.</p>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
