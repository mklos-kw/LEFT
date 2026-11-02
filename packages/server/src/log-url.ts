/** Query parameters that must not end up in logs (OAuth callbacks carry them). */
const SECRET_PARAMS = ['code', 'state'];

/** `url` (path + query) with secret query values replaced, for request logs. */
export function redactUrl(url: string): string {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) return url;
  const params = new URLSearchParams(url.slice(queryStart + 1));
  if (!SECRET_PARAMS.some((name) => params.has(name))) return url;
  for (const name of SECRET_PARAMS) {
    if (params.has(name)) params.set(name, 'REDACTED');
  }
  return `${url.slice(0, queryStart)}?${params}`;
}
