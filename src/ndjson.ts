/**
 * Split a byte stream into complete newline-delimited text lines. Pure and transport-free so
 * the framing logic is unit-tested directly. Skips blank lines.
 */
export async function* readNdjsonLines(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const decoder = new TextDecoder()
  let buffer = ''
  // Node's ReadableStream is async-iterable at runtime; the cast keeps this portable across
  // TypeScript lib setups (DOM vs Node) that disagree on whether the type reflects that.
  for await (const chunk of body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true })
    let newlineIndex: number
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim()
      buffer = buffer.slice(newlineIndex + 1)
      if (line) yield line
    }
  }
  const tail = buffer.trim()
  if (tail) yield tail
}

/** Split an already-collected NDJSON string into non-empty lines. Convenience for tests. */
export function splitNdjson(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}
