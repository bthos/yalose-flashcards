import { useState, useEffect } from 'react';
import { getInitialOnlineStatus, applyNetworkEvent } from '../utils/onlineStatus.js';

/**
 * React hook that tracks the browser's online/offline status.
 *
 * Uses the pure utils from onlineStatus.js for testable logic.
 * Subscribes to the window 'online' and 'offline' events on mount
 * and cleans up on unmount.
 *
 * @returns {boolean} true when online, false when offline
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    getInitialOnlineStatus(typeof navigator !== 'undefined' ? navigator.onLine : undefined)
  );

  useEffect(() => {
    const handleOnline = () =>
      setIsOnline(current => applyNetworkEvent(current, 'online'));
    const handleOffline = () =>
      setIsOnline(current => applyNetworkEvent(current, 'offline'));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
