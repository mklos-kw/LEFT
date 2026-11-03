import type { Ticket } from '@ocis-dashboard/core';
import { AppError } from '../errors';
import type { CodeHost, SprintSource, TicketSource } from '../report/ports';
import {
  DEMO_BOARDS,
  DEMO_ISSUES,
  DEMO_PULL_REQUESTS,
  DEMO_REPOS,
  DEMO_SPRINTS,
  DEMO_TICKETS,
  type DemoTicket,
} from './fixtures';

/** Simulated network latency, so loading states can be seen and tested. */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function asTicket({ sprintId: _sprintId, ...ticket }: DemoTicket): Ticket {
  return { ...ticket, remoteLinkUrls: [] };
}

const linksByKey = new Map(DEMO_TICKETS.map((ticket) => [ticket.key, ticket.remoteLinkUrls]));

export const demoJira: TicketSource & SprintSource = {
  async listBoards() {
    await sleep(150);
    return DEMO_BOARDS;
  },
  async listSprints(boardId) {
    await sleep(200);
    return DEMO_SPRINTS[boardId] ?? [];
  },
  async sprintTickets(sprintId) {
    await sleep(400);
    return DEMO_TICKETS.filter((ticket) => ticket.sprintId === sprintId).map(asTicket);
  },
  async ticketsUpdatedBetween(from, to) {
    await sleep(400);
    return DEMO_TICKETS.filter((t) => t.updated >= from && t.updated <= to).map(asTicket);
  },
  async remoteLinkUrls(key) {
    await sleep(120);
    return linksByKey.get(key) ?? [];
  },
};

const SEARCH = /^repo:(\S+) (is:pr )?(in:body )?"([^"]+)"$/;

export const demoCodeHost: CodeHost = {
  async repoInfo(repo, candidateBranches) {
    await sleep(150);
    const known = DEMO_REPOS[repo];
    if (!known) {
      throw new AppError(
        404,
        'repo_not_found',
        `Demo mode only has sample data for ${Object.keys(DEMO_REPOS).join(' and ')}.`,
      );
    }
    const branches = candidateBranches.filter((branch) => branch in known.branchPoints);
    return {
      name: repo,
      defaultBranch: known.defaultBranch,
      branches,
      branchPoints: Object.fromEntries(branches.map((b) => [b, known.branchPoints[b]!])),
    };
  },
  async search(queries) {
    await sleep(500);
    return queries.map((query) => {
      const [, repo, prsOnly, inBody, term] = SEARCH.exec(query) ?? [];
      if (!repo || !term) return { pullRequests: [], issues: [] };
      const needle = term.toLowerCase();
      const matches = (item: { repo: string; title: string; body: string }) =>
        item.repo === repo &&
        (inBody ? item.body : `${item.title}\n${item.body}`).toLowerCase().includes(needle);
      return {
        pullRequests: DEMO_PULL_REQUESTS.filter(matches),
        issues: prsOnly ? [] : DEMO_ISSUES.filter(matches),
      };
    });
  },
  async pullRequests(repo, numbers) {
    await sleep(200);
    return DEMO_PULL_REQUESTS.filter((pr) => pr.repo === repo && numbers.includes(pr.number));
  },
};
