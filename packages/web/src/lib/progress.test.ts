import { describe, expect, it } from 'vitest';
import { describeProgress } from './progress';

describe('describeProgress', () => {
  it('names the step and counts what is done', () => {
    expect(describeProgress({ step: 'links', done: 12, total: 42 })).toMatchObject({
      label: 'Reading the Jira links of each ticket',
      count: '12 of 42',
    });
  });

  it('grows monotonically across steps', () => {
    const fractions = [
      describeProgress(undefined),
      describeProgress({ step: 'tickets', done: 0, total: 0 }),
      describeProgress({ step: 'links', done: 5, total: 10 }),
      describeProgress({ step: 'pulls', done: 10, total: 10 }),
      describeProgress({ step: 'backports', done: 4, total: 4 }),
    ].map((view) => view.fraction);
    expect([...fractions].sort((a, b) => a - b)).toEqual(fractions);
    expect(fractions.at(-1)).toBeCloseTo(1);
  });
});
