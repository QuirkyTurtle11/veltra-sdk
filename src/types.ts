/** Public types for the Veltra SDK. */

/** A single buy or sell, exactly as the API returns it. */
export interface Trade {
  /** Transaction signature. */
  signature: string
  /** "buy" or "sell". */
  side: 'buy' | 'sell'
  /** Token symbol (e.g. "BONK"). */
  token: string
  /** Token mint address — a stable per-token key, since symbols can collide. */
  tokenMint: string | null
  /** SOL value of the trade (native token amount on non-Solana chains), or null if unknown. */
  amountSol: number | null
  /** Token quantity moved, or null if unknown. */
  amount: number | null
  /** DEX the trade executed on (e.g. "Raydium"). */
  dex: string
  /** ISO-8601 block time, or null if unknown. */
  blockTime: string | null
}

/** The terminal summary emitted once a wallet's history has been delivered. */
export interface HistorySummary {
  wallet: string
  /** true if the full history was captured; false if the wallet is large and still indexing. */
  complete: boolean
  /** Total number of trades for this wallet. */
  tradeCount: number
  /** ISO-8601 timestamp of the wallet's earliest trade, or null. */
  firstTrade: string | null
}

/** getHistory returns the summary plus every trade. */
export interface CollectedHistory extends HistorySummary {
  trades: Trade[]
}

/** One discrete page from the paginated mode. */
export interface HistoryPage {
  wallet: string
  complete: boolean
  tradeCount: number
  pageSize: number
  totalPages: number
  trades: Trade[]
  /** Present only when there are more pages; omitted at end-of-history. */
  cursor?: string
}

/** A wallet-size estimate from `estimate()`. */
export interface WalletEstimate {
  address: string
  estimateType: 'exact' | 'approximate'
  estimatedTradeCount: number
  estimatedSeconds: number
  sampleTrades?: Trade[]
}

export interface VeltraOptions {
  /** Your Veltra API key. Get one at https://veltrabot.com. */
  apiKey: string
  /** Override the API base URL. Defaults to https://veltrabot.com. */
  baseUrl?: string
  /** Inject a custom fetch (e.g. a proxy or a mock in tests). Defaults to the global fetch. */
  fetch?: typeof fetch
}

/** Per-call options for history requests. */
export interface HistoryOptions {
  /** The wallet address. */
  address: string
  /** Chain to query. Defaults to "solana". */
  chain?: string
  /** Resume a previously interrupted stream/pagination from its last cursor. */
  cursor?: string
}

export interface PageOptions extends HistoryOptions {
  /** Page size (floored to 1; no maximum). Defaults to 100. */
  limit?: number
}
