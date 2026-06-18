import { describe, it, expect } from 'vitest';
import {
  getNextState,
  bannerVisible,
  shouldInitialize,
  SESSION_SUPPRESSION_KEY,
  INSTALL_DELAY_MS,
  DISPLAY_MODE_QUERY,
} from './pwaInstall.js';

// ---------------------------------------------------------------------------
// State machine — AC7 (install prompt surfaces on first visit)
// ---------------------------------------------------------------------------
describe('getNextState', () => {
  it('idle + prompt_received → available', () => {
    expect(getNextState('idle', 'prompt_received')).toBe('available');
  });

  it('available + prompt_received → stays available (idempotent)', () => {
    expect(getNextState('available', 'prompt_received')).toBe('available');
  });

  it('available + install_clicked → installing', () => {
    expect(getNextState('available', 'install_clicked')).toBe('installing');
  });

  it('idle + install_clicked → stays idle (guard: no prompt yet)', () => {
    expect(getNextState('idle', 'install_clicked')).toBe('idle');
  });

  it('available + dismissed → dismissed (AC7 — ✕ click)', () => {
    expect(getNextState('available', 'dismissed')).toBe('dismissed');
  });

  it('installing + dismissed → dismissed (user rejected native prompt)', () => {
    expect(getNextState('installing', 'dismissed')).toBe('dismissed');
  });

  it('installing + installed → installed (AC7 — accepted)', () => {
    expect(getNextState('installing', 'installed')).toBe('installed');
  });

  it('dismissed + prompt_received → stays dismissed (AC7 — session suppression)', () => {
    expect(getNextState('dismissed', 'prompt_received')).toBe('dismissed');
  });

  it('installed + prompt_received → stays installed', () => {
    expect(getNextState('installed', 'prompt_received')).toBe('installed');
  });

  it('unknown action returns current state unchanged', () => {
    expect(getNextState('available', 'bogus_action')).toBe('available');
  });
});

// ---------------------------------------------------------------------------
// bannerVisible — AC7
// ---------------------------------------------------------------------------
describe('bannerVisible', () => {
  it('returns true only in available state', () => {
    expect(bannerVisible('available')).toBe(true);
  });

  it('returns false in idle', () => {
    expect(bannerVisible('idle')).toBe(false);
  });

  it('returns false in installing', () => {
    expect(bannerVisible('installing')).toBe(false);
  });

  it('returns false in dismissed', () => {
    expect(bannerVisible('dismissed')).toBe(false);
  });

  it('returns false in installed', () => {
    expect(bannerVisible('installed')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// shouldInitialize — AC7 (already installed / already dismissed guards)
// ---------------------------------------------------------------------------
describe('shouldInitialize', () => {
  it('returns true when not installed and not dismissed', () => {
    expect(shouldInitialize({ isInstalled: false, isDismissedThisSession: false })).toBe(true);
  });

  it('returns false when already installed (standalone mode) (AC7)', () => {
    expect(shouldInitialize({ isInstalled: true, isDismissedThisSession: false })).toBe(false);
  });

  it('returns false when dismissed this session (AC7 — sessionStorage flag)', () => {
    expect(shouldInitialize({ isInstalled: false, isDismissedThisSession: true })).toBe(false);
  });

  it('returns false when both installed and dismissed', () => {
    expect(shouldInitialize({ isInstalled: true, isDismissedThisSession: true })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Constants — AC7 contract tests
// ---------------------------------------------------------------------------
describe('pwaInstall constants (AC7)', () => {
  it('SESSION_SUPPRESSION_KEY is yalose-pwa-install-dismissed', () => {
    expect(SESSION_SUPPRESSION_KEY).toBe('yalose-pwa-install-dismissed');
  });

  it('INSTALL_DELAY_MS is 2000 (2s delay before showing banner)', () => {
    expect(INSTALL_DELAY_MS).toBe(2000);
  });

  it('DISPLAY_MODE_QUERY targets standalone mode', () => {
    expect(DISPLAY_MODE_QUERY).toBe('(display-mode: standalone)');
  });
});
