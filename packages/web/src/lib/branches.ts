import type { LinkedPr, RepoInfo, RepoName, TicketReport } from '@ocis-dashboard/core';
import { formatRange } from './format';

export type BranchRowStatus = 'merged' | 'included' | 'open' | 'missing' | 'closed';

/** One line of a ticket's branch list: where its fix is (or isn't) on one branch. */
export interface BranchRow {
  repo: RepoName;
  branch: string;
  /** The repo's default branch (`master`, `main`). */
  defaultBranch: string;
  isDefault: boolean;
  status: BranchRowStatus;
  /** For `included`: the default-branch PRs the branch already contains; otherwise PRs into this branch. */
  prs: LinkedPr[];
  /** False for backports that no fix version asked for. */
  required: boolean;
  /** When the branch was cut, for `included`. */
  branchPoint?: string;
  /** A feature branch (neither the default nor a release branch) the ticket's PRs target. */
  isFeature?: boolean;
}

/**
 * The branches that matter for one ticket, per repo: the default branch (if it
 * has PRs, or if the ticket has no PR at all), then the stable branches its fix
 * versions need or that it was backported to, newest first.
 */
export function branchRows(report: TicketReport, repos: RepoInfo[]): BranchRow[] {
  const used = new Set([
    ...report.prs.map((linked) => linked.pr.repo),
    ...report.coverage.map((c) => c.repo),
  ]);
  const shown = repos.filter((repo) => used.has(repo.name));
  const primary = repos[0];
  if (shown.length === 0 && primary) {
    return [
      {
        repo: primary.name,
        branch: primary.defaultBranch,
        defaultBranch: primary.defaultBranch,
        isDefault: true,
        status: 'missing',
        prs: [],
        required: true,
      },
    ];
  }

  return shown.flatMap((repo) => {
    const mainPrs = report.prs.filter((l) => l.pr.repo === repo.name && l.intoDefault);
    const rows: BranchRow[] = [];
    if (mainPrs.length > 0) {
      rows.push({
        repo: repo.name,
        branch: repo.defaultBranch,
        defaultBranch: repo.defaultBranch,
        isDefault: true,
        status: mainStatus(mainPrs),
        prs: mainPrs,
        required: true,
      });
    }

    // PRs into feature branches: shown on their own line, so they never pass for merged into master.
    const featurePrs = report.prs.filter(
      (l) => l.pr.repo === repo.name && !l.intoDefault && !l.isBackport,
    );
    for (const branch of [...new Set(featurePrs.map((l) => l.pr.baseRef))].sort()) {
      const prs = featurePrs.filter((l) => l.pr.baseRef === branch);
      rows.push({
        repo: repo.name,
        branch,
        defaultBranch: repo.defaultBranch,
        isDefault: false,
        status: mainStatus(prs),
        prs,
        required: false,
        isFeature: true,
      });
    }

    const coverage = report.coverage
      .filter((c) => c.repo === repo.name)
      .sort((a, b) => b.branch.localeCompare(a.branch, undefined, { numeric: true }));
    for (const c of coverage) {
      const prs =
        c.status === 'included'
          ? mainPrs.filter((l) => c.prNumbers.includes(l.pr.number))
          : report.prs.filter((l) => l.pr.repo === repo.name && l.pr.baseRef === c.branch);
      rows.push({
        repo: repo.name,
        branch: c.branch,
        defaultBranch: repo.defaultBranch,
        isDefault: false,
        status: c.status,
        prs,
        required: c.required,
        branchPoint: c.branchPoint,
      });
    }
    return rows;
  });
}

/**
 * Why an `included` branch needs no backport, with both dates so it can be
 * checked at a glance: "already in stable-9.0: merged to master 1 Oct 2026,
 * before the branch was cut 12 Oct 2026".
 */
export function includedNote(row: BranchRow): string {
  const merged = row.prs
    .map((l) => l.pr.mergedAt)
    .filter((at): at is string => at !== null)
    .sort()
    .at(-1);
  const mergedText = merged ? ` ${formatRange(merged)}` : '';
  const cutText = row.branchPoint ? ` ${formatRange(row.branchPoint)}` : '';
  return `already in ${row.branch}: merged to ${row.defaultBranch}${mergedText}, before the branch was cut${cutText}`;
}

function mainStatus(prs: LinkedPr[]): BranchRowStatus {
  if (prs.some((l) => l.pr.state === 'merged')) return 'merged';
  if (prs.some((l) => l.pr.state === 'open')) return 'open';
  return 'closed';
}

/** At most `limit` PRs to show inline, merged/open before closed; the rest are counted. */
export function visiblePrs(prs: LinkedPr[], limit = 2): { shown: LinkedPr[]; hidden: number } {
  const rank = { merged: 0, open: 1, closed: 2 } as const;
  const sorted = [...prs].sort((a, b) => rank[a.pr.state] - rank[b.pr.state]);
  return { shown: sorted.slice(0, limit), hidden: Math.max(0, sorted.length - limit) };
}

/** What each branch state means, for the tooltip on it. */
export function statusHelp(row: BranchRow): string {
  if (row.isFeature) {
    return `A feature branch: the fix is not in ${row.defaultBranch} until it is merged there.`;
  }
  switch (row.status) {
    case 'merged':
      return `A PR of this ticket into ${row.branch} is merged.`;
    case 'included':
      return `Already on ${row.branch}: the fix was merged to ${row.defaultBranch} before ${row.branch} was cut, so no backport is needed.`;
    case 'open':
      return `A PR of this ticket into ${row.branch} is open, not merged yet.`;
    case 'closed':
      return `The only PRs into ${row.branch} were closed without merging.`;
    case 'missing':
      return row.isDefault
        ? `No PR of this ticket targets ${row.branch}.`
        : `No PR of this ticket targets ${row.branch}, and the fix came after ${row.branch} was cut.`;
  }
}
