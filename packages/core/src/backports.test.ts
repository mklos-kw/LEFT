import { describe, expect, it } from 'vitest';
import { parseBackportOf } from './backports';

const repo = 'owncloud/ocis';

describe('parseBackportOf', () => {
  it.each([
    ['backports: https://github.com/owncloud/ocis/pull/13233', [13233]],
    ['Backport of #13231 to stable-9.0.', [13231]],
    ['This pull request is a backport of #13250 to `stable-9.0`.', [13250]],
    ['Backports #13081 onto `stable-8.2`.', [13081]],
  ])('parses %j', (body, expected) => {
    expect(parseBackportOf(body, repo)).toEqual(expected);
  });

  it('ignores references to PRs in other repos', () => {
    expect(parseBackportOf('backports: https://github.com/owncloud/reva/pull/777', repo)).toEqual(
      [],
    );
  });

  it('ignores PR references that are not backport claims', () => {
    expect(parseBackportOf('Fixes problems from #13247.', repo)).toEqual([]);
  });
});
