import { describe, expect, it } from 'vitest';
import { needsPersisting, SessionStore } from './session';

describe('SessionStore', () => {
  it('keeps transient sessions out of the store until saved', () => {
    const store = new SessionStore();
    const session = store.transient();
    expect(store.get(session.id)).toBeUndefined();
    store.save(session);
    expect(store.get(session.id)).toBe(session);
  });

  it('rotates the id, so the old id no longer finds the session', () => {
    const store = new SessionStore();
    const session = store.transient();
    store.save(session);
    const before = session.id;

    store.rotate(session);

    expect(session.id).not.toBe(before);
    expect(store.get(before)).toBeUndefined();
    expect(store.get(session.id)).toBe(session);
  });

  it('sweeps expired sessions', () => {
    let now = 0;
    const store = new SessionStore(() => now);
    store.save(store.transient());
    now += 13 * 60 * 60 * 1000;
    store.save(store.transient());

    expect(store.sweep()).toBe(1);
    expect(store.size).toBe(1);
  });

  it('forgets credentials on delete, so the session is not saved again', () => {
    const store = new SessionStore();
    const session = store.transient();
    session.github = { accessToken: 't', login: 'me', name: 'Me' };
    store.save(session);

    store.delete(session);

    expect(store.size).toBe(0);
    expect(needsPersisting(session)).toBe(false);
  });

  it('keeps a sign-in in progress for minutes, not hours', () => {
    let now = 0;
    const store = new SessionStore(() => now);
    const session = store.transient();
    session.oauthStates.github = 'state';
    store.save(session);

    now = 11 * 60 * 1000;
    expect(store.get(session.id)).toBeUndefined();
  });

  it('gives a signed-in session the full lifetime', () => {
    let now = 0;
    const store = new SessionStore(() => now);
    const session = store.transient();
    session.oauthStates.github = 'state';
    store.save(session);
    session.github = { accessToken: 't', login: 'me', name: 'Me' };
    store.rotate(session);

    now = 11 * 60 * 60 * 1000;
    expect(store.get(session.id)).toBe(session);
  });

  it('caps sign-ins in progress, dropping the oldest', () => {
    const store = new SessionStore(Date.now, 2);
    const [a, b, c] = [store.transient(), store.transient(), store.transient()];
    for (const session of [a, b, c]) {
      session.oauthStates.github = 'state';
      store.save(session);
    }
    expect(store.get(a!.id)).toBeUndefined();
    expect(store.get(b!.id)).toBe(b);
    expect(store.get(c!.id)).toBe(c);
    expect(store.size).toBe(2);
  });
});
