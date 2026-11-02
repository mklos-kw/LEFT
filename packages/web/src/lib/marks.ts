import type { Flag, TicketReport } from '@ocis-dashboard/core';

/** A ticket the user checked by hand and marked as fixed (saved in the browser). */
export interface FixedMark {
  /** ISO time of the click. */
  at: string;
  /** The problems the ticket had when it was marked (flag messages). */
  flags: string[];
}

export type FixedMarks = Record<string, FixedMark>;

/**
 * - active: the mark holds; the ticket's problems are set aside.
 * - outdated: the ticket has a problem it didn't have when it was marked, so
 *   the mark no longer counts and the ticket needs attention again.
 */
export interface AppliedMark extends FixedMark {
  state: 'active' | 'outdated';
}

export interface MarkedReport extends TicketReport {
  mark?: AppliedMark;
  /** For an active mark: the problems that were set aside, shown greyed. */
  setAside: Flag[];
}

export function markFor(report: TicketReport, now: Date = new Date()): FixedMark {
  return { at: now.toISOString(), flags: report.flags.map((flag) => flag.message) };
}

/**
 * Applies the user's marks. A marked ticket keeps its place in the data but has
 * no flags, so counts, filters and row colour treat it as done; it is listed
 * after the tickets that still need attention.
 */
export function applyMarks(reports: TicketReport[], marks: FixedMarks): MarkedReport[] {
  const applied = reports.map((report): MarkedReport => {
    const mark = marks[report.ticket.key];
    if (!mark) return { ...report, setAside: [] };
    const known = new Set(mark.flags);
    const outdated = report.flags.some((flag) => !known.has(flag.message));
    return outdated
      ? { ...report, mark: { ...mark, state: 'outdated' }, setAside: [] }
      : { ...report, flags: [], mark: { ...mark, state: 'active' }, setAside: report.flags };
  });
  const isSetAside = (r: MarkedReport) => (r.mark?.state === 'active' ? 1 : 0);
  return applied
    .map((report, index) => ({ report, index }))
    .sort((a, b) => isSetAside(a.report) - isSetAside(b.report) || a.index - b.index)
    .map(({ report }) => report);
}
