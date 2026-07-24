/**
 * The Veltra client. Wraps the wallet trade-history API so you never hand-roll fetch calls,
 * NDJSON parsing, pagination, or error handling.
 *
 *   const client = new Veltra({ apiKey })
 *   const { trades } = await client.getHistory({ address })
 */

import { parseErrorBody, VeltraError } from './errors.js'
import { readNdjsonLines } from './ndjson.js'
import type {
  Trade,
  HistorySummary,
  CollectedHistory,
  HistoryPage,
  WalletEstimate,
  VeltraOptions,
  HistoryOptions,
  PageOptions,
} from './types.js'

const DEFAULT_BASE_URL = 'https://veltrabot.com'

export class Veltra {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: VeltraOptions) {
    if (!options.apiKey) {
      throw new Error('Veltra: apiKey is required. Get one at https://veltrabot.com')
    }
    this.apiKey = options.apiKey
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')
    this.fetchImpl = options.fetch ?? globalThis.fetch
  }

  /**
   * Stream a wallet's complete history, yielding each trade as it arrives and returning the
   * terminal summary. Use this to process trades incrementally (e.g. show progress on a huge
   * wallet) instead of buffering them all.
   */
  async *streamHistory(options: HistoryOptions): AsyncGenerator<Trade, HistorySummary, void> {
    const url = this.historyUrl(options)
    const res = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: 'application/x-ndjson' },
    })
    if (!res.ok || !res.body) {
      throw await this.toError(res)
    }

    let summary: HistorySummary | null = null
    for await (const line of readNdjsonLines(res.body)) {
      const record = JSON.parse(line) as StreamRecord
      if (Array.isArray(record.trades)) {
        for (const trade of record.trades) yield trade
      }
      if (typeof record.complete === 'boolean') {
        summary = {
          wallet: record.wallet ?? options.address,
          complete: record.complete,
          tradeCount: record.tradeCount ?? 0,
          firstTrade: record.firstTrade ?? null,
        }
      }
    }
    return summary ?? { wallet: options.address, complete: false, tradeCount: 0, firstTrade: null }
  }

  /**
   * Fetch a wallet's complete history and return every trade in one array plus the summary.
   * Convenient for analysis where you want the whole dataset up front.
   */
  async getHistory(options: HistoryOptions): Promise<CollectedHistory> {
    const trades: Trade[] = []
    const iterator = this.streamHistory(options)
    let next = await iterator.next()
    while (!next.done) {
      trades.push(next.value)
      next = await iterator.next()
    }
    return { ...next.value, trades }
  }

  /**
   * Fetch a single discrete page instead of streaming. With no cursor you get the newest
   * `limit` trades; pass the returned `cursor` back to walk older pages until `cursor` is
   * absent (which happens only when `complete` is true).
   */
  async getPage(options: PageOptions): Promise<HistoryPage> {
    const url = this.historyUrl(options, options.limit ?? 100)
    const res = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${this.apiKey}`, Accept: 'application/json' },
    })
    if (!res.ok) throw await this.toError(res)
    return (await res.json()) as HistoryPage
  }

  /**
   * Cheaply probe how many trades one or more wallets have — and get a few sample trades —
   * before committing to a full fetch. No API key required (IP-rate-limited).
   */
  async estimate(addresses: string[], chain?: string): Promise<WalletEstimate[]> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/billing/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addresses, ...(chain ? { chain } : {}) }),
    })
    if (!res.ok) throw await this.toError(res)
    const json = (await res.json()) as { addresses: WalletEstimate[] }
    return json.addresses
  }

  private historyUrl(options: HistoryOptions, limit?: number): URL {
    const url = new URL(`${this.baseUrl}/v1/wallets/${options.address}/history`)
    if (options.chain) url.searchParams.set('chain', options.chain)
    if (limit !== undefined) url.searchParams.set('limit', String(limit))
    if (options.cursor) url.searchParams.set('cursor', options.cursor)
    return url
  }

  private async toError(res: Response): Promise<VeltraError> {
    const text = await res.text().catch(() => '')
    return parseErrorBody(res.status, text)
  }
}

interface StreamRecord {
  trades?: Trade[]
  wallet?: string
  complete?: boolean
  tradeCount?: number
  firstTrade?: string | null
}
