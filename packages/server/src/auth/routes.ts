import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { Config } from '../config';
import type { Provider } from '../errors';
import type { SessionStore } from '../session';
import { SESSION_COOKIE } from '../session-hook';
import type { OAuthProvider } from './provider';

export function registerAuthRoutes(
  app: FastifyInstance,
  config: Config,
  sessions: SessionStore,
  providers: OAuthProvider[],
): void {
  const byName = new Map(providers.map((provider) => [provider.name, provider]));
  const redirectUri = (provider: Provider) => `${config.publicUrl}/auth/${provider}/callback`;
  const backToApp = (error?: string) =>
    error ? `${config.publicUrl}/?authError=${encodeURIComponent(error)}` : `${config.publicUrl}/`;

  app.get<{ Params: { provider: string } }>('/auth/:provider/login', async (request, reply) => {
    const provider = byName.get(request.params.provider as Provider);
    if (!provider) return reply.code(404).send();

    // One state per provider, so two sign-ins started side by side don't clash.
    const state = randomBytes(16).toString('hex');
    request.session.oauthStates[provider.name] = state;
    return reply.redirect(provider.authorizeUrl(state, redirectUri(provider.name)));
  });

  app.get<{
    Params: { provider: string };
    Querystring: { code?: string; state?: string; error?: string };
  }>('/auth/:provider/callback', async (request, reply) => {
    const provider = byName.get(request.params.provider as Provider);
    if (!provider) return reply.code(404).send();

    const { code, state, error } = request.query;
    const { session } = request;
    const expected = session.oauthStates[provider.name];
    delete session.oauthStates[provider.name];

    if (error) return reply.redirect(backToApp(error));
    if (!code || !expected || expected !== state) {
      return reply.redirect(backToApp('invalid_state'));
    }

    try {
      await provider.complete(code, redirectUri(provider.name), session);
    } catch (err) {
      request.log.error({ err }, `${provider.name} login failed`);
      return reply.redirect(backToApp(`${provider.name}_login_failed`));
    }
    // New id after sign-in (no session fixation); the session hook sets the cookie.
    sessions.rotate(session);
    // Data fetched with the previous login must not be served to the new one.
    session.cache.clear();
    return reply.redirect(backToApp());
  });

  app.post('/auth/logout', async (request, reply) => {
    sessions.delete(request.session);
    return reply.clearCookie(SESSION_COOKIE, { path: '/' }).code(204).send();
  });
}
