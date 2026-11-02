import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildApp } from './app';
import { loadConfig } from './config';

const config = loadConfig({ DEMO_MODE: 'true' });

beforeEach(() => vi.stubEnv('LOG_LEVEL', 'silent'));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const cookieOf = (setCookie: string | string[] | undefined) =>
  [setCookie]
    .flat()
    .find((c) => c?.startsWith('sid='))
    ?.split(';')[0];

describe('sessions over HTTP', () => {
  it('does not hand out a session cookie to clients that just read', async () => {
    const app = await buildApp(config);
    const response = await app.inject({ method: 'GET', url: '/api/me' });
    expect(response.statusCode).toBe(200);
    expect(cookieOf(response.headers['set-cookie'])).toBeUndefined();
    await app.close();
  });

  it('keeps both sign-ins valid when they are started side by side', async () => {
    // The token exchange fails; we only care that the state check passes.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('nope', { status: 500 })),
    );
    const app = await buildApp(config);

    const atlassian = await app.inject({ method: 'GET', url: '/auth/atlassian/login' });
    const cookie = cookieOf(atlassian.headers['set-cookie'])!;
    expect(cookie).toBeDefined();
    const atlassianState = new URL(atlassian.headers.location!).searchParams.get('state');

    await app.inject({ method: 'GET', url: '/auth/github/login', headers: { cookie } });

    const callback = await app.inject({
      method: 'GET',
      url: `/auth/atlassian/callback?code=abc&state=${atlassianState}`,
      headers: { cookie },
    });
    expect(callback.headers.location).toContain('authError=atlassian_login_failed');
    expect(callback.headers.location).not.toContain('invalid_state');
    await app.close();
  });
});

describe('security headers', () => {
  it('forbids framing and content sniffing on every response', async () => {
    const app = await buildApp(config);
    const response = await app.inject({ method: 'GET', url: '/api/me' });
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['strict-transport-security']).toBeUndefined();
    await app.close();
  });
});
