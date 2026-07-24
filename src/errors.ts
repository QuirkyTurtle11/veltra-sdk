/** Error thrown when the Veltra API returns a non-2xx response. */
export class VeltraError extends Error {
  constructor(
    /** HTTP status code (401 bad key, 402 quota, 429 rate limit, 400 bad request, ...). */
    public readonly status: number,
    message: string,
    /** The API's machine-readable error code, if present (e.g. "VALIDATION_ERROR"). */
    public readonly code?: string,
    /** The API's request id, useful when contacting support. */
    public readonly requestId?: string
  ) {
    super(message)
    this.name = 'VeltraError'
  }
}

/**
 * Extract a useful message/code/requestId from an error response body. Veltra returns
 * `{ error: { code, message, requestId } }`; this also tolerates flat `{ error }` / `{ message }`
 * shapes so the SDK degrades gracefully against unexpected bodies.
 */
export function parseErrorBody(status: number, text: string): VeltraError {
  if (!text) return new VeltraError(status, `Request failed with status ${status}`)
  try {
    const json = JSON.parse(text) as {
      error?: string | { message?: string; code?: string; requestId?: string }
      message?: string
    }
    if (json.error && typeof json.error === 'object') {
      return new VeltraError(
        status,
        json.error.message ?? `Request failed with status ${status}`,
        json.error.code,
        json.error.requestId
      )
    }
    const message = (typeof json.error === 'string' ? json.error : json.message) ?? text
    return new VeltraError(status, message)
  } catch {
    return new VeltraError(status, text)
  }
}
