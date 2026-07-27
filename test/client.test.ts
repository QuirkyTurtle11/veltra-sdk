import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Veltra } from '../src/client.js'
import { VeltraError, parseErrorBody } from '../src/errors.js'
import { splitNdjson } from '../src/ndjson.js'
import type { Trade } from '../src/types.js'

function trade(over: Partial<Trade> = {}): Trade {
  return {
    signature: 'sig1',
    side: 'buy',
    token: 'BONK',
    tokenMint: 'DezXmint',
    amountSol: 1.5,
    amount: 1000,
    dex: 'Raydium',
    blockTime: '2026-01-01T00:00:00Z',
    ...over,
  }
}

/** A fetch stub that returns a fixed Response and records the URL it was called with. */
function stubFetch(response: Response) {
  const calls: string[] = []
  const fn = (async (url: URL | string) => {
    calls.push(url.toString())
    return response
  }) as unknown as typeof fetch
  return { fn, calls }
}

test('constructor requires an apiKey', () => {
  assert.throws(() => new Veltra({ apiKey: '' }), /apiKey is required/)
})

test('parseErrorBody extracts nested code/message/requestId', () => {
  const err = parseErrorBody(
    400,
    JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'bad address', requestId: 'r1' } })
  )
  assert.equal(err.status, 400)
  assert.equal(err.message, 'bad address')
  assert.equal(err.code, 'VALIDATION_ERROR')
  assert.equal(err.requestId, 'r1')
})

test('parseErrorBody tolerates flat and non-JSON bodies', () => {
  assert.equal(parseErrorBody(500, JSON.stringify({ message: 'oops' })).message, 'oops')
  assert.equal(parseErrorBody(502, 'Bad Gateway').message, 'Bad Gateway')
})

test('splitNdjson drops blank lines', () => {
  assert.deepEqual(splitNdjson('a\n\n b \n'), ['a', 'b'])
})

test('getPage sends limit and returns the JSON page', async () => {
  const page = { wallet: 'W', complete: false, tradeCount: 5, pageSize: 2, totalPages: 3, trades: [trade()], cursor: 'c1' }
  const { fn, calls } = stubFetch(new Response(JSON.stringify(page), { status: 200 }))
  const client = new Veltra({ apiKey: 'k', fetch: fn })
  const result = await client.getPage({ address: 'W', limit: 2 })
  assert.equal(result.cursor, 'c1')
  assert.equal(result.trades.length, 1)
  assert.match(calls[0], /\/v1\/wallets\/W\/history\?limit=2/)
})

test('getHistory parses an NDJSON stream into trades + summary', async () => {
  const body =
    JSON.stringify({ trades: [trade({ signature: 'a' }), trade({ signature: 'b' })] }) +
    '\n' +
    JSON.stringify({ complete: true, tradeCount: 2, wallet: 'W', firstTrade: '2026-01-01T00:00:00Z' }) +
    '\n'
  const { fn } = stubFetch(new Response(body, { status: 200 }))
  const client = new Veltra({ apiKey: 'k', fetch: fn })
  const history = await client.getHistory({ address: 'W' })
  assert.equal(history.complete, true)
  assert.equal(history.tradeCount, 2)
  assert.deepEqual(history.trades.map((t) => t.signature), ['a', 'b'])
})

test('a non-ok response throws a typed VeltraError', async () => {
  const { fn } = stubFetch(
    new Response(JSON.stringify({ error: { code: 'INVALID_SESSION', message: 'Invalid or inactive API key' } }), {
      status: 401,
    })
  )
  const client = new Veltra({ apiKey: 'bad', fetch: fn })
  await assert.rejects(client.getHistory({ address: 'W' }), (err: unknown) => {
    assert.ok(err instanceof VeltraError)
    assert.equal(err.status, 401)
    assert.equal(err.code, 'INVALID_SESSION')
    return true
  })
})

test('chain is passed through as a query param', async () => {
  const { fn, calls } = stubFetch(new Response(JSON.stringify({ wallet: 'W', complete: true, tradeCount: 0, pageSize: 1, totalPages: 0, trades: [] }), { status: 200 }))
  const client = new Veltra({ apiKey: 'k', fetch: fn })
  await client.getPage({ address: 'W', chain: 'ethereum', limit: 1 })
  assert.match(calls[0], /chain=ethereum/)
})
