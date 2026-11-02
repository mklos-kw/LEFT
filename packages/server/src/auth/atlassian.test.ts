import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../config';
import { AppError } from '../errors';
import { SessionStore, type Session } from '../session';
import { freshAtlassianAuth } from './atlassian';

const config = loadConfig({ DEMO_MODE: 'true' });

function expiredSession(): Session {
  const session = new SessionStore().transient();
  session.atlassian = {
    accessToken: 'old',
    refreshToken: 'refresh-1',
    expiresAt: Date.now() - 1000,
    cloudId: 'cloud',
    accountId: 'acc',
    name: 'Me',
  };
  return session;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => vi.unstubAllGlobals());

describe('freshAtlassianAuth', () => {
  it('shares one refresh between concurrent callers', async () => {
    const fetch = vi.fn(async () =>
      json(200, { access_token: 'new', refresh_token: 'refresh-2', expires_in: 3600 }),
    );
    vi.stubGlobal('fetch', fetch);
    const session = expiredSession();

    const [a, b] = await Promise.all([
      freshAtlassianAuth(config, session),
      freshAtlassianAuth(config, session),
    ]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(a.accessToken).toBe('new');
    expect(b).toBe(a);
    expect(session.atlassian?.refreshToken).toBe('refresh-2');
  });

  it('asks to sign in again when the refresh token is rejected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json(403, { error: 'invalid_grant' })),
    );
    const session = expiredSession();

    const error = await freshAtlassianAuth(config, session).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe('not_connected');
    expect(session.atlassian).toBeUndefined();
  });

  it('does not overwrite a sign-in that happened during the refresh', async () => {
    let answer!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((resolve) => (answer = resolve))),
    );
    const session = expiredSession();
    const refreshing = freshAtlassianAuth(config, session);
    await vi.waitFor(() => expect(answer).toBeDefined());

    const newSignIn = {
      ...session.atlassian!,
      accessToken: 'signed-in',
      expiresAt: Date.now() + 3_600_000,
    };
    session.atlassian = newSignIn;
    answer(json(403, { error: 'invalid_grant' }));

    await expect(refreshing).resolves.toBe(newSignIn);
    expect(session.atlassian).toBe(newSignIn);
  });

  it('does not restore the old account when a refresh succeeds after a new sign-in', async () => {
    let answer!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((resolve) => (answer = resolve))),
    );
    const session = expiredSession();
    const refreshing = freshAtlassianAuth(config, session);
    await vi.waitFor(() => expect(answer).toBeDefined());

    const newSignIn = {
      ...session.atlassian!,
      accountId: 'other',
      expiresAt: Date.now() + 3_600_000,
    };
    session.atlassian = newSignIn;
    answer(json(200, { access_token: 'new', refresh_token: 'refresh-2', expires_in: 3600 }));

    await expect(refreshing).resolves.toBe(newSignIn);
    expect(session.atlassian).toBe(newSignIn);
  });

  it('does not sign the user back in when they signed out during the refresh', async () => {
    let answer!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((resolve) => (answer = resolve))),
    );
    const session = expiredSession();
    const refreshing = freshAtlassianAuth(config, session);
    await vi.waitFor(() => expect(answer).toBeDefined());

    session.atlassian = undefined;
    answer(json(200, { access_token: 'new', refresh_token: 'refresh-2', expires_in: 3600 }));

    await expect(refreshing).rejects.toBeInstanceOf(AppError);
    expect(session.atlassian).toBeUndefined();
  });
});
