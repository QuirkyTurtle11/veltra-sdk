/**
 * Estimate how big a wallet is before fetching it (no API key required).
 *
 *   npx tsx examples/estimate.ts <wallet-address>
 */

import { Veltra } from '../src/index.js'

const address = process.argv[2] ?? process.env.WALLET
if (!address) {
  console.error('Usage: npx tsx examples/estimate.ts <wallet-address>')
  process.exit(1)
}

// estimate() needs no auth, but the client still wants an apiKey; a placeholder is fine here.
const client = new Veltra({ apiKey: process.env.VELTRA_API_KEY ?? 'none' })
const [est] = await client.estimate([address])

console.log(`${est.address}`)
console.log(`  ~${est.estimatedTradeCount} trades (${est.estimateType})`)
console.log(`  estimated fetch time: ~${est.estimatedSeconds}s`)
