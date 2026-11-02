import type { Flag, FlagCode, LinkedPr, Severity, TicketReport } from './types';

export type FlagContext = Omit<TicketReport, 'flags'>;

/** A flag rule inspects one ticket and returns the problems it finds. Add new checks here. */
export type FlagRule = (report: FlagContext) => Flag[];

function flag(code: FlagCode, severity: Severity, message: string): Flag {
  return { code, severity, message };
}

const noPr: FlagRule = ({ prs, otherRepoLinks }) => {
  if (prs.length > 0) return [];
  const message =
    otherRepoLinks.length > 0
      ? `No PR in the selected repositories; Jira links PRs in ${otherRepoLinks.join(', ')}`
      : 'No PR found';
  return [flag('NO_PR', 'error', message)];
};

const prOpen: FlagRule = ({ prs }) => {
  // Merged only counts on the default branch; a merged feature-branch PR isn't in master yet.
  const anyMerged = prs.some((linked) => linked.intoDefault && linked.pr.state === 'merged');
  const anyOpen = prs.some((linked) => !linked.isBackport && linked.pr.state === 'open');
  return !anyMerged && anyOpen ? [flag('PR_OPEN', 'warning', 'PR not merged yet')] : [];
};

const missingBackport: FlagRule = ({ coverage }) =>
  coverage
    .filter((branch) => branch.required && branch.status === 'missing')
    .map((branch) =>
      flag('MISSING_BACKPORT', 'error', `No backport to ${branch.branch} (${branch.repo})`),
    );

const backportOpen: FlagRule = ({ coverage }) =>
  coverage
    .filter((branch) => branch.required && branch.status === 'open')
    .map((branch) =>
      flag(
        'BACKPORT_OPEN',
        'warning',
        `Backport to ${branch.branch} not merged yet (${branch.repo})`,
      ),
    );

/** PRs closed without merging were abandoned or superseded; their links don't matter. */
const live = (linked: LinkedPr) => linked.pr.state !== 'closed';

const notLinkedInJira: FlagRule = ({ prs }) =>
  prs
    .filter((linked) => live(linked) && !linked.linkedInJira)
    .map((linked) =>
      flag(
        'NOT_LINKED_IN_JIRA',
        'error',
        `${linked.pr.repo}#${linked.pr.number} not linked in Jira`,
      ),
    );

const keyMissingInPr: FlagRule = ({ ticket, prs }) =>
  prs
    .filter((linked) => live(linked) && !linked.keyInPr)
    .map((linked) =>
      flag(
        'KEY_MISSING_IN_PR',
        'error',
        `${linked.pr.repo}#${linked.pr.number} has no ${ticket.key} in title or branch`,
      ),
    );

const issueNotLinked: FlagRule = ({ prs, unlinkedIssues }) =>
  // Without a live PR there's nothing to link it to; "No PR" covers that.
  prs.some(live)
    ? unlinkedIssues.map((issue) =>
        flag('ISSUE_NOT_LINKED', 'error', `${issue.repo}#${issue.number} is not linked to any PR`),
      )
    : [];

export const defaultFlagRules: FlagRule[] = [
  noPr,
  prOpen,
  missingBackport,
  backportOpen,
  notLinkedInJira,
  keyMissingInPr,
  issueNotLinked,
];

export function evaluateFlags(report: FlagContext, rules: FlagRule[] = defaultFlagRules): Flag[] {
  return rules.flatMap((rule) => rule(report));
}
