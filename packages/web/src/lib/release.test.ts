import type { Readiness, ReleaseTarget, Version } from '@ocis-dashboard/core';
import { describe, expect, it } from 'vitest';
import {
  blockFilterKeys,
  defaultVersion,
  familyHeading,
  groupVersions,
  reasonLabel,
  releaseDateNote,
} from './release';

const v = (name: string, released: boolean, releaseDate?: string): Version =>
  releaseDate ? { id: name, name, released, releaseDate } : { id: name, name, released };

const VERSIONS = [
  v('Curie - 8.0.0', true, '2025-05-12'),
  v('Deledda - 8.1.0', true, '2026-05-28'),
  v('Ghez', false),
  v('Frances - 9.0.0', false, '2026-11-19'),
  v('Curie S9 - 8.0.10', false, '2026-11-12'),
];

describe('groupVersions', () => {
  it('splits unreleased/released, then groups each by family, newest family first', () => {
    expect(
      groupVersions(VERSIONS).map((g) => [
        g.label,
        g.families.map(([family, vs]) => [family, vs.map((x) => x.name)]),
      ]),
    ).toEqual([
      ['Unreleased', [['9.0', ['Frances - 9.0.0']], ['8.0', ['Curie S9 - 8.0.10']]]],
      ['Released', [['8.1', ['Deledda - 8.1.0']], ['8.0', ['Curie - 8.0.0']]]],
    ]);
  });

  it('leaves out empty groups, and versions with no number', () => {
    expect(groupVersions([v('Curie - 8.0.0', true)]).map((g) => g.label)).toEqual(['Released']);
    expect(groupVersions([v('Ghez', false)])).toEqual([]);
  });

  it('puts the same family under both groups when it has members on both sides', () => {
    const versions = [v('Curie - 8.0.0', true, '2025-05-12'), v('Curie S9 - 8.0.10', false)];
    const families = groupVersions(versions).map((g) => [g.label, g.families.map(([f]) => f)]);
    expect(families).toEqual([
      ['Unreleased', ['8.0']],
      ['Released', ['8.0']],
    ]);
  });
});

describe('familyHeading', () => {
  it('shows the family with its newest version’s codename', () => {
    expect(familyHeading('8.0', [v('Curie S9 - 8.0.10', false)])).toBe('8.0 Curie S9');
  });

  it('falls back to the bare family when there is no codename', () => {
    expect(familyHeading('8.2', [v('8.2', false)])).toBe('8.2');
  });
});

describe('defaultVersion', () => {
  it('opens the next release', () => {
    expect(defaultVersion(VERSIONS)?.name).toBe('Curie S9 - 8.0.10');
  });

  it('falls back to the latest released one, and to nothing', () => {
    expect(defaultVersion(VERSIONS.filter((x) => x.released))?.name).toBe('Deledda - 8.1.0');
    expect(defaultVersion([])).toBeUndefined();
  });
});

describe('releaseDateNote', () => {
  const now = new Date(2026, 10, 7, 15, 0); // 7 Nov 2026, local time

  it('counts calendar days to the release date', () => {
    expect(releaseDateNote(v('a', false, '2026-11-19'), now)).toBe(
      'Release date 19 Nov 2026, in 12 days',
    );
    expect(releaseDateNote(v('a', false, '2026-11-08'), now)).toBe(
      'Release date 8 Nov 2026, in 1 day',
    );
    expect(releaseDateNote(v('a', false, '2026-11-07'), now)).toBe(
      'Release date 7 Nov 2026, today',
    );
  });

  it('says how overdue an unreleased version is', () => {
    expect(releaseDateNote(v('a', false, '2026-11-04'), now)).toBe(
      'Release date 4 Nov 2026, 3 days overdue',
    );
  });

  it('describes released and undated versions', () => {
    expect(releaseDateNote(v('a', true, '2026-05-28'), now)).toBe('Released 28 May 2026');
    expect(releaseDateNote(v('a', false), now)).toBe('No release date in Jira');
    expect(releaseDateNote(v('a', true), now)).toBe('Released');
  });
});

const target = (repo: string, branch: string): ReleaseTarget => ({
  repo,
  branch,
  isDefault: false,
});

describe('reasonLabel', () => {
  it('names the branch when every repo ships from the same one', () => {
    const one = [target('owncloud/ocis', 'stable-9.0'), target('owncloud/reva', 'stable-9.0')];
    expect(reasonLabel('not-on-branch', one)).toBe('Not on stable-9.0');
    const two = [target('owncloud/ocis', 'stable-9.0'), target('owncloud/web', 'release-9.0')];
    expect(reasonLabel('not-on-branch', two)).toBe('Not on the release branch');
    expect(reasonLabel('not-done', one)).toBe('Not done in Jira');
  });
});

describe('blockFilterKeys', () => {
  const readiness: Readiness = {
    verdict: 'no-go',
    total: 3,
    blocking: [
      {
        key: 'A-1',
        summary: '',
        url: '',
        notes: [],
        blockers: [{ reason: 'not-done', kind: 'status', text: '' }],
      },
      {
        key: 'A-2',
        summary: '',
        url: '',
        notes: [],
        blockers: [{ reason: 'no-pr', kind: 'code', text: '' }],
      },
    ],
    tidy: [],
  };

  it('keeps all blockers, or those of one reason, and nothing without a filter', () => {
    expect(blockFilterKeys(readiness, 'all')).toEqual(new Set(['A-1', 'A-2']));
    expect(blockFilterKeys(readiness, 'no-pr')).toEqual(new Set(['A-2']));
    expect(blockFilterKeys(readiness, 'not-merged')).toEqual(new Set());
    expect(blockFilterKeys(readiness, '')).toBeUndefined();
  });
});
