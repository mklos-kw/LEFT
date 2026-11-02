import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyInstance, type FastifyRequest } from 'fastify';
import { errorHandler } from './api/error-handler';
import { registerApiRoutes } from './api/routes';
import { createAtlassianProvider } from './auth/atlassian';
import { createGitHubProvider } from './auth/github';
import { registerAuthRoutes } from './auth/routes';
import { redactUrl } from './log-url';
import type { Config } from './config';
import { SessionStore } from './session';
import { registerSessionHook } from './session-hook';

export interface AppOptions {
  /** Directory with the built web app; served at `/` when set (production). */
  staticDir?: string;
}

export async function buildApp(config: Config, options: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      serializers: {
        // OAuth callbacks carry the authorization code in the URL; keep it out of logs.
        req: (request: FastifyRequest) => ({
          method: request.method,
          url: redactUrl(request.url),
          remoteAddress: request.ip,
        }),
      },
    },
  });
  const sessions = new SessionStore();
  const https = config.publicUrl.startsWith('https://');

  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'no-referrer');
    // Only rules that can't break the app; a full script/style policy would need testing in the browser.
    reply.header(
      'Content-Security-Policy',
      "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
    );
    if (https) reply.header('Strict-Transport-Security', 'max-age=31536000');
  });

  await app.register(cookie, { secret: config.sessionSecret });
  registerSessionHook(app, sessions, https);
  app.setErrorHandler(errorHandler);

  registerAuthRoutes(app, config, sessions, [
    createAtlassianProvider(config),
    createGitHubProvider(config),
  ]);
  registerApiRoutes(app, config);

  if (options.staticDir) {
    await app.register(fastifyStatic, { root: options.staticDir });
  }
  return app;
}
