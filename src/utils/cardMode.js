/**
 * cardMode.js — card-back content mode (FR-07)
 *
 * Controls what the back of a flashcard shows:
 *   - translation: English translation only
 *   - definition:  Spanish RAE definition only
 *   - mixed:       translation + definition
 *
 * Pure helpers only; persistence and rendering live in App.jsx / FlashCard.jsx.
 */

export const CARD_MODES = ['translation', 'definition', 'mixed'];

/** Default mode when nothing is stored (spec AC5). */
export const DEFAULT_CARD_MODE = 'translation';

/** Short labels for the toggle (accessible names / tooltips). */
export const CARD_MODE_LABELS = {
  translation: 'Translation',
  definition: 'Definition',
  mixed: 'Mixed',
};

/**
 * Next mode in the cycle (wraps around). Drives the toggle's ArrowRight key.
 * @param {string} mode
 * @returns {string}
 */
export function nextCardMode(mode) {
  const idx = CARD_MODES.indexOf(mode);
  if (idx === -1) return DEFAULT_CARD_MODE;
  return CARD_MODES[(idx + 1) % CARD_MODES.length];
}

/**
 * Previous mode in the cycle (wraps around). Drives the toggle's ArrowLeft key.
 * @param {string} mode
 * @returns {string}
 */
export function prevCardMode(mode) {
  const idx = CARD_MODES.indexOf(mode);
  if (idx === -1) return DEFAULT_CARD_MODE;
  return CARD_MODES[(idx - 1 + CARD_MODES.length) % CARD_MODES.length];
}

/**
 * Coerce a stored/raw value into a valid mode, falling back to the default.
 * @param {*} raw
 * @returns {string}
 */
export function parseCardMode(raw) {
  return CARD_MODES.includes(raw) ? raw : DEFAULT_CARD_MODE;
}
