import { Request, Response, NextFunction } from 'express'
import { paymentMiddleware, x402ResourceServer } from '@x402/express'
import { ExactEvmScheme } from '@x402/evm/exact/server'
import { HTTPFacilitatorClient } from '@x402/core/server'
import { execSync } from 'child_process'

// ====================================
// TYPES
// ====================================
interface MCPayConfig {
  price: string | ((req: Request) => string)  // static '$0.01' or dynamic fn
  walletAddress: `0x${string}`
  toolName: string
  description: string
  network?: `${string}:${string}`         // default: 'eip155:84532' (Base Sepolia)
  facilitatorUrl?: string                  // default: x402.org
  onPayment?: (stats: MCPayStats) => Promise<void>
}

export interface MCPayStats {
  toolName: string
  totalCalls: number
  totalEarned: number
  lastCall: string
}

export interface MCPayFetchOptions extends RequestInit {
  owsWallet?: string   // OWS wallet name (default: 'mcpay-agent')
  maxPrice?: string    // OWS policy ceiling (default: '$1.00')
}

export interface MCPayFetchResult {
  data: any
  _mcpay?: {
    paid: string
    wallet: string
    network: string
  }
}

// ====================================
// STATS STORE
// ====================================
const statsStore: Record<string, MCPayStats> = {}

// ====================================
// mcpay() — SERVER MIDDLEWARE
// Wraps any Express route with x402 payment enforcement
// ====================================
export function mcpay(config: MCPayConfig) {
  const {
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

  // Resolve price — static string or dynamic function
  const resolvePrice = (req: Request): string => {
    return typeof config.price === 'function' ? config.price(req) : config.price
  }

  const toolEndpoint = `POST /tools/${toolName}`

  // Build x402 middleware with resolved static or dynamic price
  const staticPrice = typeof config.price === 'string' ? config.price : '$0.01'

  const x402Middleware = paymentMiddleware(
    {
      [toolEndpoint]: {
        accepts: [{
          scheme: 'exact' as any,
          price: staticPrice,
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

  // Stats + onPayment callback middleware
  const statsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res)
    res.json = (data: any) => {
      const currentPath = req.path.endsWith('/') ? req.path.slice(0, -1) : req.path
      const expectedPath = `/tools/${toolName}`
      const resolvedPrice = resolvePrice(req)

      if (res.statusCode === 200 && req.method === 'POST' && currentPath === expectedPath) {
        const stats = statsStore[toolName]
        stats.totalCalls += 1
        stats.totalEarned += parseFloat(resolvedPrice.replace('$', ''))
        stats.lastCall = new Date().toISOString()

        data = {
          ...data,
          _mcpay: {
            tool: toolName,
            paid: resolvedPrice,
            callNumber: stats.totalCalls,
            network,
            wallet: walletAddress
          }
        }

        console.log(`[MCPay] ${toolName} settled ${resolvedPrice} | Total: $${stats.totalEarned.toFixed(4)}`)

        // Fire onPayment callback (non-blocking)
        if (config.onPayment) {
          config.onPayment(stats).catch(e => console.error('[MCPay] onPayment error:', e))
        }
      }
      return originalJson(data)
    }
    next()
  }

  return [x402Middleware, statsMiddleware] as any
}

// ====================================
// mcpayFetch() — AGENT CLIENT
// Auto-handles x402 402 responses via OWS CLI
// ====================================
export async function mcpayFetch(
  url: string,
  options: MCPayFetchOptions = {}
): Promise<any> {
  const { owsWallet = 'mcpay-agent', maxPrice = '$1.00', ...fetchOptions } = options

  // Step 1: Initial request
  const res = await fetch(url, fetchOptions)

  // Step 2: If 402, trigger OWS CLI payment
  if (res.status === 402) {
    const x402Header = res.headers.get('x-payment-required') || ''

    try {
      // Parse amount from x402 header or use maxPrice as fallback
      const method = (fetchOptions.method || 'GET').toUpperCase()
      const bodyArg = fetchOptions.body ? `--body '${fetchOptions.body}'` : ''

      // Execute OWS payment via CLI
      execSync(
        `ows pay request ${url} --wallet ${owsWallet} --method ${method} ${bodyArg}`,
        { stdio: 'pipe' }
      )
    } catch (e: any) {
      throw new Error(`[mcpayFetch] OWS payment failed: ${e.message}`)
    }

    // Step 3: Retry original request after payment
    const retryRes = await fetch(url, fetchOptions)
    const data = await retryRes.json()
    return data
  }

  // No payment needed — return normally
  const data = await res.json()
  return data
}

// ====================================
// STATS EXPORTS
// ====================================
export function getStats(): MCPayStats[] {
  return Object.values(statsStore)
}

export function getToolStats(toolName: string): MCPayStats | undefined {
  return statsStore[toolName]
}

export function resetStats(toolName?: string): void {
  if (toolName) {
    delete statsStore[toolName]
  } else {
    Object.keys(statsStore).forEach(k => delete statsStore[k])
  }
}
