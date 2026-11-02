import type { FastifyInstance } from 'fastify';
import { needsPersisting, type Session, type SessionStore } from './session';

export const SESSION_COOKIE = 'sid';
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;

declare module 'fastify' {
  interface FastifyRequest {
    session: Session;
    /** The session id the request's cookie carried, if valid. */
    sessionCookieId?: string;
  }
}

/**
 * Attaches a session to every request: the stored one for the cookie, or a
 * transient one. A transient session is stored (and its cookie set) only if
 * the request put something in it; a rotated session gets a fresh cookie.
 */
export function registerSessionHook(
  app: FastifyInstance,
  sessions: SessionStore,
  secureCookie: boolean,
): void {
  app.decorateRequest('session', null as unknown as Session);
  app.decorateRequest('sessionCookieId', undefined);

  app.addHook('onRequest', async (request) => {
    const raw = request.cookies[SESSION_COOKIE];
    const unsigned = raw ? request.unsignCookie(raw) : undefined;
    const existing = unsigned?.valid && unsigned.value ? sessions.get(unsigned.value) : undefined;
    request.sessionCookieId = existing?.id;
    request.session = existing ?? sessions.transient();
  });

  app.addHook('onSend', async (request, reply) => {
    const { session } = request;
    if (!session.persisted && needsPersisting(session)) sessions.save(session);
    if (session.persisted && session.id !== request.sessionCookieId) {
      reply.setCookie(SESSION_COOKIE, session.id, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: secureCookie,
        signed: true,
      });
    }
  });

  const sweeper = setInterval(() => sessions.sweep(), SWEEP_INTERVAL_MS);
  sweeper.unref();
  app.addHook('onClose', async () => clearInterval(sweeper));
}
