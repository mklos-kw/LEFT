import { describe, expect, it } from 'vitest';
import { backportBranchFor, backportBranchesFor, isReleaseBranch } from './versions';

describe('backportBranchFor', () => {
  it.each([
    ['Frances - 9.0.0', 'stable-9.0'],
    ['Curie S9 - 8.0.10', 'stable-8.0'],
    ['8.2', 'stable-8.2'],
    ['Ghez', null],
  ])('maps %j to %j', (fixVersion, branch) => {
    expect(backportBranchFor(fixVersion)).toBe(branch);
  });

  it('supports a custom branch template', () => {
    expect(backportBranchFor('Frances - 9.0.0', 'release/{major}.{minor}')).toBe('release/9.0');
  });
});

describe('isReleaseBranch', () => {
  it.each([
    ['stable-9.0', true],
    ['stable-10.12', true],
    ['stable-9', false],
    ['feature/new-ui', false],
    ['stable-9.0-hotfix', false],
  ])('%j → %j', (branch, expected) => {
    expect(isReleaseBranch(branch)).toBe(expected);
  });

  it('follows a custom template', () => {
    expect(isReleaseBranch('release/9.0', 'release/{major}.{minor}')).toBe(true);
    expect(isReleaseBranch('stable-9.0', 'release/{major}.{minor}')).toBe(false);
  });
});

describe('backportBranchesFor', () => {
  it('drops versions without a number and duplicates', () => {
    expect(backportBranchesFor(['Frances - 9.0.0', 'Ghez', '9.0.1', 'Curie S9 - 8.0.10'])).toEqual([
      'stable-9.0',
      'stable-8.0',
    ]);
  });
});
