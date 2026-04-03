# @nikhilraikwar/mcpay

[![NPM Version](https://img.shields.io/npm/v/@nikhilraikwar/mcpay?style=flat&color=cc3534&logo=npm)](https://www.npmjs.com/package/@nikhilraikwar/mcpay)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **The Native Monetization Layer for MCP Tool Servers.**

Wrap any **Express** route with **x402 micropayment enforcement** in 3 lines. Your agents will pay automatically via **OWS CLI**. Settlements land on **Base Sepolia** as real on-chain USDC. No API keys, no subscriptions, no accounts.

```bash
npm install @nikhilraikwar/mcpay
```

---

## Server — `mcpay()` Middleware

Wraps any Express route. Returns **HTTP 402 Payment Required** with x402 headers describing the payment amount, destination wallet, and chain ID. Only after successful on-chain settlement will the request be allowed through to your tool logic.

```typescript
import express from 'express'
import { mcpay, getStats } from '@nikhilraikwar/mcpay'

const app = express()
app.use(express.json())

// 1. Configure the mcpay middleware
app.use(...mcpay({
  price:         '$0.01',                       // Fixed price ($0.01 USDC)
  walletAddress: '0xYourWallet' as `0x${string}`, // Tool developer wallet
  toolName:      'weather-data',                // Endpoint identifier
  description:   'Real-time weather data',
  onPayment: async (stats) => {
    // Optional: Send XMTP alert, update DB, or trigger webhooks
    console.log(`Tool '${stats.toolName}' has earned ${stats.totalEarned} USDC`)
  }
}))

// 2. Define your tool endpoint normally
app.post('/tools/weather-data', (req, res) => {
  res.json({ city: req.body.city, temp: '26°C' })
})

// 3. Optional: Expose stats to your dashboard
app.get('/stats', (req, res) => res.json(getStats()))

app.listen(3001)
```

### Dynamic Pricing Support
You can pass a function to `price` to resolve the cost per request (e.g., higher price for complex AI models):

```typescript
app.use(...mcpay({
  price: (req) => req.body.model === 'claude-opus' ? '$0.05' : '$0.005',
  walletAddress: '0x...',
  toolName: 'ai-inference',
  description: 'Dynamic price inference'
}))
```

---

## Client — `mcpayFetch()`

The agent-side fetch wrapper. It automatically handles **HTTP 402** challenges by triggering the **OWS CLI** to sign and broadcast the payment, then retries the original request autonomously.

```typescript
import { mcpayFetch } from '@nikhilraikwar/mcpay'

// 1. Initialize call on a protected tool endpoint
// 2. If 402, triggers OWS CLI `ows pay request`
// 3. Retries and returns the result upon settlement
const result = await mcpayFetch('http://localhost:3001/tools/weather-data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ city: 'Delhi' }),
  owsWallet: 'mcpay-agent',  // OWS CLI wallet name
  maxPrice: '$0.05'           // Spend policy check (max budget)
})

console.log('Agent Result:', result)
```

### How it works
1. **Initial Call**: `mcpayFetch` sends the POST request.
2. **402 Challenge**: Server responds with 402 and x402 payment headers.
3. **OWS Payment**: SDK executes `ows pay request` via CLI (evaluating spend policies).
4. **Resubmit**: Once settlement is confirmed, the SDK resubmits the original POST.
5. **Execution**: Server verifies payment and returns the tool output.

---

## Reference Guide

### `mcpay(config)` Options

| Option | Type | Required? | Description |
|---|---|---|---|
| `price` | `string \| (req) => string` | ✅ | Static or dynamic price (e.g., `'$0.01'`) |
| `walletAddress` | `0x${string}` | ✅ | Dashboard/Tool owner destination wallet |
| `toolName` | `string` | ✅ | Must match tool path `/tools/<toolName>` |
| `description` | `string` | ✅ | Descriptive text for x402 headers |
| `network` | `string` | ❌ | Default: `eip155:84532` (Base Sepolia) |
| `onPayment` | `(stats) => void` | ❌ | Callback fired after successful verification |

---

## Features Table

| Feature | Support |
|---|---|
| **x402 Protocol v2** | ✅ Native |
| **OWS CLI Integration** | ✅ Native |
| **Dynamic Pricing** | ✅ Supported |
| **Stats Monitoring** | ✅ Included |
| **Base Sepolia (USDC)** | ✅ Default |
| **EIP-155 Signing** | ✅ Handled via OWS |

---

## License

MIT — Copyright © 2026 Nikhil Raikwar. See the [LICENSE](../../LICENSE) file for details.
