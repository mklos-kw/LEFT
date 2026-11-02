import { describe, expect, it } from 'vitest';
import { redactUrl } from './log-url';

describe('redactUrl', () => {
  it('hides OAuth codes and states in logged URLs', () => {
    expect(redactUrl('/auth/github/callback?code=abc123&state=s3cr3t')).toBe(
      '/auth/github/callback?code=REDACTED&state=REDACTED',
    );
  });

  it('leaves other URLs alone', () => {
    expect(redactUrl('/api/report?repos=owncloud%2Focis&sprintId=7')).toBe(
      '/api/report?repos=owncloud%2Focis&sprintId=7',
    );
    expect(redactUrl('/api/me')).toBe('/api/me');
  });
});
