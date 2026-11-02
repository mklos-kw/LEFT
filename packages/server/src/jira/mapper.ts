import type { Sprint, SprintState, Ticket } from '@ocis-dashboard/core';

/** The subset of Jira's issue JSON we request. */
export interface JiraIssue {
  key: string;
  fields: {
    summary?: string;
    status?: { name: string };
    issuetype?: { name: string };
    assignee?: { accountId: string; displayName: string } | null;
    fixVersions?: { name: string }[];
  };
}

export interface JiraSprint {
  id: number;
  name: string;
  state: SprintState;
  startDate?: string;
  endDate?: string;
}

/** Remote links come from a separate request; the report service fills them in. */
export function toTicket(issue: JiraIssue, siteUrl: string): Ticket {
  const { fields } = issue;
  return {
    key: issue.key,
    summary: fields.summary ?? '',
    status: fields.status?.name ?? '',
    issueType: fields.issuetype?.name ?? '',
    url: `${siteUrl}/browse/${issue.key}`,
    assignee: fields.assignee
      ? { id: fields.assignee.accountId, name: fields.assignee.displayName }
      : null,
    fixVersions: (fields.fixVersions ?? []).map((version) => version.name),
    remoteLinkUrls: [],
  };
}

export function toSprint(sprint: JiraSprint): Sprint {
  return {
    id: sprint.id,
    name: sprint.name,
    state: sprint.state,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
  };
}

const STATE_ORDER: Record<SprintState, number> = { active: 0, future: 1, closed: 2 };

/** Active first, then upcoming (soonest first), then past (most recent first). */
export function sortSprints(sprints: Sprint[]): Sprint[] {
  return [...sprints].sort((a, b) => {
    if (a.state !== b.state) return STATE_ORDER[a.state] - STATE_ORDER[b.state];
    const byStart = (a.startDate ?? '').localeCompare(b.startDate ?? '');
    return a.state === 'closed' ? -byStart : byStart;
  });
}
