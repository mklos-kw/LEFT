/** A module's pinned version in a go.mod file. */
export interface GoModPin {
  version: string;
  /** The commit SHA embedded in a pseudo-version (`vX.Y.Z-yyyymmddhhmmss-<12 hex>`); null for a plain tag. */
  commitSha: string | null;
}

const PSEUDO_VERSION_SHA = /-([0-9a-f]{12})$/;

/**
 * The version `modulePath` is pinned to in a go.mod file's text, from its
 * `require` line (single-line or inside a `require (...)` block). A
 * `replace` directive for the same module overrides it, as it would for `go build`.
 * Returns null if the module isn't required at all.
 */
export function parseGoModPin(goMod: string, modulePath: string): GoModPin | null {
  const escaped = modulePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const replaceMatch = new RegExp(`^replace\\s+${escaped}\\s*=>\\s*\\S+\\s+(\\S+)`, 'm').exec(goMod);
  const requireMatch = new RegExp(`^\\s*(?:require\\s+)?${escaped}\\s+(\\S+)`, 'm').exec(goMod);
  const version = replaceMatch?.[1] ?? requireMatch?.[1];
  if (!version) return null;
  const pseudo = PSEUDO_VERSION_SHA.exec(version);
  return { version, commitSha: pseudo?.[1] ?? null };
}
