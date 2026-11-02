import { randomBytes } from 'node:crypto';
import type { Provider } from './errors';
import { TtlCache } from './util/ttl-cache';

export interface AtlassianAuth {
  accessToken: string;
  refreshToken?: string;
  /** Epoch milliseconds. */
  expiresAt: number;
  cloudId: string;
  accountId: string;
  name: string;
}

export interface GitHubAuth {
  accessToken: string;
  login: string;
  name: string;
}

export interface Session {
  id: string;
  expiresAt: number;
  atlassian?: AtlassianAuth;
  github?: GitHubAuth;
  /** CSRF state per OAuth flow, so signing in to both providers at once works. */
  oauthStates: Partial<Record<Provider, string>>;
  /** The Atlassian token refresh in flight, shared by concurrent requests. */
  atlassianRefresh?: Promise<AtlassianAuth>;
  /** Per-user cache, so cached Jira data never leaks between users. */
  cache: TtlCache;
  /** Kept in the store (and given a cookie). Other sessions live for one request only. */
  persisted: boolean;
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
/** A session that only holds an OAuth flow in progress (not signed in yet). */
const PENDING_TTL_MS = 10 * 60 * 1000;
/** Bounds memory if someone opens sign-in flows in a loop; the oldest are dropped. */
const MAX_PENDING = 10_000;
const CACHE_TTL_MS = 5 * 60 * 1000;

const newId = () => randomBytes(32).toString('hex');

/**
 * Sessions live only in memory; restarting the server signs everyone out.
 * Visitors get a transient session first; it is only stored once there is
 * something worth keeping (an OAuth flow or a sign-in), so cookieless clients
 * like health checks don't pile up sessions.
 */
export class SessionStore {
  private readonly sessions = new Map<string, Session>();
  /** Ids of stored sessions that aren't signed in yet, oldest first. */
  private readonly pending = new Set<string>();

  constructor(
    private readonly now: () => number = Date.now,
    private readonly maxPending: number = MAX_PENDING,
  ) {}

  transient(): Session {
    return {
      id: newId(),
      expiresAt: this.now() + SESSION_TTL_MS,
      oauthStates: {},
      cache: new TtlCache(CACHE_TTL_MS, this.now),
      persisted: false,
    };
  }

  save(session: Session): void {
    session.persisted = true;
    this.sessions.set(session.id, session);
    if (signedIn(session)) return;
    // Not signed in yet: keep it only as long as a sign-in takes.
    session.expiresAt = Math.min(session.expiresAt, this.now() + PENDING_TTL_MS);
    this.pending.add(session.id);
    for (const id of this.pending) {
      if (this.pending.size <= this.maxPending) break;
      this.forget(id);
    }
  }

  /** Gives the session a new id, so an id known before sign-in is worthless afterwards. */
  rotate(session: Session): void {
    this.forget(session.id);
    session.id = newId();
    session.expiresAt = this.now() + SESSION_TTL_MS;
    this.save(session);
  }

  get(id: string): Session | undefined {
    const session = this.sessions.get(id);
    if (session && session.expiresAt <= this.now()) {
      this.forget(id);
      return undefined;
    }
    return session;
  }

  /** Signs out: forgets the session and everything in it. */
  delete(session: Session): void {
    this.forget(session.id);
    session.persisted = false;
    session.atlassian = undefined;
    session.github = undefined;
    session.oauthStates = {};
    session.cache.clear();
  }

  /** Drops expired sessions; run periodically. Returns how many were dropped. */
  sweep(): number {
    let dropped = 0;
    for (const [id, session] of this.sessions) {
      if (session.expiresAt <= this.now()) {
        this.forget(id);
        dropped++;
      } else {
        session.cache.prune();
      }
    }
    return dropped;
  }

  get size(): number {
    return this.sessions.size;
  }

  private forget(id: string): void {
    this.sessions.delete(id);
    this.pending.delete(id);
  }
}

const signedIn = (session: Session) =>
  session.atlassian !== undefined || session.github !== undefined;

/** Whether a transient session now holds something that must survive the request. */
export function needsPersisting(session: Session): boolean {
  return (
    session.atlassian !== undefined ||
    session.github !== undefined ||
    Object.keys(session.oauthStates).length > 0
  );
}
