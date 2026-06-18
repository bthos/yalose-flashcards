/**
 * build_translations.js
 *
 * Build-time script (AC4, AC5).
 * Reads Crowdin output files at translations/vocabulary/{locale}/source.json,
 * writes public/vocabulary-translations-{locale}.json per locale, and
 * writes public/vocabulary-translations-manifest.json with locale list,
 * coverage fractions, and a content-hash version field.
 *
 * Usage:
 *   node scripts/build_translations.js
 *
 * Exports:
 *   computeCoverage(wordIds, map) → number  (0–1)
 *   buildTranslationFile(wordIds, map) → { [id]: string }
 *   buildManifest(locales) → { version: string, locales: { [code]: { name, coverage } } }
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// ---------------------------------------------------------------------------
// Pure exports
// ---------------------------------------------------------------------------

/**
 * Extract a plain string from a translation map value.
 * Supports both chrome_json format ({ message: "..." }) and plain strings.
 *
 * @param {string | { message: string } | unknown} value
 * @returns {string}
 */
function extractString(value) {
  if (typeof value === 'string') return value;
  if (value !== null && typeof value === 'object' && typeof value.message === 'string') {
    return value.message;
  }
  return '';
}

/**
 * Compute coverage: fraction of wordIds that have a non-empty translation.
 * Accepts both plain-string and chrome_json ({ message }) map values.
 *
 * @param {string[]} wordIds  — full vocabulary word id list
 * @param {{ [id: string]: string | { message: string } }} map  — translation map for a single locale
 * @returns {number}  0–1
 */
export function computeCoverage(wordIds, map) {
  if (wordIds.length === 0) return 0;
  let count = 0;
  for (const id of wordIds) {
    const str = extractString(map[id]);
    if (str !== '') count++;
  }
  return count / wordIds.length;
}

/**
 * Build the per-locale translation file: only entries present in the
 * vocabulary list AND having a non-empty string value are included.
 * Accepts both plain-string and chrome_json ({ message }) map values.
 *
 * @param {string[]} wordIds  — full vocabulary word id list
 * @param {{ [id: string]: string | { message: string } }} map  — translation map for a single locale
 * @returns {{ [id: string]: string }}
 */
export function buildTranslationFile(wordIds, map) {
  const result = {};
  const wordSet = new Set(wordIds);
  for (const [id, value] of Object.entries(map)) {
    if (!wordSet.has(id)) continue;
    const str = extractString(value);
    if (str !== '') {
      result[id] = str;
    }
  }
  return result;
}

/**
 * Build the manifest object.
 * When locales is empty, returns { version: "empty", locales: {} }.
 * Otherwise computes a deterministic content-hash version from the locale entries.
 *
 * @param {{ [code: string]: { name: string, coverage: number } }} locales
 * @returns {{ version: string, locales: typeof locales }}
 */
export function buildManifest(locales) {
  if (Object.keys(locales).length === 0) {
    return { version: 'empty', locales: {} };
  }

  // Deterministic version: SHA-256 of sorted locale entries JSON
  const sortedEntries = Object.entries(locales).sort(([a], [b]) => a.localeCompare(b));
  const hash = createHash('sha256')
    .update(JSON.stringify(sortedEntries))
    .digest('hex')
    .slice(0, 12);

  return { version: hash, locales };
}

// ---------------------------------------------------------------------------
// Locale display names — ISO 639-1 common set
// ---------------------------------------------------------------------------
const LOCALE_NAMES = {
  af: 'Afrikaans',
  ar: 'العربية',
  bg: 'Български',
  bn: 'বাংলা',
  ca: 'Català',
  cs: 'Čeština',
  da: 'Dansk',
  de: 'Deutsch',
  el: 'Ελληνικά',
  eo: 'Esperanto',
  et: 'Eesti',
  fa: 'فارسی',
  fi: 'Suomi',
  fr: 'Français',
  ga: 'Gaeilge',
  gu: 'ગુજરાતી',
  he: 'עברית',
  hi: 'हिन्दी',
  hr: 'Hrvatski',
  hu: 'Magyar',
  hy: 'Հայերեն',
  id: 'Indonesia',
  it: 'Italiano',
  ja: '日本語',
  ka: 'ქართული',
  kn: 'ಕನ್ನಡ',
  ko: '한국어',
  lt: 'Lietuvių',
  lv: 'Latviešu',
  mk: 'Македонски',
  ml: 'മലയാളം',
  mr: 'मराठी',
  ms: 'Melayu',
  mt: 'Malti',
  nl: 'Nederlands',
  no: 'Norsk',
  pa: 'ਪੰਜਾਬੀ',
  pl: 'Polski',
  pt: 'Português',
  ro: 'Română',
  ru: 'Русский',
  sk: 'Slovenčina',
  sl: 'Slovenščina',
  sq: 'Shqip',
  sr: 'Српски',
  sv: 'Svenska',
  sw: 'Kiswahili',
  ta: 'தமிழ்',
  te: 'తెలుగు',
  th: 'ภาษาไทย',
  tr: 'Türkçe',
  uk: 'Українська',
  ur: 'اردو',
  uz: 'Oʻzbekcha',
  vi: 'Tiếng Việt',
  zh: '中文',
  zu: 'IsiZulu',
};

function getLocaleName(code) {
  return LOCALE_NAMES[code] || code.toUpperCase();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const vocabPath = join(PROJECT_ROOT, 'public', 'vocabulary.json');
  const crowdinDir = join(PROJECT_ROOT, 'translations', 'vocabulary');
  const publicDir = join(PROJECT_ROOT, 'public');

  // Read vocabulary word ids
  let wordIds = [];
  if (existsSync(vocabPath)) {
    const raw = readFileSync(vocabPath, 'utf-8');
    const data = JSON.parse(raw);
    wordIds = (data.words || []).map((w) => w.id);
    console.log(`Vocabulary: ${wordIds.length} words`);
  } else {
    console.warn('vocabulary.json not found — will produce empty manifest');
  }

  // Discover locale directories
  const localeEntries = {};

  if (existsSync(crowdinDir)) {
    const entries = readdirSync(crowdinDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const locale = entry.name;
      const sourcePath = join(crowdinDir, locale, 'source.json');
      if (!existsSync(sourcePath)) continue;

      let map = {};
      try {
        map = JSON.parse(readFileSync(sourcePath, 'utf-8'));
      } catch (err) {
        console.warn(`Skipping ${locale}: could not parse ${sourcePath}:`, err.message);
        continue;
      }

      // Build per-locale file
      const translationFile = buildTranslationFile(wordIds, map);
      const outPath = join(publicDir, `vocabulary-translations-${locale}.json`);
      writeFileSync(outPath, JSON.stringify(translationFile, null, 2), 'utf-8');
      console.log(`Wrote ${Object.keys(translationFile).length} entries → ${outPath}`);

      const coverage = computeCoverage(wordIds, map);
      localeEntries[locale] = { name: getLocaleName(locale), coverage };
    }
  } else {
    console.warn('translations/vocabulary/ not found — producing empty manifest');
  }

  const manifest = buildManifest(localeEntries);
  const manifestPath = join(publicDir, 'vocabulary-translations-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`Manifest written to ${manifestPath} (version: ${manifest.version})`);
}

// Run main only when executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
