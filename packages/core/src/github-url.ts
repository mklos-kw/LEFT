import type { RepoName } from './types';

export interface GitHubRef {
  repo: RepoName;
  kind: 'pull' | 'issues';
  number: number;
}

const GITHUB_URL = /^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)\/(pull|issues)\/(\d+)/i;

/** GitHub numbers are GraphQL `Int`s; a larger one in a Jira link is a typo. */
const MAX_NUMBER = 2 ** 31 - 1;

export function normalizeRepo(repo: string): RepoName {
  return repo.trim().toLowerCase();
}

const REPO_NAME = /^[\w.-]+\/[\w.-]+$/;

/** Whether `repo` is a plain `owner/name` (also keeps search qualifiers out of queries). */
export function isRepoName(repo: string): boolean {
  return REPO_NAME.test(repo);
}

/** Parses a GitHub pull request or issue URL; returns null for anything else. */
export function parseGitHubUrl(url: string): GitHubRef | null {
  const match = GITHUB_URL.exec(url.trim());
  if (!match) return null;
  const [, owner, name, kind, digits] = match;
  const number = Number(digits);
  if (number < 1 || number > MAX_NUMBER) return null;
  return {
    repo: normalizeRepo(`${owner}/${name}`),
    kind: kind!.toLowerCase() as GitHubRef['kind'],
    number,
  };
}

export function prId(repo: RepoName, number: number): string {
  return `${normalizeRepo(repo)}#${number}`;
}
