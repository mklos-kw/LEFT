import type { Provider } from '../errors';
import type { Session } from '../session';

/** One OAuth login (Atlassian, GitHub, …). Adding a provider means implementing this. */
export interface OAuthProvider {
  name: Provider;
  authorizeUrl(state: string, redirectUri: string): string;
  /** Exchanges the callback code for tokens and stores them in the session. */
  complete(code: string, redirectUri: string, session: Session): Promise<void>;
}
