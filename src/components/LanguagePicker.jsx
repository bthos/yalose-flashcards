/**
 * LanguagePicker.jsx
 *
 * Language selector button + dropdown for the app header (AC14, AC15).
 *
 * Props:
 *   manifest      — { version, locales: { [code]: { name, coverage } } } | null
 *   activeLocale  — string, e.g. "fr" or "en"
 *   onSelect      — (localeCode: string) => void
 */

import { useState, useEffect, useRef } from 'react';
// eslint-disable-next-line no-unused-vars -- used as JSX element
import React from 'react';
// eslint-disable-next-line no-unused-vars -- used as JSX elements
import { CheckIcon, ChevronDownIcon } from './icons';
import './LanguagePicker.css';

/**
 * Format coverage as a display percentage string.
 * Returns null for 100% coverage (clean display — no badge needed).
 */
function formatCoverage(coverage) {
  if (coverage >= 1) return null;
  return `${Math.round(coverage * 1000) / 10}%`;
}

function LanguagePicker({ manifest, activeLocale, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const listRef = useRef(null);

  // Move focus to first/active item when dropdown opens
  // Must be declared BEFORE any early return (Rules of Hooks)
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const activeItem = listRef.current.querySelector('[aria-selected="true"]')
      || listRef.current.querySelector('[role="option"]');
    activeItem?.focus();
  }, [isOpen]);

  // Build sorted locale list: English always first, then by coverage desc
  const localeList = manifest ? Object.entries(manifest.locales)
    .map(([code, info]) => ({ code, ...info }))
    .sort((a, b) => b.coverage - a.coverage) : [];

  const hasLocales = localeList.length > 0;

  // AC15 — if no locales, render nothing
  if (!manifest || !hasLocales) return null;

  const displayCode = (activeLocale || 'en').toUpperCase();

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleSelect = (code) => {
    onSelect(code);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleBackdropClick = () => {
    handleClose();
  };

  // Keyboard navigation within the open dropdown
  const handleListKeyDown = (e) => {
    const items = listRef.current?.querySelectorAll('[role="option"]');
    if (!items || items.length === 0) return;

    const currentFocus = document.activeElement;
    const currentIdx = Array.from(items).indexOf(currentFocus);

    if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = currentIdx < items.length - 1 ? items[currentIdx + 1] : items[0];
      next.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = currentIdx > 0 ? items[currentIdx - 1] : items[items.length - 1];
      prev.focus();
    }
  };

  return (
    <div className="lang-picker">
      <button
        ref={buttonRef}
        className="lang-picker-btn"
        aria-label="Select language"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={handleOpen}
      >
        {displayCode} <ChevronDownIcon className="lang-picker-arrow" size={16} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop catches outside clicks */}
          <div className="lang-picker-backdrop" onClick={handleBackdropClick} aria-hidden="true" />

          <ul
            ref={listRef}
            className="lang-picker-dropdown"
            role="listbox"
            aria-label="Language"
            onKeyDown={handleListKeyDown}
          >
            {/* English — always first */}
            <li
              role="option"
              aria-selected={activeLocale === 'en'}
              className={`lang-picker-option ${activeLocale === 'en' ? 'lang-picker-option--active' : ''}`}
              tabIndex={0}
              onClick={() => handleSelect('en')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect('en'); } }}
            >
              <span className="lang-picker-check" aria-hidden="true">
                {activeLocale === 'en' ? <CheckIcon size={16} /> : null}
              </span>
              <span className="lang-picker-name">English</span>
            </li>

            {localeList.map(({ code, name, coverage }) => {
              const isActive = activeLocale === code;
              const coverageLabel = formatCoverage(coverage);
              return (
                <li
                  key={code}
                  role="option"
                  aria-selected={isActive}
                  className={`lang-picker-option ${isActive ? 'lang-picker-option--active' : ''}`}
                  tabIndex={0}
                  onClick={() => handleSelect(code)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(code); } }}
                >
                  <span className="lang-picker-check" aria-hidden="true">
                    {isActive ? <CheckIcon size={16} /> : null}
                  </span>
                  <span className="lang-picker-name">{name}</span>
                  {coverageLabel && (
                    <span className="lang-picker-coverage" aria-hidden="true">
                      {coverageLabel}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export default LanguagePicker;
