import { describe, expect, it } from 'vitest';
import { extractKeys } from './keys';

describe('extractKeys', () => {
  it('finds keys in conventional PR titles', () => {
    expect(extractKeys('fix(proxy): [OCISDEV-1464] fix the role assignment', 'OCISDEV')).toEqual([
      'OCISDEV-1464',
    ]);
  });

  it('matches lower-case branch names and upper-cases the result', () => {
    expect(extractKeys('backport/ocisdev-840-stable-8.2', 'OCISDEV')).toEqual(['OCISDEV-840']);
  });

  it('returns each key once', () => {
    expect(extractKeys('OCISDEV-1 and OCISDEV-1, OCISDEV-2', 'OCISDEV')).toEqual([
      'OCISDEV-1',
      'OCISDEV-2',
    ]);
  });

  it('ignores other projects and partial matches', () => {
    expect(extractKeys('SE-1564 XOCISDEV-12 OCISDEV-', 'OCISDEV')).toEqual([]);
  });

  it('matches keys next to underscores, e.g. in branch names', () => {
    expect(extractKeys('ocisdev-840_fix fix_OCISDEV-841', 'OCISDEV')).toEqual([
      'OCISDEV-840',
      'OCISDEV-841',
    ]);
  });

  it('does not match a longer number or a key glued to letters', () => {
    expect(extractKeys('OCISDEV-12345678x9 myOCISDEV-1', 'OCISDEV')).toEqual([]);
  });
});
