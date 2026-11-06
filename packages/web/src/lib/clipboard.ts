/** Pretty-prints `value` and writes it to the clipboard. */
export function copyJson(value: unknown): Promise<void> {
  return navigator.clipboard.writeText(JSON.stringify(value, null, 2));
}
