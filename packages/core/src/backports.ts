import { normalizeRepo } from './github-url';
import type { RepoName } from './types';

/**
 * Matches the ways backport PRs reference their origin, e.g.
 *   "backports: https://github.com/owncloud/ocis/pull/13233"
 *   "Backport of #13231 to stable-9.0."
 *   "This pull request is a backport of #13250"
 *   "Backports #13081 onto `stable-8.2`."
 */
const BACKPORT_REF =
  /\bback-?ports?(?:ed)?(?:\s+of)?\s*:?\s*(?:https?:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/pull\/|#)(\d+)/gi;

/** Returns the numbers of the PRs in `repo` that `text` claims to backport. */
export function parseBackportOf(text: string, repo: RepoName): number[] {
  const numbers = new Set<number>();
  for (const match of text.matchAll(BACKPORT_REF)) {
    const [, linkedRepo, number] = match;
    if (linkedRepo && normalizeRepo(linkedRepo) !== normalizeRepo(repo)) continue;
    numbers.add(Number(number));
  }
  return [...numbers];
}
