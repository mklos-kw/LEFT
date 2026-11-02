export type Provider = 'atlassian' | 'github';

/** An error with a status and code that is safe to show to the user. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly provider?: Provider,
  ) {
    super(message);
  }
}

/** A failed call to Jira or GitHub. */
export class UpstreamError extends Error {
  constructor(
    readonly provider: Provider,
    readonly status: number,
    readonly url: string,
    readonly body: string,
  ) {
    super(`${provider} responded ${status} for ${url}`);
  }
}

export const notConnected = (provider: Provider) =>
  new AppError(401, 'not_connected', `Sign in with ${provider} first.`, provider);
