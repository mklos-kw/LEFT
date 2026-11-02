import type { Config } from '../config';
import { AppError } from '../errors';
import { requestJson } from '../http';
import type { OAuthProvider } from './provider';

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const USER_URL = 'https://api.github.com/user';

interface TokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUser {
  login: string;
  name: string | null;
}

export function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'ocis-dashboard',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

export function createGitHubProvider(config: Config): OAuthProvider {
  const { clientId, clientSecret } = config.github;

  return {
    name: 'github',

    authorizeUrl(state, redirectUri) {
      // No scope: read-only access to public data, which is all v1 needs.
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        state,
        allow_signup: 'false',
      });
      return `${AUTHORIZE_URL}?${params}`;
    },

    async complete(code, redirectUri, session) {
      // GitHub reports OAuth errors with status 200 and an `error` field.
      const tokens = await requestJson<TokenResponse>('github', TOKEN_URL, {
        json: { client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri },
      });
      if (!tokens.access_token) {
        throw new AppError(
          401,
          'github_login_failed',
          tokens.error_description ?? tokens.error ?? 'GitHub login failed.',
          'github',
        );
      }

      const user = await requestJson<GitHubUser>('github', USER_URL, {
        headers: githubHeaders(tokens.access_token),
      });
      session.github = {
        accessToken: tokens.access_token,
        login: user.login,
        name: user.name ?? user.login,
      };
    },
  };
}
