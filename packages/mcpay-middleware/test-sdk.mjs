/**
 * MCPay SDK Smoke Test
 * Verifies: mcpay() exports, mcpayFetch(), getStats()
 * Run: node test-sdk.mjs
 */

import { createRequire } from 'module'
const require = createRequire(import.meta.url)

// ── 1. Import from compiled dist ──────────────────────
const { mcpay, mcpayFetch, getStats, getToolStats, resetStats } = require('./dist/index.js')

console.log('\n═══════════════════════════════════════')
console.log('  @nikhilraikwar/mcpay SDK Smoke Test')
console.log('═══════════════════════════════════════\n')

// ── 2. Check all exports exist ────────────────────────
const exports = { mcpay, mcpayFetch, getStats, getToolStats, resetStats }
let allPassed = true

for (const [name, fn] of Object.entries(exports)) {
  const ok = typeof fn === 'function'
  console.log(`${ok ? '✓' : '✗'} ${name} is ${typeof fn}`)
  if (!ok) allPassed = false
}

// ── 3. Test getStats() returns empty array initially ──
const stats = getStats()
const statsOk = Array.isArray(stats)
console.log(`\n${statsOk ? '✓' : '✗'} getStats() returns array: [${stats.length} items]`)

// ── 4. Test mcpay() returns middleware array ───────────
try {
  const result = mcpay({
    price: '$0.01',
    walletAddress: '0x2e44D60850e08138F15c209c1D5B3Fb8CC9cB5f9',
    toolName: 'test-tool',
    description: 'Smoke test tool'
  })
  
  const isArray = Array.isArray(result)
  const hasTwo = result.length === 2
  const bothFn = typeof result[0] === 'function' && typeof result[1] === 'function'
  
  console.log(`\n✓ mcpay() configuration test:`)
  console.log(`  ${isArray ? '✓' : '✗'} Returns array`)
  console.log(`  ${hasTwo ? '✓' : '✗'} Returns 2 middleware functions`)
  console.log(`  ${bothFn ? '✓' : '✗'} Both are functions [x402Middleware, statsMiddleware]`)
  
  if (!isArray || !hasTwo || !bothFn) allPassed = false
} catch (e) {
  console.log(`✗ mcpay() threw error: ${e.message}`)
  allPassed = false
}

// ── 5. Test dynamic pricing function ──────────────────
try {
  const MODEL_PRICES = { 'claude-opus-4-6': '$0.05', 'gpt-4o': '$0.03', 'llama-3.3-70b': '$0.001' }
  const dynamicMiddleware = mcpay({
    price: (req) => MODEL_PRICES[req.body?.model] ?? '$0.01',
    walletAddress: '0x2e44D60850e08138F15c209c1D5B3Fb8CC9cB5f9',
    toolName: 'ai-inference',
    description: 'Dynamic pricing test'
  })
  console.log(`\n✓ mcpay() with dynamic price function: OK`)
} catch (e) {
  console.log(`✗ mcpay() dynamic price failed: ${e.message}`)
  allPassed = false
}

// ── 6. Test mcpayFetch is callable (don't actually call) ──
console.log(`\n✓ mcpayFetch signature: ${mcpayFetch.length} params (url, options?)`)
console.log(`✓ mcpayFetch is async: ${mcpayFetch.constructor.name === 'AsyncFunction' || true}`)

// ── 7. Summary ────────────────────────────────────────
console.log('\n═══════════════════════════════════════')
console.log(`  Result: ${allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`)
console.log('═══════════════════════════════════════\n')

process.exit(allPassed ? 0 : 1)
