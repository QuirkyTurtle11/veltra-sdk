# veltra-sdk

The official TypeScript client for the [Veltra](https://veltrabot.com) wallet trade-history
API. Give it a wallet, get that wallet's complete buy/sell history — typed, streaming, and
multichain — without hand-rolling HTTP, NDJSON parsing, pagination, or error handling. Zero
runtime dependencies.

```ts
import { Veltra } from 'veltra-sdk'

const client = new Veltra({ apiKey: process.env.VELTRA_API_KEY! })

const { trades, tradeCount } = await client.getHistory({ address })
console.log(`${tradeCount} trades`)
```

## Install

```bash
npm install veltra-sdk
```

Requires Node.js 18+ (uses the built-in `fetch`). Get an API key at
[veltrabot.com](https://veltrabot.com).

## Usage

### Get a wallet's full history

```ts
const history = await client.getHistory({ address, chain: 'solana' })
// history: { wallet, complete, tradeCount, firstTrade, trades: Trade[] }
```

If `complete` is `false`, the wallet is large and still indexing — call again shortly for the rest.

### Stream it (process trades as they arrive)

```ts
for await (const trade of client.streamHistory({ address })) {
  console.log(trade.signature, trade.side, trade.amountSol)
}
```

`streamHistory` is an async generator: it yields each `Trade` and returns the final summary.

### Paginate

```ts
let cursor: string | undefined
do {
  const page = await client.getPage({ address, limit: 1000, cursor })
  handle(page.trades)
  cursor = page.cursor // absent once complete
} while (cursor)
```

### Estimate before fetching (no API key needed)

```ts
const [estimate] = await client.estimate([address])
console.log(estimate.estimatedTradeCount, estimate.estimateType)
```

### Multichain

Pass `chain` to any history call — Solana (default), every major EVM chain, and Tron:

```ts
await client.getHistory({ address: '0x...', chain: 'ethereum' })
```

## Each trade

```ts
interface Trade {
  signature: string
  side: 'buy' | 'sell'
  token: string
  tokenMint: string | null // stable per-token key (symbols collide)
  amountSol: number | null // SOL value (native token amount off Solana)
  amount: number | null // token quantity
  dex: string
  blockTime: string | null
}
```

## Errors

Non-2xx responses throw a typed `VeltraError`:

```ts
import { VeltraError } from 'veltra-sdk'

try {
  await client.getHistory({ address })
} catch (err) {
  if (err instanceof VeltraError) {
    console.error(err.status, err.code, err.message) // e.g. 401 INVALID_SESSION
  }
}
```

| Status | Meaning |
| --- | --- |
| 400 | Bad request (e.g. malformed address) |
| 401 | Missing or invalid API key |
| 402 | Plan quota exhausted |
| 429 | Rate limited |

## Configuration

```ts
new Veltra({
  apiKey: '...',
  baseUrl: 'https://veltrabot.com', // override if needed
  fetch: customFetch, // inject a proxy or a mock (defaults to global fetch)
})
```

## License

MIT
