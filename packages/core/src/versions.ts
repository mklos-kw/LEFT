import { escapeRegExp } from './keys';

/** Placeholders `{major}` and `{minor}` are replaced with the fixVersion's numbers. */
export const DEFAULT_BRANCH_TEMPLATE = 'stable-{major}.{minor}';

const VERSION = /(\d+)\.(\d+)(?:\.\d+)?/;

/**
 * Maps a Jira fixVersion to the stable branch it must be backported to.
 * Versions without a number (e.g. "Ghez") are released from the default
 * branch and need no backport, so they map to null.
 *
 *   "Frances - 9.0.0"   -> "stable-9.0"
 *   "Curie S9 - 8.0.10" -> "stable-8.0"
 *   "Ghez"              -> null
 */
export function backportBranchFor(
  fixVersion: string,
  template: string = DEFAULT_BRANCH_TEMPLATE,
): string | null {
  const match = VERSION.exec(fixVersion);
  if (!match) return null;
  const [, major, minor] = match;
  return template.replace('{major}', major!).replace('{minor}', minor!);
}

/**
 * Whether `branch` is a release branch per `template`, e.g. `stable-9.0` for
 * `stable-{major}.{minor}`. PRs into other non-default branches (feature
 * branches, stacked PRs) are not backports.
 */
export function isReleaseBranch(
  branch: string,
  template: string = DEFAULT_BRANCH_TEMPLATE,
): boolean {
  const pattern = template
    .split(/(\{major\}|\{minor\})/)
    .map((part) => (part === '{major}' || part === '{minor}' ? '\\d+' : escapeRegExp(part)))
    .join('');
  return new RegExp(`^${pattern}$`).test(branch);
}

export function backportBranchesFor(fixVersions: string[], template?: string): string[] {
  const branches = fixVersions
    .map((version) => backportBranchFor(version, template))
    .filter((branch): branch is string => branch !== null);
  return [...new Set(branches)];
}

/**
 * The `major.minor` family a Jira fixVersion belongs to, e.g.
 * "Curie S9 - 8.0.10" -> "8.0". Versions without a number (e.g. "Ghez")
 * belong to no family.
 */
export function versionFamily(fixVersion: string): string | null {
  const number = versionNumber(fixVersion);
  return number ? number.split('.', 2).join('.') : null;
}

/**
 * The exact `major.minor[.patch]` number in a Jira fixVersion, e.g.
 * "Curie S9 - 8.0.10" -> "8.0.10". Versions without a number map to null,
 * same as `versionFamily`.
 */
export function versionNumber(fixVersion: string): string | null {
  return VERSION.exec(fixVersion)?.[0] ?? null;
}

/**
 * The codename in a Jira fixVersion, e.g. "Curie S9 - 8.0.10" -> "Curie S9".
 * Versions with no " - " separator (e.g. "8.2" or "Ghez") have none.
 */
export function versionCodename(fixVersion: string): string | null {
  const [codename, rest] = fixVersion.split(' - ', 2);
  return rest && codename ? codename : null;
}
