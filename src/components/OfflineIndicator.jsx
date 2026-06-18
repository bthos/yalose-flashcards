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
  // 'hidden' | 'offline' | 'hiding'
  const [displayState, setDisplayState] = useState(isOnline ? 'hidden' : 'offline');
  const [prevIsOnline, setPrevIsOnline] = useState(isOnline);

  // React-recommended pattern: derive state from prop changes during render, not in an effect
  if (prevIsOnline !== isOnline) {
    setPrevIsOnline(isOnline);
    if (!isOnline) {
      setDisplayState('offline');
    } else if (displayState === 'offline') {
      setDisplayState('hiding');
    }
  }

  // Effect only manages the async timer — no synchronous setState calls here
  useEffect(() => {
    if (displayState === 'hiding') {
      const timer = setTimeout(() => setDisplayState('hidden'), 300); // matches CSS animation duration
      return () => clearTimeout(timer);
    }
  }, [displayState]);

  if (displayState === 'hidden') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`offline-indicator${displayState === 'hiding' ? ' offline-indicator--hiding' : ''}`}
    >
      <span className="offline-indicator__icon" aria-hidden="true">◎</span>
      <span className="offline-indicator__text">
        Sin conexión — usando vocabulario guardado
      </span>
    </div>
  );
}
