import { describe, expect, it } from 'vitest';
import { parseGoModPin } from './gomod';

const MODULE = 'github.com/owncloud/reva/v2';

describe('parseGoModPin', () => {
  it('reads a single-line require', () => {
    const goMod = `module github.com/owncloud/ocis/v2\n\ngo 1.26\n\nrequire ${MODULE} v2.27.1\n`;
    expect(parseGoModPin(goMod, MODULE)).toEqual({ version: 'v2.27.1', commitSha: null });
  });

  it('reads a require block', () => {
    const goMod = `require (\n\t${MODULE} v2.27.1\n\tother/module v1.0.0\n)\n`;
    expect(parseGoModPin(goMod, MODULE)).toEqual({ version: 'v2.27.1', commitSha: null });
  });

  it('extracts the commit SHA from a pseudo-version', () => {
    const goMod = `require ${MODULE} v2.0.1-0.20261101120000-abcdef123456\n`;
    expect(parseGoModPin(goMod, MODULE)).toEqual({
      version: 'v2.0.1-0.20261101120000-abcdef123456',
      commitSha: 'abcdef123456',
    });
  });

  it('prefers a replace directive over the require', () => {
    const goMod = `require ${MODULE} v2.27.1\nreplace ${MODULE} => ${MODULE} v2.0.1-0.20261101120000-abcdef123456\n`;
    expect(parseGoModPin(goMod, MODULE)).toEqual({
      version: 'v2.0.1-0.20261101120000-abcdef123456',
      commitSha: 'abcdef123456',
    });
  });

  it('ignores a trailing // indirect comment', () => {
    const goMod = `require ${MODULE} v2.27.1 // indirect\n`;
    expect(parseGoModPin(goMod, MODULE)).toEqual({ version: 'v2.27.1', commitSha: null });
  });

  it('returns null when the module is not required', () => {
    expect(parseGoModPin('module x\n\nrequire other/module v1.0.0\n', MODULE)).toBeNull();
  });
});
