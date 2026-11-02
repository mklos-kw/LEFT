import {
  normalizeRepo,
  type GitHubIssue,
  type PrState,
  type PullRequest,
} from '@ocis-dashboard/core';

/** Shape of the `PrFields` GraphQL fragment. */
export interface GraphQLPullRequest {
  number: number;
  title: string;
  body: string;
  url: string;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  mergedAt: string | null;
  headRefName: string;
  baseRefName: string;
  author: { login: string } | null;
  repository: { nameWithOwner: string };
  closingIssuesReferences: {
    nodes: { number: number; title: string; url: string; repository: { nameWithOwner: string } }[];
  };
}

const STATES: Record<GraphQLPullRequest['state'], PrState> = {
  OPEN: 'open',
  CLOSED: 'closed',
  MERGED: 'merged',
};

export function toPullRequest(node: GraphQLPullRequest): PullRequest {
  return {
    repo: normalizeRepo(node.repository.nameWithOwner),
    number: node.number,
    title: node.title,
    body: node.body,
    headRef: node.headRefName,
    baseRef: node.baseRefName,
    state: STATES[node.state],
    mergedAt: node.mergedAt,
    url: node.url,
    author: node.author?.login ?? null,
    closingIssues: node.closingIssuesReferences.nodes.map((issue) => ({
      repo: normalizeRepo(issue.repository.nameWithOwner),
      number: issue.number,
      title: issue.title,
      url: issue.url,
    })),
  };
}

/** Shape of the `IssueFields` GraphQL fragment. */
export interface GraphQLIssue {
  number: number;
  title: string;
  body: string;
  url: string;
  state: 'OPEN' | 'CLOSED';
  repository: { nameWithOwner: string };
}

export function toIssue(node: GraphQLIssue): GitHubIssue {
  return {
    repo: normalizeRepo(node.repository.nameWithOwner),
    number: node.number,
    title: node.title,
    body: node.body,
    url: node.url,
    state: node.state === 'CLOSED' ? 'closed' : 'open',
  };
}
