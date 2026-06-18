import { useState, useEffect, useRef } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt.js';
import './InstallBanner.css';

/**
 * Bottom-sheet install banner for PWA install prompt.
 *
 * States:
 *  - beforeinstallprompt not fired / already installed / dismissed: not rendered
 *  - Prompt available:     slides up after 2s delay (handled in hook)
 *  - User clicks Instalar: triggers native prompt, hides banner
 *  - User clicks ✕ / Escape: dismisses, sets sessionStorage flag
 *
 * Accessibility:
 *  - role="dialog" aria-modal="false" aria-label="Instalar aplicación"
 *  - Focus trap: on mount, first focus goes to the install button
 *  - Escape key dismisses
 */
export default function InstallBanner() {
  const { visible, install, dismiss } = useInstallPrompt();
  const [isHiding, setIsHiding] = useState(false);
  const installBtnRef = useRef(null);
  const bannerRef = useRef(null);

  // Focus trap — when banner becomes visible, move focus to install button
  useEffect(() => {
    if (visible && !isHiding && installBtnRef.current) {
      installBtnRef.current.focus();
    }
  }, [visible, isHiding]);

  // Escape key dismisses
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible && !isHiding) return null;

  function handleDismiss() {
    setIsHiding(true);
    // Wait for slide-down animation then call dismiss
    setTimeout(() => {
      setIsHiding(false);
      dismiss();
    }, 250); // matches CSS animation duration
  }

  function handleInstall() {
    setIsHiding(true);
    setTimeout(() => {
      setIsHiding(false);
      install();
    }, 250);
  }

  return (
    <div
      ref={bannerRef}
      role="dialog"
      aria-modal="false"
      aria-label="Instalar aplicación"
      className={`install-banner${isHiding ? ' install-banner--hiding' : ''}`}
    >
      <div className="install-banner__header">
        <img
          src="/yalose.svg"
          width="32"
          height="32"
          alt=""
          className="install-banner__icon"
          aria-hidden="true"
        />
        <div className="install-banner__text">
          <p className="install-banner__title">Instala YaLoSé como app</p>
          <p className="install-banner__subtitle">Acceso rápido y uso sin conexión</p>
        </div>
        <button
          type="button"
          className="install-banner__close"
          aria-label="Cerrar"
          onClick={handleDismiss}
        >
          ✕
        </button>
      </div>

      <button
        ref={installBtnRef}
        type="button"
        className="install-banner__install-btn"
        aria-label="Instalar YaLoSé como aplicación"
        onClick={handleInstall}
      >
        Instalar
      </button>
    </div>
  );
}
