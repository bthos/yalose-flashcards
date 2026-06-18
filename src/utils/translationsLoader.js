/**
 * translationsLoader.js
 *
 * Pure locale-detection and translation-resolution logic (AC11, AC12).
 * No fetch, no localStorage — all side-effecting code lives in App.jsx.
 *
 * Exports:
 *   detectLocale(navLanguages, available) → string
 *   resolveTranslation(word, translationMap) → string
 */

/**
 * Detect the best locale to use given the browser's preferred language list
 * and the set of available (translated) locales.
 *
 * Resolution order (AC12):
 *   1. Exact match: "fr" → "fr"
 *   2. Prefix match: "fr-CA" → "fr"
 *   3. "en" or any "en-*" always maps to "en" without needing it in available
 *   4. Fallback: "en"
 *
 * @param {string[]} navLanguages  — e.g. navigator.languages snapshot
 * @param {string[]} available     — locale codes present in the manifest
 * @returns {string}  locale code, e.g. "fr", or "en"
 */
export function detectLocale(navLanguages, available) {
  const availableSet = new Set(available);

  for (const lang of navLanguages) {
    // Normalise to lower-case for matching
    const lower = lang.toLowerCase();

    // "en" and "en-*" always resolves to English
    if (lower === 'en' || lower.startsWith('en-')) {
      return 'en';
    }

    // Exact match
    const code = lang.split('-')[0].toLowerCase();
    if (availableSet.has(lang) || availableSet.has(lower)) {
      return lower;
    }

    // Prefix match (fr-CA → fr)
    if (availableSet.has(code)) {
      return code;
    }
  }

  return 'en';
}

/**
 * Resolve the translation string to display on the card back.
 *
 * If translationMap is absent, null, or does not contain a non-empty entry
 * for word.id, falls back to word.translations.en (AC11).
 *
 * @param {{ id: string, translations: { en: string } }} word
 * @param {{ [id: string]: string } | null | undefined} translationMap
 * @returns {string}
 */
export function resolveTranslation(word, translationMap) {
  if (translationMap && translationMap[word.id]) {
    return translationMap[word.id];
  }
  return word.translations.en;
}
