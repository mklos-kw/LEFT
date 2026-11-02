import { afterEach, describe, expect, it, vi } from 'vitest';
import { GitHubClient } from './client';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('GitHubClient.repoInfo', () => {
  it('keeps a branch without a branch point when GitHub cannot compare it', async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        urls.push(url);
        if (url.endsWith('/graphql')) {
          return json(200, {
            data: {
              repository: {
                defaultBranchRef: { name: 'master' },
                b0: { name: 'stable-9.0' },
                b1: { name: 'release/legacy' },
              },
            },
          });
        }
        if (url.includes('stable-9.0')) {
          return json(200, {
            merge_base_commit: { commit: { committer: { date: '2026-10-12T09:51:14Z' } } },
          });
        }
        return json(404, { message: 'No common ancestor' });
      }),
    );

    const info = await new GitHubClient('token').repoInfo('owncloud/ocis', [
      'stable-9.0',
      'release/legacy',
    ]);

    expect(info.branches).toEqual(['stable-9.0', 'release/legacy']);
    expect(info.branchPoints).toEqual({ 'stable-9.0': '2026-10-12T09:51:14Z' });
    // Slashes in branch names stay path separators.
    expect(urls).toContain(
      'https://api.github.com/repos/owncloud/ocis/compare/master...release/legacy?per_page=1',
    );
  });
});

describe('GitHubClient.searchPullRequests', () => {
  it('fails instead of returning no PRs when one search in a batch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        json(200, {
          data: { s0: { nodes: [] }, s1: null },
          errors: [{ message: 'secondary rate limit', path: ['s1'] }],
        }),
      ),
    );
    await expect(
      new GitHubClient('token').searchPullRequests([
        'repo:a/b is:pr "X-1"',
        'repo:a/b is:pr "X-2"',
      ]),
    ).rejects.toThrow(/secondary rate limit/);
  });
});
