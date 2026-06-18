export const SESSION_SUPPRESSION_KEY = 'yalose-pwa-install-dismissed';
export const INSTALL_DELAY_MS = 2000;
export const DISPLAY_MODE_QUERY = '(display-mode: standalone)';

/**
 * Pure state machine for the install-prompt banner.
 *
 * States: 'idle' | 'available' | 'installing' | 'dismissed' | 'installed'
 * Actions: 'prompt_received' | 'install_clicked' | 'dismissed' | 'installed'
 */
export function getNextState(currentState, action) {
  switch (action) {
    case 'prompt_received':
      return currentState === 'idle' ? 'available' : currentState;
    case 'install_clicked':
      return currentState === 'available' ? 'installing' : currentState;
    case 'dismissed':
      return 'dismissed';
    case 'installed':
      return 'installed';
    default:
      return currentState;
  }
}

export function bannerVisible(state) {
  return state === 'available';
}

/**
 * Should the banner be shown at all?
 * Separated from bannerVisible so tests can verify guard conditions.
 */
export function shouldInitialize({ isInstalled, isDismissedThisSession }) {
  return !isInstalled && !isDismissedThisSession;
}
