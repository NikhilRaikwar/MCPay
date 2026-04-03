# mcpay

> The native monetization layer for Model Context Protocol (MCP) tool servers.

Wrap any Express route with **x402 micropayment enforcement** in 3 lines. Agents pay automatically via **OWS CLI**. Settlements land on **Base Sepolia** as real USDC. No API keys, no accounts, no subscriptions.

```bash
npm install @nikhilraikwar/mcpay
```

---

## Server — `mcpay()` Middleware

Wraps any Express route. Returns HTTP 402 with x402 headers when an unpaid agent calls. On payment, executes the tool and tracks earnings.

```typescript
import express from 'express'
import { mcpay, getStats } from 'mcpay'

const app = express()
app.use(express.json())

// ── Fixed price tool ─────────────────────────────────────
app.use(...mcpay({
  price: '$0.01',
  walletAddress: '0xYourWallet' as `0x${string}`,
  toolName: 'weather-data',
  description: 'Real-time weather for any city',
  onPayment: async (stats) => {
    console.log(`Earned ${stats.totalEarned} USDC so far`)
    // Fire XMTP notification, update DB, trigger webhook, etc.
  }
}))

app.post('/tools/weather-data', (req, res) => {
  res.json({ city: req.body.city, temperature: '28°C' })
})

// ── Dynamic price — per model ─────────────────────────────
const MODEL_PRICES: Record<string, string> = {
  'claude-opus-4-6':   '$0.05',
  'gpt-4o':            '$0.03',
  'claude-sonnet-4-6': '$0.02',
  'gemini-2.0-flash':  '$0.005',
  'llama-3.3-70b':     '$0.001',
}

app.use(...mcpay({
  price: (req) => MODEL_PRICES[req.body.model] ?? '$0.01',
  walletAddress: '0xYourWallet' as `0x${string}`,
  toolName: 'ai-inference',
  description: 'Pay-per-inference via AIML API',
}))

// ── Stats endpoint ────────────────────────────────────────
app.get('/stats', (req, res) => res.json(getStats()))

app.listen(3001)
```

### What `mcpay()` Returns

`mcpay()` returns `[x402Middleware, statsMiddleware]` — spread directly into `app.use()`.

| Middleware | Role |
|---|---|
| `x402Middleware` | Intercepts every POST, returns HTTP 402 with OWS wallet + USDC amount headers if unpaid |
| `statsMiddleware` | On successful response (200): increments `totalCalls`, adds `totalEarned`, appends `_mcpay` receipt to JSON, fires `onPayment` |

### Every Response Gets a Receipt

```json
{
  "city": "Delhi",
  "temperature": "28°C",
  "_mcpay": {
    "tool": "weather-data",
    "paid": "$0.01",
    "callNumber": 7,
    "network": "eip155:84532",
    "wallet": "0x2e44..."
  }
}
```

---

## Client — `mcpayFetch()`

Agent-side fetch wrapper. Automatically handles HTTP 402 responses by triggering OWS CLI payment, then retries the original request.

```typescript
import { mcpayFetch } from 'mcpay'

// Automatically pays if 402 received, retries, returns result
const result = await mcpayFetch('http://localhost:3001/tools/weather-data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ city: 'Delhi' }),
  owsWallet: 'mcpay-agent',  // OWS wallet name
  maxPrice: '$0.05'           // OWS policy ceiling
})

// → { city: 'Delhi', temperature: '28°C', _mcpay: { paid: '$0.01' } }
```

### Flow
1. Send POST to tool endpoint
2. If 402 → call `ows pay request <url> --wallet <name>` via OWS CLI
3. OWS evaluates spend policy, signs USDC transfer on Base Sepolia
4. Retry original request with payment proof
5. Return result (includes `_mcpay` receipt)

---

## Config Reference

### `mcpay(config)`

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `price` | `string \| (req) => string` | ✅ | — | Payment amount e.g. `'$0.01'` or dynamic fn |
| `walletAddress` | `` `0x${string}` `` | ✅ | — | Your OWS tool wallet address |
| `toolName` | `string` | ✅ | — | Tool identifier, must match route `/tools/<toolName>` |
| `description` | `string` | ✅ | — | Human-readable tool description |
| `network` | `string` | ❌ | `'eip155:84532'` | Chain (Base Sepolia) |
| `facilitatorUrl` | `string` | ❌ | `'https://x402.org/facilitator'` | x402 payment verifier |
| `onPayment` | `(stats) => Promise<void>` | ❌ | — | Callback after each settlement |

### `mcpayFetch(url, options)`

Extends standard `fetch` options with:

| Field | Type | Default | Description |
|---|---|---|---|
| `owsWallet` | `string` | `'mcpay-agent'` | OWS wallet name to pay from |
| `maxPrice` | `string` | `'$1.00'` | Maximum price agent will pay |

### `getStats()`

Returns array of `MCPayStats` for all registered tools:

```typescript
interface MCPayStats {
  toolName: string
  totalCalls: number
  totalEarned: number   // in USD
  lastCall: string      // ISO timestamp
}
```

---

## Integrations

### XMTP Notifications via `onPayment`

```typescript
import { sendPaymentAlert } from './xmtp-notifier'

app.use(...mcpay({
  price: '$0.01',
  walletAddress: '0xYourWallet' as `0x${string}`,
  toolName: 'weather-data',
  description: 'Weather tool',
  onPayment: async (stats) => {
    await sendPaymentAlert({
      toAddress: '0xAgentWallet',
      toolName: stats.toolName,
      amount: '$0.01',
      txHash: 'live'
    })
  }
}))
```

---

## How x402 Works

```
Agent POST /tools/weather-data
         │
         ▼
   [mcpay middleware]
   Return HTTP 402
   x-payment-required: amount=$0.01 network=eip155:84532 payTo=0x2e44...
         │
         ▼ (OWS CLI intercepts)
   ows pay request http://... --wallet mcpay-agent
   → signs USDC transfer on Base Sepolia
   → broadcasts tx
         │
         ▼
   Agent retries POST with payment header
         │
         ▼
   [x402 facilitator verifies on-chain]
   Tool executes → returns result + _mcpay receipt
```

---

## License

MIT — see [LICENSE](../../LICENSE)
