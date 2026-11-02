import { describe, expect, it } from 'vitest';
import { parseGitHubUrl } from './github-url';

describe('parseGitHubUrl', () => {
  it('parses pull request and issue URLs', () => {
    expect(parseGitHubUrl('https://github.com/OwnCloud/ocis/pull/13024/files')).toEqual({
      repo: 'owncloud/ocis',
      kind: 'pull',
      number: 13024,
    });
    expect(parseGitHubUrl('https://github.com/owncloud/ocis/issues/7')?.kind).toBe('issues');
  });

  it('rejects other URLs', () => {
    expect(parseGitHubUrl('https://example.com/owncloud/ocis/pull/1')).toBeNull();
    expect(parseGitHubUrl('https://github.com/owncloud/ocis/commit/abc')).toBeNull();
  });

  it('rejects numbers GitHub cannot have, so a typo does not break the GitHub query', () => {
    expect(parseGitHubUrl('https://github.com/owncloud/ocis/pull/99999999999')).toBeNull();
    expect(parseGitHubUrl('https://github.com/owncloud/ocis/pull/0')).toBeNull();
  });
});
