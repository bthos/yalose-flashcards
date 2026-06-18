import { describe, it, expect } from 'vitest';
import { getInitialOnlineStatus, applyNetworkEvent } from './onlineStatus.js';

// ---------------------------------------------------------------------------
// getInitialOnlineStatus — AC4 (offline after first load)
// ---------------------------------------------------------------------------
describe('getInitialOnlineStatus', () => {
  it('returns true when navigator.onLine is true', () => {
    expect(getInitialOnlineStatus(true)).toBe(true);
  });

  it('returns false when navigator.onLine is false (AC4 — offline detected)', () => {
    expect(getInitialOnlineStatus(false)).toBe(false);
  });

  it('returns true when navigator.onLine is undefined (non-browser env treated as online)', () => {
    expect(getInitialOnlineStatus(undefined)).toBe(true);
  });

  it('returns true when navigator.onLine is null', () => {
    expect(getInitialOnlineStatus(null)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// applyNetworkEvent — AC4
// ---------------------------------------------------------------------------
describe('applyNetworkEvent', () => {
  it('online event sets status to true', () => {
    expect(applyNetworkEvent(false, 'online')).toBe(true);
  });

  it('offline event sets status to false (AC4 — OfflineIndicator shows)', () => {
    expect(applyNetworkEvent(true, 'offline')).toBe(false);
  });

  it('online event on already-online status stays true', () => {
    expect(applyNetworkEvent(true, 'online')).toBe(true);
  });

  it('offline event on already-offline status stays false', () => {
    expect(applyNetworkEvent(false, 'offline')).toBe(false);
  });

  it('unknown event type preserves current status', () => {
    expect(applyNetworkEvent(true, 'unknown')).toBe(true);
    expect(applyNetworkEvent(false, 'unknown')).toBe(false);
  });

  it('regained connection: offline → online event → true (AC4)', () => {
    let status = getInitialOnlineStatus(true);
    status = applyNetworkEvent(status, 'offline');
    expect(status).toBe(false);
    status = applyNetworkEvent(status, 'online');
    expect(status).toBe(true);
  });
});
