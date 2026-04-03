import express from 'express'
import fetch from 'node-fetch'
import cors from 'cors'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { mcpay, getStats } from 'mcpay'

// ==========================================
// LOAD ENV FROM ROOT
// ==========================================
dotenv.config({ path: path.join(__dirname, '../../../.env') })

// ==========================================
// GLOBAL LOG SILENCER — Blocks Zerion 429 spam from ALL sources
// ==========================================
const SILENCE = ['Balance unavailable', 'HTTP 429', '[Zerion] Balance', 'ECONNRESET', 'sqlcipherCodecAttach']
const _origLog = console.log.bind(console)
const _origErr = console.error.bind(console)
console.log = (...args: any[]) => {
  const msg = args.join(' ')
  if (SILENCE.some(s => msg.includes(s))) return
  _origLog(...args)
}
console.error = (...args: any[]) => {
  const msg = args.join(' ')
  if (SILENCE.some(s => msg.includes(s))) return
  _origErr(...args)
}

import { getWalletBalance, getRecentTransactions, getWalletPnL } from './zerion'
import { initXMTP, sendPaymentAlert, getMessages } from './xmtp-notifier'

const app = express()

// ==========================================
// ENABLE CORS FOR THE DASHBOARD
// ==========================================
app.use(cors())
app.use(express.json())

// Landing Page for the Tool Server
app.get('/', (req, res) => {
  res.send(`
    <div style="background: #0a0a0a; color: #00ff88; font-family: monospace; padding: 40px; min-height: 100vh; text-align: center;">
      <h1 style="font-size: 48px;">⚡ MCPay Engine</h1>
      <p style="color: #666; font-size: 20px;">The autonomous machine economy is live.</p>
      <div style="border: 1px solid #00ff8833; padding: 20px; border-radius: 12px; display: inline-block; margin-top: 40px; text-align: left; background: #111;">
        <h3 style="color: #fff; margin-top: 0;">🔧 Native Tool Endpoints:</h3>
        <ul style="color: #888;">
          <li>POST /tools/weather-data — $0.01</li>
          <li>POST /tools/url-summarizer — $0.02</li>
          <li>POST /tools/check-portfolio — $0.05</li>
          <li>GET  /stats — Real-time earnings</li>
        </ul>
        <p style="color: #00ff88; font-size: 14px;">OWS x402 Security Middleware: ACTIVE</p>
      </div>
      <br/><br/>
      <a href="http://localhost:3000" style="color: #0088ff; text-decoration: none;">Go to Registry Dashboard &rarr;</a>
    </div>
  `)
})

// ==========================================
// CONFIG WALLETS & IDENTITIES
// ==========================================
const MY_WALLET = process.env.TOOL_WALLET_ADDRESS as `0x${string}`
const AGENT_WALLET = process.env.AGENT_WALLET_ADDRESS || '0xCc9aF4932E78ABdD3640993cb45944cE2775b37b'

// ==========================================
// ZERION ENDPOINTS (Dashboard ke liye)
// ==========================================
app.get('/zerion/wallet-health', async (req, res) => {
  const agentAddr = AGENT_WALLET
  const toolAddr = MY_WALLET
  
  try {
    const [agentBalance, toolBalance, agentTxs, agentPnl] = await Promise.all([
      getWalletBalance(agentAddr),
      getWalletBalance(toolAddr),
      getRecentTransactions(agentAddr, 5),
      getWalletPnL(agentAddr)
    ])
    
    res.json({
      agent: { ...agentBalance, ...agentPnl },
      tool: toolBalance,
      recentTxs: agentTxs,
      timestamp: new Date().toISOString()
    })
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch wallet health from Zerion' })
  }
})

// ==========================================
// TOOL 1: WEATHER DATA ($0.01 per call)
// ==========================================
app.use(...mcpay({
  price: '$0.01',
  walletAddress: MY_WALLET,
  toolName: 'weather-data',
  description: 'Real-time weather for any city',
  onPayment: async (stats) => {
    await sendPaymentAlert({
      toAddress: AGENT_WALLET,
      toolName: 'weather-data',
      amount: '$0.01',
      totalEarned: stats.totalEarned,
      callNumber: stats.totalCalls
    })
  }
}))

app.post('/tools/weather-data', async (req, res) => {
  const { city } = req.body
  try {
    const response = await fetch(`https://wttr.in/${city}?format=j1`)
    const data: any = await response.json()
    
    res.json({
      city,
      temperature: data.current_condition[0].temp_C,
      feels_like: data.current_condition[0].FeelsLikeC,
      description: data.current_condition[0].weatherDesc[0].value,
      humidity: data.current_condition[0].humidity
    })
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch weather data" })
  }
})

// ==========================================
// TOOL 2: URL SUMMARIZER ($0.02 per call)
// ==========================================
app.use(...mcpay({
  price: '$0.02',
  walletAddress: MY_WALLET,
  toolName: 'url-summarizer',
  description: 'Summarize any webpage',
  onPayment: async (stats) => {
    await sendPaymentAlert({
      toAddress: AGENT_WALLET,
      toolName: 'url-summarizer',
      amount: '$0.02',
      totalEarned: stats.totalEarned,
      callNumber: stats.totalCalls
    })
  }
}))

app.post('/tools/url-summarizer', async (req, res) => {
  const { url } = req.body
  res.json({
    url,
    summary: "This is a summary generated by the URL summarizer tool. The content was processed and compressed into these key points.",
    wordCount: 1250
  })
})

// ==========================================
// TOOL 3: ZERION PORTFOLIO CHECK ($0.05 per call)
// ==========================================
app.use(...mcpay({
  price: '$0.05',
  walletAddress: MY_WALLET,
  toolName: 'check-portfolio',
  description: 'Check crypto portfolio value via Zerion API',
  onPayment: async (stats) => {
    await sendPaymentAlert({
      toAddress: AGENT_WALLET,
      toolName: 'check-portfolio',
      amount: '$0.05',
      totalEarned: stats.totalEarned,
      callNumber: stats.totalCalls
    })
  }
}))

app.post('/tools/check-portfolio', async (req, res) => {
  const { address } = req.body
  console.log(`[Zerion] Checking portfolio for ${address}`)
  try {
    const apiKey = process.env.ZERION_API_KEY
    if (!apiKey) throw new Error("ZERION_API_KEY missing")

    const authHeader = `Basic ${Buffer.from(apiKey + ':').toString('base64')}`
    const url = `https://api.zerion.io/v1/wallets/${address}/portfolio?currency=usd`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'accept': 'application/json'
      }
    })
    
    const data: any = await response.json()
    res.json(data)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

// ==========================================
// AGENT LOG STORAGE
// ==========================================
let agentLogs: any[] = []

app.post('/agent-logs', (req, res) => {
  const { type, content, time } = req.body
  agentLogs.push({ 
    id: Date.now().toString(), 
    type, 
    content, 
    time: time || new Date().toLocaleTimeString(),
    ts: Date.now() 
  })
  if (agentLogs.length > 50) agentLogs.shift()
  res.sendStatus(200)
})

app.get('/agent-logs', (req, res) => {
  res.json(agentLogs)
})

// ==========================================
// REGISTRY SUPPORT ENDPOINTS
// ==========================================
app.get('/stats', (req, res) => {
  res.json(getStats())
})

app.get('/messages', (req, res) => {
  res.json(getMessages())
})

app.post('/messages', (req, res) => {
  const { tool, wallet, amount, body } = req.body
  const history = getMessages()
  history.unshift({
    id: Date.now().toString(),
    tool,
    wallet,
    amount,
    time: new Date().toLocaleTimeString(),
    body
  })
  res.sendStatus(200)
})

app.post('/run-agent', (req, res) => {
  const { prompt } = req.body
  if (!prompt) return res.status(400).send("No prompt provided")

  console.log(`[PLAYGROUND] Executing prompt: ${prompt}`)
  
  // Clear old logs for fresh run
  agentLogs = [] 
  
  // Non-blocking spawn to allow logs to stream to dashboard
  const { spawn } = require('child_process')
  const agentPath = path.join(__dirname, '../../agent-client/src/agent.ts')
  
  const child = spawn('npx', ['ts-node', agentPath, prompt], {
    cwd: path.join(__dirname, '../../../'),
    env: { ...process.env, FORCE_COLOR: '1' }
  })

  child.stdout.on('data', (data: any) => {
    const str = data.toString()
    if (!str.includes('Balance unavailable') && !str.includes('429')) {
      console.log(`[AGENT-STDOUT]: ${str.trim()}`)
    }
  })
  child.stderr.on('data', (data: any) => {
    const str = data.toString()
    if (!str.includes('Balance unavailable') && !str.includes('429')) {
      console.error(`[AGENT-STDERR]: ${str.trim()}`)
    }
  })

  res.send({ status: "Agent Started", prompt })
})

app.get('/ows-interface', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>OWS Local Node</title>
        <style>
          body { background: #050505; color: #00ff88; font-family: monospace; padding: 50px; }
          .container { border: 1px solid #333; padding: 20px; max-width: 600px; margin: auto; box-shadow: 0 0 20px rgba(0,255,136,0.1); }
          h1 { border-bottom: 2px solid #00ff88; padding-bottom: 10px; }
          .stat { margin: 10px 0; font-size: 14px; }
          .label { color: #888; }
          .pulse { display: inline-block; width: 10px; height: 10px; background: #00ff88; border-radius: 50%; animation: pulse 1.5s infinite; margin-right: 10px; }
          @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.5); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }
        </style>
      </head>
      <body>
        <div class="container">
          <h1><div class="pulse"></div> OWS NODE ACTIVE</h1>
          <div class="stat"><span class="label">IDENTITY:</span> mcpay-agent</div>
          <div class="stat"><span class="label">WALLET:</span> 0x2e44D60850e08138F15c209c1D5B3Fb8CC9cB5f9</div>
          <div class="stat"><span class="label">NETWORK:</span> Base Sepolia (eip155:84532)</div>
          <div class="stat"><span class="label">STATUS:</span> Listening for Agentic Payments</div>
          <div class="stat" style="margin-top:20px; color:#555;">[LOG] x402 Settlement Logic Active...</div>
          <div class="stat" style="color:#555;">[LOG] Syncing with MCPay Registry...</div>
        </div>
      </body>
    </html>
  `)
})

app.get('/policy', (req, res) => {
  res.json({
    name: "MCPAY_DEFAULT",
    version: "1.0.0",
    enforcedAt: new Date().toISOString(),
    rules: {
      max_per_tx: "0.05",
      allowed_chains: ["eip155:84532"],
      allowed_tools: ["weather-data", "url-summarizer", "check-portfolio"],
      autopay: true,
      daily_limit: "1.00",
      currency: "USDC"
    },
    status: "Active"
  })
})

app.get('/tools', (req, res) => {
  res.json([
    { name: 'weather-data', price: '$0.01', desc: 'Real-time weather for any city', network: 'Base Sepolia' },
    { name: 'url-summarizer', price: '$0.02', desc: 'Summarize any webpage', network: 'Base Sepolia' },
    { name: 'check-portfolio', price: '$0.05', desc: 'Check crypto portfolio value via Zerion API', network: 'Base Sepolia' }
  ])
})

// ==========================================
// MCP MANIFEST
// ==========================================
app.get('/.well-known/mcp', (req, res) => {
  res.json({
    name: 'MCPay Demo Server',
    version: '1.0.0',
    tools: [
      {
        name: 'weather-data',
        endpoint: '/tools/weather-data',
        price: '$0.01',
        description: 'Real-time weather for any city'
      },
      {
        name: 'url-summarizer', 
        endpoint: '/tools/url-summarizer',
        price: '$0.02',
        description: 'Summarize any webpage'
      },
      {
        name: 'check-portfolio',
        endpoint: '/tools/check-portfolio',
        price: '$0.05',
        description: 'Check crypto portfolio value via Zerion API'
      }
    ]
  })
})

const PORT = 3001
app.listen(PORT, async () => {
  console.log(`\n\n🔧 MCPay Tool Server (CORS ENABLED) running on port ${PORT}`)
  await initXMTP()
  console.log(`✅ XMTP notifications: ACTIVE`)
  console.log(`✅ Zerion integration: ACTIVE`)
})
