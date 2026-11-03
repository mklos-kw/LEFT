import { PassThrough } from 'node:stream';
import type {
  BoardsResponse,
  MeResponse,
  ReportResponse,
  ReportStreamEvent,
  SprintsResponse,
} from '@ocis-dashboard/core';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Config } from '../config';
import { AppError } from '../errors';
import { ReportService } from '../report/service';
import { codeHostFor, jiraFor } from './clients';
import { toApiError } from './error-handler';
import { parseRepos, parseSelection, type ReportQuery } from './selection';

const DEMO_USER = { connected: true, id: 'demo', name: 'Demo user' };

export function registerApiRoutes(app: FastifyInstance, config: Config): void {
  app.get('/api/me', async (request): Promise<MeResponse> => {
    if (config.demo) return { atlassian: DEMO_USER, github: DEMO_USER, demo: true };
    const { atlassian, github } = request.session;
    return {
      atlassian: atlassian
        ? { connected: true, id: atlassian.accountId, name: atlassian.name }
        : { connected: false },
      github: github
        ? { connected: true, id: github.login, name: github.name }
        : { connected: false },
      demo: false,
    };
  });

  app.get('/api/boards', async (request): Promise<BoardsResponse> => {
    const jira = await jiraFor(config, request.session);
    const boards = await request.session.cache.getOrLoad('boards', () => jira.listBoards());
    return { boards };
  });

  app.get<{ Querystring: { boardId?: string } }>(
    '/api/sprints',
    async (request): Promise<SprintsResponse> => {
      const boardId = Number(request.query.boardId);
      if (!Number.isInteger(boardId) || boardId <= 0) {
        throw new AppError(400, 'bad_request', 'Pass a numeric boardId.');
      }
      const jira = await jiraFor(config, request.session);
      const sprints = await request.session.cache.getOrLoad(`sprints:${boardId}`, () =>
        jira.listSprints(boardId),
      );
      return { sprints };
    },
  );

  /** Plain JSON, handy for scripts. */
  app.get<{ Querystring: ReportQuery }>(
    '/api/report',
    async (request, reply): Promise<ReportResponse> => {
      const { service, selection, repos } = await prepareReport(request);
      return service.build(selection, repos, { signal: abortOnDisconnect(reply) });
    },
  );

  /** NDJSON: progress events while the report is built, then the result (or an error). */
  app.get<{ Querystring: ReportQuery }>('/api/report/stream', async (request, reply) => {
    const { service, selection, repos } = await prepareReport(request);
    const signal = abortOnDisconnect(reply);
    const stream = new PassThrough();
    const emit = (event: ReportStreamEvent) => {
      if (!signal.aborted) stream.write(`${JSON.stringify(event)}\n`);
    };

    service
      .build(selection, repos, {
        signal,
        onProgress: (progress) => emit({ type: 'progress', progress }),
        onTickets: (tickets) => emit({ type: 'tickets', tickets }),
      })
      .then((report) => emit({ type: 'result', report }))
      .catch((error: unknown) => {
        if (!signal.aborted) emit({ type: 'error', error: toApiError(error, request.log).body });
      })
      .finally(() => stream.end());

    return reply
      .type('application/x-ndjson; charset=utf-8')
      .header('Cache-Control', 'no-cache')
      .send(stream);
  });

  /** Aborts when the client goes away before the response is complete (e.g. a newer selection). */
  function abortOnDisconnect(reply: FastifyReply): AbortSignal {
    const controller = new AbortController();
    reply.raw.on('close', () => {
      if (!reply.raw.writableFinished) controller.abort();
    });
    return controller.signal;
  }

  async function prepareReport(request: FastifyRequest<{ Querystring: ReportQuery }>) {
    const selection = parseSelection(request.query);
    const repos = parseRepos(request.query.repos);
    const { session } = request;
    if (request.query.refresh === '1') session.cache.clear();

    const service = new ReportService({
      tickets: await jiraFor(config, session),
      code: codeHostFor(config, session),
      projectKey: config.projectKey,
      branchTemplates: config.branchTemplates,
      cache: session.cache,
    });
    return { service, selection, repos };
  }
}
