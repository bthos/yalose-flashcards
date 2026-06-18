/**
 * Derive the initial online status from navigator.onLine.
 * Treats undefined (non-browser env) as online.
 */
export function getInitialOnlineStatus(navigatorOnLine) {
  return navigatorOnLine !== false;
}

/**
 * Given a sequence of 'online' | 'offline' events, return the current status.
 */
export function applyNetworkEvent(currentStatus, eventType) {
  if (eventType === 'online') return true;
  if (eventType === 'offline') return false;
  return currentStatus;
}
