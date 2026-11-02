import type { BranchCoverage, TicketReport } from '@ocis-dashboard/core';
import { describe, expect, it } from 'vitest';
import { branchOptions, filterReports } from './view';

const OCIS = 'owncloud/ocis';

function report(key: string, coverage: Partial<BranchCoverage>[]): TicketReport {
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
    coverage: coverage.map((c) => ({
      repo: OCIS,
      branch: 'stable-7.0',
      required: true,
      status: 'missing',
      prNumbers: [],
      ...c,
    })),
    otherRepoLinks: [],
    unlinkedIssues: [],
    flags: [],
  };
}

describe('branch filter', () => {
  // OCISDEV-2 once had a backport to stable-7.0 that was closed; no fix version asks for it.
  const reports = [
    report('OCISDEV-1', [{ required: true, status: 'missing' }]),
    report('OCISDEV-2', [{ required: false, status: 'missing' }]),
  ];

  it('counts missing only where a fix version needs the branch', () => {
    expect(branchOptions(reports)).toMatchObject([{ branch: 'stable-7.0', total: 2, missing: 1 }]);
  });

  it('filters "missing on" the same way', () => {
    const shown = filterReports(reports, {
      problem: 'all',
      assignee: 'all',
      search: '',
      branch: { repo: OCIS, branch: 'stable-7.0', which: 'missing' },
    });
    expect(shown.map((r) => r.ticket.key)).toEqual(['OCISDEV-1']);
  });
});
