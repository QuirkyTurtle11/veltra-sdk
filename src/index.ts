/**
 * veltra-sdk — official TypeScript client for the Veltra wallet trade-history API.
 */

export { Veltra } from './client.js'
export { VeltraError } from './errors.js'
export type {
  Trade,
  HistorySummary,
  CollectedHistory,
  HistoryPage,
  WalletEstimate,
  VeltraOptions,
  HistoryOptions,
  PageOptions,
} from './types.js'
