import { UpstreamError, type Provider } from './errors';

/** A hanging Jira or GitHub request must not keep a report (and its stream) open forever. */
const TIMEOUT_MS = 30_000;

export interface RequestOptions {
  headers?: Record<string, string>;
  /** Sent as a JSON body. */
  json?: unknown;
}

export async function requestJson<T>(
  provider: Provider,
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
  if (options.json !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.json === undefined ? 'GET' : 'POST',
      headers,
      body: options.json === undefined ? undefined : JSON.stringify(options.json),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new UpstreamError(provider, 504, url, `No answer within ${TIMEOUT_MS / 1000}s`);
    }
    throw error;
  }
  if (!response.ok) {
    throw new UpstreamError(provider, response.status, url, await response.text());
  }
  return (await response.json()) as T;
}
