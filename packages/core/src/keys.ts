export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Returns the unique Jira keys of `projectKey` found in `text`, upper-cased.
 * Matches case-insensitively, so branch names like `fix/ocisdev-840` count.
 * Only letters and digits glue onto a key; `_`, `/` and `-` separate it, so
 * `ocisdev-840_fix` matches but `XOCISDEV-12` does not.
 */
export function extractKeys(text: string, projectKey: string): string[] {
  const pattern = new RegExp(
    `(?<![A-Za-z0-9])${escapeRegExp(projectKey)}-\\d+(?![A-Za-z0-9])`,
    'gi',
  );
  const keys = new Set<string>();
  for (const match of text.matchAll(pattern)) {
    keys.add(match[0].toUpperCase());
  }
  return [...keys];
}
