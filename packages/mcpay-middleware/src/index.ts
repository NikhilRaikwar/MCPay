import { Request, Response, NextFunction } from 'express'
import { paymentMiddleware, x402ResourceServer } from '@x402/express'
import { ExactEvmScheme } from '@x402/evm/exact/server'
import { HTTPFacilitatorClient } from '@x402/core/server'

// ====================================
// MCPAY CONFIG TYPE
// ====================================
interface MCPayConfig {
  price: string              // e.g. "$0.01"
  walletAddress: `0x${string}` // tool developer ka wallet
  toolName: string           // tool ka naam
  description: string        // tool kya karta hai
  network?: `${string}:${string}`   // default: "eip155:84532" (Base Sepolia)
  facilitatorUrl?: string    // default: x402.org
  onPayment?: (stats: MCPayStats) => Promise<void> // NEW: Optional callback
}

export interface MCPayStats {
  toolName: string;
  totalCalls: number;
  totalEarned: number;
  lastCall: string;
}

const statsStore: Record<string, MCPayStats> = {}

export function mcpay(config: MCPayConfig) {
  const {
    price,
    walletAddress,
    toolName,
    description,
    network = 'eip155:84532' as const,
    facilitatorUrl = 'https://x402.org/facilitator'
  } = config

  const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl })
  const resourceServer = new x402ResourceServer(facilitatorClient)
    .register(network, new ExactEvmScheme() as any)

  if (!statsStore[toolName]) {
    statsStore[toolName] = {
      toolName,
      totalCalls: 0,
      totalEarned: 0,
      lastCall: new Date().toISOString()
    }
  }

  const toolEndpoint = `POST /tools/${toolName}`

  const x402Middleware = paymentMiddleware(
    {
      [toolEndpoint]: {
        accepts: [{
          scheme: 'exact' as any,
          price,
          network,
          payTo: walletAddress,
        }],
        description: `MCPay Tool: ${toolName} — ${description}`,
      } as any
    },
    resourceServer as any,
    {
      appName: 'MCPay',
      appLogo: 'https://mcpay.dev/logo.svg',
    }
  )

  const statsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res)
    res.json = (data: any) => {
      // ONLY track stats if it's the actual tool endpoint and it's a POST
      const currentPath = req.path.endsWith('/') ? req.path.slice(0, -1) : req.path
      const expectedPath = `/tools/${toolName}`
      
      if (res.statusCode === 200 && req.method === 'POST' && currentPath === expectedPath) {
        const stats = statsStore[toolName]
        stats.totalCalls += 1
        stats.totalEarned += parseFloat(price.replace('$', ''))
        stats.lastCall = new Date().toISOString()
        
        data = {
          ...data,
          _mcpay: {
            tool: toolName,
            paid: price,
            callNumber: stats.totalCalls
          }
        }
        
        console.log(`MCPay: ${toolName} earned ${price} | Total: $${stats.totalEarned.toFixed(4)}`)
        
        // Trigger onPayment callback (async, non-blocking)
        if (config.onPayment) {
            config.onPayment(stats).catch(e => console.error('onPayment error:', e))
        }
      }
      return originalJson(data)
    }
    next()
  }

  return [x402Middleware, statsMiddleware] as any
}

export function getStats(): MCPayStats[] {
  return Object.values(statsStore)
}

export function getToolStats(toolName: string): MCPayStats | undefined {
  return statsStore[toolName]
}
