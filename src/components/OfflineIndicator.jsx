import { useState, useEffect } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import './OfflineIndicator.css';

/**
 * Fixed top bar shown when the browser is offline.
 *
 * States:
 *  - Online:              not rendered
 *  - Offline:             visible with fade-in animation
 *  - Regaining connect.:  fade-out animation, then removed from DOM
 *
 * Accessibility: role="status" aria-live="polite" aria-atomic="true"
 * Not focusable (informational only).
 */
export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  // Track whether we were previously offline so we can animate the exit
  const [wasOffline, setWasOffline] = useState(false);
  const [isHiding, setIsHiding] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      // Just went offline (or already was)
      setWasOffline(true);
      setIsHiding(false);
    } else if (wasOffline) {
      // Regained connection — animate out then remove
      setIsHiding(true);
      const timer = setTimeout(() => {
        setWasOffline(false);
        setIsHiding(false);
      }, 300); // matches CSS animation duration
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // Only render when offline or fading out after reconnection
  if (isOnline && !wasOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`offline-indicator${isHiding ? ' offline-indicator--hiding' : ''}`}
    >
      <span className="offline-indicator__icon" aria-hidden="true">◎</span>
      <span className="offline-indicator__text">
        Sin conexión — usando vocabulario guardado
      </span>
    </div>
  );
}
