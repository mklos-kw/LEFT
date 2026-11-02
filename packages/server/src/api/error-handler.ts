import type { ApiError } from '@ocis-dashboard/core';
import type { FastifyBaseLogger, FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError, UpstreamError } from '../errors';

/** Maps any error to a status and `ApiError` body; upstream details are logged, not exposed. */
export function toApiError(
  error: unknown,
  log: FastifyBaseLogger,
): { status: number; body: ApiError } {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: { error: error.code, message: error.message, provider: error.provider },
    };
  }

  if (error instanceof UpstreamError) {
    log.warn({ status: error.status, url: error.url, body: error.body }, error.message);
    const name = error.provider === 'atlassian' ? 'Atlassian' : 'GitHub';
    if (error.status === 401) {
      return {
        status: 401,
        body: {
          error: 'not_connected',
          message: `Your ${name} sign-in has expired. Sign in again to continue.`,
          provider: error.provider,
        },
      };
    }
    if (error.status === 403) {
      return {
        status: 403,
        body: {
          error: 'forbidden',
          message: `${name} refused the request. The OAuth app may be missing a permission (scope), or you may have hit a rate limit.`,
          provider: error.provider,
        },
      };
    }
    return {
      status: 502,
      body: { error: 'upstream_error', message: `${name} did not respond as expected. Try again.` },
    };
  }

  const statusCode = (error as Partial<FastifyError>).statusCode;
  if (statusCode && statusCode < 500) {
    return {
      status: statusCode,
      body: { error: 'bad_request', message: String((error as Error).message) },
    };
  }

  log.error({ err: error }, 'unhandled error');
  return {
    status: 500,
    body: {
      error: 'internal_error',
      message: 'The server hit an unexpected error. Check its log.',
    },
  };
}

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  const { status, body } = toApiError(error, request.log);
  return reply.code(status).send(body);
}
