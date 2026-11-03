import { describe, expect, it } from 'vitest';
import { loadConfig, parseBranchTemplates } from './config';

describe('parseBranchTemplates', () => {
  it('parses repo=template pairs and normalizes repo names', () => {
    expect(
      parseBranchTemplates('Owncloud/Web=release-{major}.{minor}, owncloud/reva=stable-{major}'),
    ).toEqual({
      'owncloud/web': 'release-{major}.{minor}',
      'owncloud/reva': 'stable-{major}',
    });
  });

  it('rejects templates without {major}', () => {
    expect(() => parseBranchTemplates('owncloud/web=release')).toThrow(/\{major\}/);
  });
});

describe('loadConfig', () => {
  it('lists every missing credential', () => {
    expect(() => loadConfig({})).toThrow(
      /SESSION_SECRET, ATLASSIAN_CLIENT_ID, ATLASSIAN_CLIENT_SECRET, ATLASSIAN_SITE_URL, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET/,
    );
  });

  it('needs no credentials in demo mode', () => {
    expect(loadConfig({ DEMO_MODE: 'true' }).demo).toBe(true);
  });
});
