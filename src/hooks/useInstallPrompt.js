import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getNextState,
  bannerVisible,
  shouldInitialize,
  SESSION_SUPPRESSION_KEY,
  INSTALL_DELAY_MS,
  DISPLAY_MODE_QUERY,
} from '../utils/pwaInstall.js';

/**
 * React hook that manages the PWA install prompt lifecycle.
 *
 * Uses the pure state machine from pwaInstall.js.
 *
 * Guards:
 *  - Already installed (standalone display mode) → stays hidden
 *  - Session dismissed flag set in sessionStorage → stays hidden
 *
 * Listens for:
 *  - 'beforeinstallprompt': captures the native prompt, shows banner after 2s delay
 *  - 'appinstalled': marks as installed, hides banner
 *
 * @returns {{ visible: boolean, install: Function, dismiss: Function }}
 */
export function useInstallPrompt() {
  const [state, setState] = useState('idle');
  const deferredPromptRef = useRef(null);
  const delayTimerRef = useRef(null);

  // Derive visibility from state
  const visible = bannerVisible(state);

  useEffect(() => {
    // Guard: already running as installed standalone app
    const isInstalled =
      typeof window !== 'undefined' &&
      window.matchMedia(DISPLAY_MODE_QUERY).matches;

    // Guard: dismissed earlier this session
    const isDismissedThisSession =
      typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem(SESSION_SUPPRESSION_KEY) === 'true';

    if (!shouldInitialize({ isInstalled, isDismissedThisSession })) {
      return;
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      deferredPromptRef.current = e;

      // Show banner after 2s delay
      delayTimerRef.current = setTimeout(() => {
        setState(current => getNextState(current, 'prompt_received'));
      }, INSTALL_DELAY_MS);
    };

    const handleAppInstalled = () => {
      deferredPromptRef.current = null;
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
      setState(current => getNextState(current, 'installed'));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (delayTimerRef.current) {
        clearTimeout(delayTimerRef.current);
        delayTimerRef.current = null;
      }
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPromptRef.current) return;
    setState(current => getNextState(current, 'install_clicked'));
    try {
      await deferredPromptRef.current.prompt();
      // Wait for the user's choice; regardless of outcome, hide the banner
    } catch {
      // Prompt already used or unavailable — ignore
    }
    deferredPromptRef.current = null;
  }, []);

  const dismiss = useCallback(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_SUPPRESSION_KEY, 'true');
    }
    setState(current => getNextState(current, 'dismissed'));
  }, []);

  return { visible, install, dismiss };
}
