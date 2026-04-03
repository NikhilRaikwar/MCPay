import express from 'express'
import fetch from 'node-fetch'
import cors from 'cors'
import { mcpay, getStats } from 'mcpay'

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
          <li>GET  /stats — Real-time earnings</li>
        </ul>
        <p style="color: #00ff88; font-size: 14px;">OWS x402 Security Middleware: ACTIVE ✅</p>
      </div>
      <br/><br/>
      <a href="http://localhost:3000" style="color: #0088ff; text-decoration: none;">Go to Registry Dashboard &rarr;</a>
    </div>
  `)
})

// ==========================================
// TOOL DEVELOPER KA WALLET
// ==========================================
const MY_WALLET = process.env.TOOL_WALLET_ADDRESS as `0x${string}`

// ==========================================
// TOOL 1: WEATHER DATA ($0.01 per call)
// ==========================================
app.use(...mcpay({
  price: '$0.01',
  walletAddress: MY_WALLET,
  toolName: 'weather-data',
  description: 'Real-time weather for any city'
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
  description: 'Summarize any webpage in 3 sentences'
}))

app.post('/tools/url-summarizer', async (req, res) => {
  const { url } = req.body
  res.json({
    url,
    summary: "This is a mock summary. It looks like you've successfully integrated MCPay! Your agent is now a consumer in the machine economy.",
    wordCount: 1250
  })
})

// ==========================================
// STATS ENDPOINT (Registry ke liye)
// ==========================================
app.get('/stats', (req, res) => {
  res.json(getStats())
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
      }
    ]
  })
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`\n\n🔧 MCPay Tool Server (CORS ENABLED) running on port ${PORT}`)
})
