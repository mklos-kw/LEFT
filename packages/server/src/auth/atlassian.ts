import type { Config } from '../config';
import { AppError, notConnected, UpstreamError } from '../errors';
import { requestJson } from '../http';
import type { AtlassianAuth, Session } from '../session';
import type { OAuthProvider } from './provider';

const AUTHORIZE_URL = 'https://auth.atlassian.com/authorize';
const TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
const RESOURCES_URL = 'https://api.atlassian.com/oauth/token/accessible-resources';
/** Refresh this long before the token actually expires. */
const EXPIRY_MARGIN_MS = 60_000;

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

interface AccessibleResource {
  id: string;
  url: string;
}

interface JiraMyself {
  accountId: string;
  displayName: string;
}

export function jiraApiBase(cloudId: string): string {
  return `https://api.atlassian.com/ex/jira/${cloudId}`;
}

export function createAtlassianProvider(config: Config): OAuthProvider {
  const { clientId, clientSecret, scopes, siteUrl } = config.atlassian;

  return {
    name: 'atlassian',

    authorizeUrl(state, redirectUri) {
      const params = new URLSearchParams({
        audience: 'api.atlassian.com',
        client_id: clientId,
        scope: scopes,
        redirect_uri: redirectUri,
        state,
        response_type: 'code',
        prompt: 'consent',
      });
      return `${AUTHORIZE_URL}?${params}`;
    },

    async complete(code, redirectUri, session) {
      const tokens = await requestJson<TokenResponse>('atlassian', TOKEN_URL, {
        json: {
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        },
      });
      const auth = bearer(tokens.access_token);

      const resources = await requestJson<AccessibleResource[]>('atlassian', RESOURCES_URL, auth);
      const site = resources.find((resource) => resource.url.replace(/\/+$/, '') === siteUrl);
      if (!site) {
        throw new AppError(403, 'site_not_accessible', `Your account has no access to ${siteUrl}.`);
      }

      const me = await requestJson<JiraMyself>(
        'atlassian',
        `${jiraApiBase(site.id)}/rest/api/3/myself`,
        auth,
      );

      session.atlassian = {
        ...fromTokens(tokens),
        cloudId: site.id,
        accountId: me.accountId,
        name: me.displayName,
      };
    },
  };
}

/**
 * Returns a non-expired Atlassian login for the session, refreshing it if
 * needed. Concurrent callers share one refresh: Atlassian rotates refresh
 * tokens, so two parallel refreshes with the same token would race.
 */
export async function freshAtlassianAuth(config: Config, session: Session): Promise<AtlassianAuth> {
  const auth = session.atlassian;
  if (!auth) throw notConnected('atlassian');
  if (auth.expiresAt - EXPIRY_MARGIN_MS > Date.now()) return auth;

  session.atlassianRefresh ??= refresh(config, session, auth).finally(() => {
    session.atlassianRefresh = undefined;
  });
  return session.atlassianRefresh;
}

async function refresh(
  config: Config,
  session: Session,
  auth: AtlassianAuth,
): Promise<AtlassianAuth> {
  if (!auth.refreshToken) {
    session.atlassian = undefined;
    throw notConnected('atlassian');
  }

  // The user may sign in again (or out) while the refresh runs; that wins.
  const changed = () => session.atlassian !== auth;
  const current = () => {
    if (!session.atlassian) throw notConnected('atlassian');
    return session.atlassian;
  };

  let tokens: TokenResponse;
  try {
    tokens = await requestJson<TokenResponse>('atlassian', TOKEN_URL, {
      json: {
        grant_type: 'refresh_token',
        client_id: config.atlassian.clientId,
        client_secret: config.atlassian.clientSecret,
        refresh_token: auth.refreshToken,
      },
    });
  } catch (error) {
    if (changed()) return current();
    // 4xx: the refresh token expired or was revoked, so the user must sign in again.
    if (error instanceof UpstreamError && error.status >= 400 && error.status < 500) {
      session.atlassian = undefined;
      throw notConnected('atlassian');
    }
    throw error;
  }
  if (changed()) return current();
  // Atlassian rotates refresh tokens; keep the old one only if no new one was sent.
  session.atlassian = { ...auth, ...fromTokens(tokens, auth.refreshToken) };
  return session.atlassian;
}

function fromTokens(tokens: TokenResponse, previousRefreshToken?: string) {
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? previousRefreshToken,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };
}

function bearer(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}
