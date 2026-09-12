/**
 * Fetch a wallet's complete trade history.
 *
 *   VELTRA_API_KEY=your-key npx tsx examples/get-history.ts <wallet-address>
 */

import { Veltra } from '../src/index.js'

const apiKey = process.env.VELTRA_API_KEY
if (!apiKey) {
  console.error('Set VELTRA_API_KEY (get one at https://veltradata.io).')
  process.exit(1)
}
const address = process.argv[2] ?? process.env.WALLET
if (!address) {
  console.error('Usage: npx tsx examples/get-history.ts <wallet-address>')
  process.exit(1)
}

const client = new Veltra({ apiKey })
const history = await client.getHistory({ address, chain: process.env.CHAIN })

console.log(`${history.wallet}: ${history.tradeCount} trades (complete: ${history.complete})`)
console.log('First few:')
for (const t of history.trades.slice(0, 5)) {
  console.log(`  ${t.side.padEnd(4)} ${t.amountSol ?? '?'} SOL  ${t.token}  on ${t.dex}`)
}
