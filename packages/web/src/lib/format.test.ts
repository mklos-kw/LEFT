import { describe, expect, it } from 'vitest';
import { daysAgo, isoDay } from './format';

describe('isoDay', () => {
  it('uses the local calendar day, also just after midnight', () => {
    expect(isoDay(new Date(2026, 9, 30, 0, 30))).toBe('2026-10-30');
    expect(isoDay(new Date(2026, 9, 30, 23, 59))).toBe('2026-10-30');
  });
});

describe('daysAgo', () => {
  it('counts calendar days back from now', () => {
    const now = new Date(2026, 9, 30, 0, 30);
    expect(daysAgo(0, now)).toBe('2026-10-30');
    expect(daysAgo(13, now)).toBe('2026-10-17');
  });

  it('is not shifted by a DST change in between', () => {
    // Europe switches back from summer time on 25 Oct 2026.
    expect(daysAgo(7, new Date(2026, 9, 30, 0, 30))).toBe('2026-10-23');
  });
});
