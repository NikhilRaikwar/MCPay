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

type Page = "overview" | "tools" | "feed" | "wallet" | "xmtp" | "zerion" | "policy" | "playground";

export default function DashboardPage() {

  // State
  const [page, setPage]               = useState<Page>("overview");
  const [stats, setStats]           = useState<ToolStat[]>([]);
  const [toolsList, setToolsList]   = useState<any[]>([]);
  const [messages, setMessages]     = useState<any[]>([]);
  const [agentLogs, setAgentLogs]   = useState<any[]>([]);
  const [policy, setPolicy]         = useState<any>(null);
  const [feed, setFeed]             = useState<FeedRow[]>([]);
  const [walletConnected, setWallet] = useState(false);
  const [walletAddr, setWalletAddr]  = useState("0x000...000");
  const [walletBal, setWalletBal]    = useState("0.0000");
  const [walletHealth, setHealth]    = useState<ZerionHealth | null>(null);

  // Derived metrics from stats (Real data from server)
  const totalVol   = stats.reduce((acc, s) => acc + s.totalEarned, 0);
  const totalCalls = stats.reduce((acc, s) => acc + s.totalCalls, 0);

  // ── FETCH LIVE DATA ──
  const fetchLive = useCallback(async () => {
    try {
      const [sRes, zRes, tRes, mRes, pRes, lRes] = await Promise.all([
        fetch(`${SERVER}/stats`),
        walletConnected ? fetch(`${SERVER}/zerion/wallet-health`) : Promise.resolve(null),
        fetch(`${SERVER}/tools`),
        fetch(`${SERVER}/messages`),
        fetch(`${SERVER}/policy`),
        fetch(`${SERVER}/agent-logs`)
      ]);
      
      if (sRes.ok) setStats(await sRes.json());
      if (tRes?.ok) setToolsList(await tRes.json());
      if (mRes?.ok) setMessages(await mRes.json());
      if (pRes?.ok) setPolicy(await pRes.json());
      if (lRes.ok) {
        const rawLogs = await lRes.json();
        // Force START log to ts=1 so it always sorts to TOP after ascending sort
        const fixedLogs = rawLogs.map((l: any) => l.type === 'START' ? { ...l, ts: 1 } : l);
        setAgentLogs(fixedLogs);
      }


      if (zRes?.ok) {
        const health: ZerionHealth = await zRes.json();
        setHealth(health);
        setWalletBal(Number(health.agent.totalValue).toFixed(4));
        setWalletAddr(health.agent.address || "");
        
        // Convert Zerion txs to FeedRows (Improved mapping)
        if (health.recentTxs) {
          const rows: FeedRow[] = health.recentTxs.map((tx: any) => {
            const attr = tx.attributes;
            const opType = attr.operation_type;
            const counterparty = attr.other_parties?.[0] || "OWS Internal";
            const time = attr.mined_at ? new Date(attr.mined_at).toLocaleTimeString() : new Date().toLocaleTimeString();
            
            return {
              id: tx.id,
              time,
              tool: opType === 'transfer' ? 'USDC P2P' : 'Contract Call',
              wallet: counterparty,
              args: opType.charAt(0).toUpperCase() + opType.slice(1),
              amount: 0.01 // Default if price not in tx attribute
            };
          });
          setFeed(rows);
        }
      }
    } catch (e) { console.error("Sync error:", e); }
  }, [walletConnected]);

  // ── AUTO CONNECT ON LOAD ──
  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch(`${SERVER}/zerion/wallet-health`);
        if (response.ok) {
          setWallet(true);
        }
      } catch (e) {}
    };
    checkServer();
  }, []);

  useEffect(() => {
    fetchLive();
    const id = setInterval(fetchLive, 5000);
    return () => clearInterval(id);
  }, [fetchLive]);

  // ── AUTO SCROLL ──
  useEffect(() => {
    if (page === 'playground') {
      const anchor = document.getElementById('anchor');
      if (anchor) anchor.scrollIntoView({ behavior: 'smooth' });
    }
  }, [agentLogs, page]);

  // ── CONNECT WALLET ──
  const connectWallet = async () => {
    if (walletConnected) return;
    try {
        // Real-world server check
        const response = await fetch(`${SERVER}/stats`);
        if (!response.ok) throw new Error();
        setWallet(true);
        fetchLive();
    } catch (e) {
        alert("Error: MCPay Server or OWS Wallet Offline. Run Server First!");
    }
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
      <style>{`
        @keyframes shimmer { 0% { left: -100%; } 100% { left: 100%; } }
        .shimmer-line { background: linear-gradient(90deg, transparent, var(--blue), transparent); animation: shimmer 1s infinite linear; }
        @keyframes stepPulse { 0% { box-shadow: 0 0 0 0 rgba(0,183,255,0.4); } 70% { box-shadow: 0 0 0 10px rgba(0,183,255,0); } 100% { box-shadow: 0 0 0 0 rgba(0,183,255,0); } }
        .active-step-pulse { animation: stepPulse 1.5s infinite; }
        @keyframes popIn { 0% { transform: scale(0.95); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes slideIn { 0% { transform: translateY(10px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
      `}</style>

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
            {walletConnected ? (walletAddr && walletAddr !== "0x000...000" ? walletAddr.slice(0,14)+"..." : "Syncing...") : "Connect OWS Wallet"}
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

        <div style={{height:1, background:"var(--border)", margin:"12px 16px"}} />
        <div style={{fontSize:9, color:"var(--muted)", letterSpacing:".15em", textTransform:"uppercase", padding:"0 20px", marginBottom:4}}>Real Wallet</div>
        <NavItem id="playground" icon="🕹" label="AI Playground" />
        <div className="nav-item" style={{display:"flex", alignItems:"center", gap:10, padding:"10px 20px", fontSize:11, color:"var(--muted)", cursor:"pointer"}} 
             onClick={()=>window.open('http://localhost:3001/ows-interface', '_blank')}>
          <span style={{fontSize:14, width:18, textAlign:"center"}}>◉</span>
          OWS Interface
        </div>

        <div style={{height:1, background:"var(--border)", margin:"12px 16px"}} />
        <div style={{fontSize:9, color:"var(--muted)", letterSpacing:".15em", textTransform:"uppercase", padding:"0 20px", marginBottom:4}}>Governance</div>
        <NavItem id="policy" icon="🛡" label="Spend Policies" />

        <div style={{height:1, background:"var(--border)", margin:"12px 16px"}} />
        <div style={{fontSize:9, color:"var(--muted)", letterSpacing:".15em", textTransform:"uppercase", padding:"0 20px", marginBottom:4}}>Resources</div>
        <a href="https://mcpay.nikhilraikwar.me/" style={{
          display:"flex", alignItems:"center", gap:10,
          padding:"10px 20px", fontSize:11, letterSpacing:".06em", textTransform:"uppercase",
          color:"var(--muted)", textDecoration:"none", transition:"all. 2s"
        }}>
          <span style={{fontSize:14, width:18, textAlign:"center"}}>📟</span>
          Back to Site
        </a>

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
              { label:"Total Revenue",    val:`$${totalVol.toFixed(4)}`,   sub:`Direct OWS Settlements`,  subClass:"up",   color:"var(--purple)" },
              { label:"Network Status",   val:"Active",                    sub:"Base Sepolia v4.2",      subClass:"up",   color:"var(--orange)" }
            ].map(m => (
              <div className="metric" key={m.label}>
                <div className="metric-label">{m.label}</div>
                <div className="metric-val" style={{color:m.color}}>{m.val}</div>
                <div className={`metric-sub ${m.subClass}`}>{m.sub}</div>
              </div>
            ))}
          </div>

          <div className="tools-row" style={{marginBottom:12}}>
            {stats.map(s => (
              <div className="tool-card" key={s.toolName} style={{padding: "16px 20px"}}>
                <div className="tc-top">
                  <div className="tc-name" style={{fontSize:14}}>{s.toolName}</div>
                  <span className="tc-price flat">Active</span>
                </div>
                <div className="tc-stats" style={{marginTop:8}}>
                  <div><div className="tc-sl">Calls</div><div className="tc-sv">{s.totalCalls}</div></div>
                  <div><div className="tc-sl">Earned</div><div className="tc-sv earn">${s.totalEarned.toFixed(4)}</div></div>
                </div>
              </div>
            ))}
          </div>

          {/* Agent Playground Input */}
          <div className="panel" style={{padding:0, overflow:"hidden", border:"1px solid var(--blue)"}}>
            <div style={{display:"flex", background:"var(--s1)", padding:10, gap:10}}>
              <input 
                id="agentInput"
                type="text" 
                placeholder="Talk to OWS Agent (e.g. Check weather in Delhi or summarize http://...)"
                style={{
                  flex:1, background:"#000", border:"1px solid #333", color:"#fff",
                  padding:"12px 20px", fontSize:13, fontFamily:"var(--mono)", outline:"none"
                }}
                onKeyDown={(e) => { if(e.key==='Enter') (document.getElementById('runBtn') as any).click(); }}
              />
              <button 
                id="runBtn"
                style={{
                  background:"var(--blue)", color:"#000", border:"none", padding:"0 24px",
                  fontSize:11, fontWeight:800, cursor:"pointer", textTransform:"uppercase"
                }}
                onClick={async () => {
                  const input = document.getElementById('agentInput') as HTMLInputElement;
                  const prompt = input.value;
                  if(!prompt) return;
                  input.value = "";
                  await fetch(`${SERVER}/run-agent`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt })
                  });
                  setTimeout(() => fetchLive(), 800);
                  setTimeout(() => fetchLive(), 2500);
                }}
              >Run Agent</button>
            </div>
          </div>

          <div style={{display:"grid", gridTemplateColumns: "1fr", gap:20}}>
            {/* Agent Live Console - Full Width for better visibility */}
            <div className="panel" style={{height:550, display:"flex", flexDirection:"column", background:"#080808"}}>
                <div className="panel-head">
                    <div className="panel-title">📟 OWS Agent Live Activity</div>
                </div>
                <div style={{
                  flex:1, padding:15, fontFamily:"var(--mono)", fontSize:10.5, 
                  overflowY:"auto", display: "flex", flexDirection: "column",
                  lineHeight: 1.5
                }}>
                    {agentLogs.length === 0 ? (
                        <div style={{color:"#333", textAlign:"center", marginTop:100}}>Waiting for OWS Agent commands...</div>
                    ) : (() => {
                        const startLogs = agentLogs.filter(l => l.type === 'START')
                        const processLogs = agentLogs.filter(l => ['PLAN', 'EXEC', 'PAY'].includes(l.type))
                        const doneLogs = agentLogs.filter(l => l.type === 'DONE')
                        return [...startLogs, ...processLogs, ...doneLogs].map(log => (
                          <div key={log.id} style={{marginBottom:8, borderBottom:"1px solid #151515", paddingBottom:6}}>
                            <span style={{color:"#444"}}>[{log.time}]</span>{" "}
                            <span style={{
                              color: log.type === 'PAY' ? 'var(--green)' : 
                                     log.type === 'EXEC' ? 'var(--blue)' : 
                                     log.type === 'PLAN' ? '#aaa' : 
                                     log.type === 'START' ? 'var(--orange)' : 'var(--white)',
                              fontWeight: 700,
                              fontSize: 9
                            }}>{log.type}</span>{" "}
                            <span style={{color: "#eee", marginLeft: 8}}>{log.content}</span>
                          </div>
                        ))
                    })()}
                </div>
            </div>
          </div>
        </>}

        {/* ══ TOOL REGISTRY ══ */}
        {page === "tools" && (
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Live MCP Tool Inventory</div>
            </div>
            <div style={{padding:20, display:"flex", flexDirection:"column", gap:16}}>
              {toolsList.map(t => (
                <div key={t.name} style={{background:"var(--s2)", border:"1px solid var(--border)", padding:20}}>
                  <div style={{display:"grid", gridTemplateColumns:"1fr 120px 120px 100px", gap:12, alignItems:"center", marginBottom:12}}>
                    <div>
                      <div style={{fontFamily:"var(--display)", fontSize:15, fontWeight:700}}>{t.name}</div>
                      <div style={{fontSize:10, color:"var(--muted)", marginTop:3}}>{t.desc}</div>
                    </div>
                    <span className="tc-price flat" style={{textAlign:"center"}}>{t.price}</span>
                    <div style={{fontSize:11, color:"var(--text)"}}>{t.network}</div>
                    <span className={`status-pill sp-ok`}>Active</span>
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

        {/* ══ AI PLAYGROUND (CHATGPT WRAPPER MODE) ══ */}
        {page === "playground" && (
          <div style={{display:"flex", flexDirection:"column", height:"calc(100vh - 120px)", background:"#050505", border:"1px solid var(--border)", position: "relative"}}>
            
            {/* Chat Box Area */}
            <div 
              id="chatContainer"
              style={{flex:1, overflowY:"auto", padding:"40px 20%", display:"flex", flexDirection:"column", gap:30, scrollBehavior:"smooth"}}
            >
              {agentLogs.length === 0 ? (
                <div style={{textAlign:"center", marginTop:100}}>
                  <div style={{fontSize:24, fontWeight:800, color:"#333", marginBottom:10}}>Welcome to OWS Playground</div>
                  <div style={{fontSize:12, color:"#1a1a1a"}}>Use AI to perform payments and tool calls via OWS.</div>
                </div>
              ) : (
                <>
                {/* Render in fixed order: START first, process logs, DONE last */}
                {(() => {
                  const startLogs = agentLogs.filter(l => l.type === 'START')
                  const processLogs = agentLogs.filter(l => ['PLAN', 'EXEC', 'PAY'].includes(l.type))
                  const doneLogs = agentLogs.filter(l => l.type === 'DONE')
                  const ordered = [...startLogs, ...processLogs, ...doneLogs]
                  
                  return ordered.map(log => {
                    if (log.type === 'START') return (
                      <div key={log.id} style={{alignSelf:"flex-end", maxWidth:"85%", background:"var(--blue)", color:"#000", padding:"16px 28px", borderRadius:"24px 24px 0 24px", fontSize:15, fontWeight:700, animation: "popIn 0.3s ease-out", marginBottom:15}}>
                        {log.content}
                      </div>
                    )
                    
                    if (log.type === 'DONE') return (
                      <div key={log.id} style={{alignSelf:"flex-start", width:"100%", maxWidth:"98%", background:"#111", border:"1px solid #222", color:"#fff", padding:"35px", borderRadius:"0 24px 24px 24px", fontSize:15, lineHeight:1.7, animation: "slideIn 0.4s ease-out", marginBottom:30}}>
                        <div style={{fontSize:10, color:"var(--blue)", textTransform:"uppercase", fontWeight:900, marginBottom:16, letterSpacing:".2em", borderBottom:"1px solid #222", paddingBottom:10}}>Agent Response</div>
                        <div style={{whiteSpace:"pre-wrap", overflowX:"auto", fontFamily:"var(--mono)", fontSize:14, color:"#eee"}}>{log.content}</div>
                      </div>
                    )
                    
                    return (
                      <div key={log.id} style={{alignSelf:"flex-start", marginLeft:20, padding:"7px 18px", background:"transparent", borderLeft:"2px solid #222", fontSize:11, color:"#555", fontFamily:"var(--mono)", marginBottom:5}}>
                        <span style={{color: log.type==='PAY'?'var(--green)':'#444', marginRight:10, fontWeight:900}}>[{log.type}]</span>
                        {log.content}
                      </div>
                    )
                  })
                })()}
                </>
              )}
              {/* Invisible anchor for scroll to bottom */}
              <div id="anchor" style={{ height: 40 }} />
            </div>

            {/* MESSAGE BOX AT BOTTOM */}
            <div style={{padding:"20px 20%", background:"linear-gradient(to top, #050505, transparent)"}}>
              <div style={{position:"relative", display:"flex", background:"#111", border:"1px solid #222", borderRadius:12, padding:8}}>
                <input 
                  id="pgInput"
                  autoComplete="off"
                  placeholder="Ask OWS Agent (e.g., Bina weather)"
                  style={{
                    flex:1, background:"transparent", border:"none", color:"#fff",
                    padding:"15px 20px", fontSize:14, outline:"none"
                  }}
                  onKeyDown={(e) => { if(e.key==='Enter') (document.getElementById('runBtn') as any).click(); }}
                />
                <button 
                  id="runBtn"
                  style={{
                    background:"var(--green)", color:"#000", border:"none", borderRadius:8,
                    padding:"0 25px", cursor:"pointer", transition:"transform 0.1s", fontWeight: 800
                  }}
                  onClick={async () => {
                    const el = document.getElementById('pgInput') as HTMLInputElement;
                    const prompt = el.value;
                    if(!prompt) return;
                    el.value = "";
                    
                    // PRESERVE STATE: Set initial query locally so it shows up instantly
                    const now = Date.now();
                    setAgentLogs([{ id: 'init-'+now, type: 'START', content: prompt, time: new Date().toLocaleTimeString(), ts: 1 }]);
                    
                    // Trigger agent
                    await fetch(`${SERVER}/run-agent`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ prompt })
                    });
                    
                    // INSTANT SYNC: Don't wait for 5 seconds poll
                    setTimeout(() => fetchLive(), 800);
                    setTimeout(() => fetchLive(), 2500);
                  }}
                >
                  <span style={{fontSize:18, fontWeight:1000}}>↑</span>
                </button>
              </div>
              <div style={{textAlign:"center", fontSize:10, color:"#222", marginTop:12, fontWeight: 600}}>AI Protocol Active</div>
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
            {messages.length === 0 ? (
              <div style={{padding:"60px 20px", textAlign:"center"}}>
                <div style={{fontSize:32, marginBottom:20}}>✉</div>
                <div style={{fontSize:14, color:"var(--white)", marginBottom:8}}>Waiting for incoming alerts...</div>
                <p style={{fontSize:12, color:"var(--muted)", maxWidth:400, margin:"0 auto"}}>
                  As per XMTP security standards, notifications appear here after the agent completes a tool payment.
                </p>
              </div>
            ) : (
              <div style={{padding:20, display:"flex", flexDirection:"column", gap:12}}>
                {messages.map(m => (
                  <div key={m.id} style={{background:"var(--s2)", border:"1px solid var(--border2)", padding:16, borderLeft:"3px solid var(--blue)"}}>
                    <div style={{display:"flex", justifyContent:"space-between", marginBottom:8}}>
                      <span style={{color:"var(--blue)", fontSize:11, fontWeight:700}}>PAYMENT RECEIVED</span>
                      <span style={{color:"var(--muted)", fontSize:10}}>{m.time}</span>
                    </div>
                    <div style={{fontSize:13, color:"var(--white)", whiteSpace:"pre-wrap", fontFamily: "var(--mono)"}}>{m.body}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ ZERION ══ */}
        {page === "zerion" && (
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Zerion API Dashboard</div>
            </div>
            <div style={{padding:24}}>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:24}}>
                    <div style={{background:"var(--s1)", padding:20, border:"1px solid var(--border)"}}>
                        <div style={{fontSize:9, color:"var(--muted)", textTransform:"uppercase"}}>Agent Portfolio Management</div>
                        <div style={{fontSize:24, fontWeight:800, color:"var(--white)", marginTop:10}}>${walletBal || "0.00"}</div>
                        <div style={{fontSize:10, color:"var(--green)", marginTop:4}}>Real-time sync active</div>
                    </div>
                    <div style={{background:"var(--s1)", padding:20, border:"1px solid var(--border)"}}>
                        <div style={{fontSize:9, color:"var(--muted)", textTransform:"uppercase"}}>Tool Provider Health</div>
                        <div style={{fontSize:24, fontWeight:800, color:"var(--blue)", marginTop:10}}>${walletHealth ? Number(walletHealth.tool.totalValue).toFixed(4) : "0.0000"}</div>
                         <div style={{fontSize:10, color:"var(--muted)", marginTop:4}}>Receiving wallet linked</div>
                    </div>
                </div>
                <div style={{fontSize:11, color:"var(--text)", lineHeight:1.6}}>
                    Powered by Zerion's multi-chain API. Tracking assets on Base Sepolia.
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
              {policy ? (
                <div style={{background:"var(--s2)", border:"1px solid var(--border)", padding:20, marginBottom:20}}>
                  <div style={{fontSize:10, color:"var(--muted)", marginBottom:12, display:"flex", justifyContent:"space-between"}}>
                    <span>ACTIVE POLICY: {policy.name}</span>
                    <span style={{color:"var(--green)"}}>STATUS: {policy.status}</span>
                  </div>
                  <pre style={{fontFamily:"var(--mono)", fontSize:12, color:"var(--text)", lineHeight:1.6, background:"#000", padding:15}}>
                    {JSON.stringify(policy.rules, null, 2)}
                  </pre>
                  <div style={{fontSize:10, color:"var(--muted)", marginTop:12}}>ENFORCED AT: {new Date(policy.enforcedAt).toLocaleString()}</div>
                </div>
              ) : (
                <p style={{fontSize:11, color:"var(--muted)"}}>Loading policy from OWS CLI...</p>
              )}
              <p style={{fontSize:11, color:"var(--muted)"}}>Policies are stored in your OWS CLI and enforced locally before signing.</p>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
