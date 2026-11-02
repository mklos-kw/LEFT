import type { Flag, TicketReport } from '@ocis-dashboard/core';
import { describe, expect, it } from 'vitest';
import { applyMarks, markFor } from './marks';

const notLinked: Flag = {
  code: 'NOT_LINKED_IN_JIRA',
  severity: 'error',
  message: 'owncloud/ocis#13241 not linked in Jira',
};
const noKey: Flag = {
  code: 'KEY_MISSING_IN_PR',
  severity: 'error',
  message: 'owncloud/docs.owncloud.com#166 has no OCISDEV-1589 in title or branch',
};

function report(key: string, flags: Flag[]): TicketReport {
  return {
    ticket: {
      key,
      summary: '',
      status: '',
      issueType: '',
      url: '',
      assignee: null,
      fixVersions: [],
      remoteLinkUrls: [],
    },
    prs: [],
    mentions: [],
    issues: [],
    coverage: [],
    otherRepoLinks: [],
    unlinkedIssues: [],
    flags,
  };
}

describe('applyMarks', () => {
  const marked = report('OCISDEV-1589', [notLinked, noKey]);
  const mark = markFor(marked, new Date('2026-11-02T08:00:00Z'));

  it('sets a marked ticket’s problems aside and lists it last', () => {
    const other = report('OCISDEV-2', [noKey]);
    const [first, second] = applyMarks([marked, other], { 'OCISDEV-1589': mark });
    expect(first!.ticket.key).toBe('OCISDEV-2');
    expect(second).toMatchObject({
      flags: [],
      setAside: [notLinked, noKey],
      mark: { state: 'active', at: '2026-11-02T08:00:00.000Z' },
    });
  });

  it('keeps the mark when a problem goes away', () => {
    const [result] = applyMarks([report('OCISDEV-1589', [noKey])], { 'OCISDEV-1589': mark });
    expect(result!.mark?.state).toBe('active');
    expect(result!.flags).toEqual([]);
  });

  it('drops the mark when a new problem appears', () => {
    const newProblem: Flag = { code: 'PR_OPEN', severity: 'warning', message: 'PR open' };
    const [result] = applyMarks([report('OCISDEV-1589', [noKey, newProblem])], {
      'OCISDEV-1589': mark,
    });
    expect(result!.mark?.state).toBe('outdated');
    expect(result!.flags).toEqual([noKey, newProblem]);
  });

  it('leaves unmarked tickets as they are', () => {
    const [result] = applyMarks([report('OCISDEV-3', [noKey])], {});
    expect(result).toMatchObject({ flags: [noKey], setAside: [] });
    expect(result!.mark).toBeUndefined();
  });
});
