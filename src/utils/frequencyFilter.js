/**
 * frequencyFilter.js — difficulty filter (FR-08)
 *
 * Pure helpers for restricting the study deck to a frequency-ranked band.
 * `frequency_rank` is 1-indexed ascending (rank 1 = most frequent word).
 *
 * The SRS engine is never aware of the filter: callers pre-filter the
 * vocabulary with `filterByFrequency` before handing it to `buildDeck`, so
 * switching bands never loses progress (the full SRS state is preserved).
 */

/** Selectable bands, ascending. The last band is the "all words" option. */
export const FREQUENCY_BANDS = [100, 500, 1000, 2000, 5000];

/** Default band when nothing is stored (spec AC3). */
export const DEFAULT_FREQUENCY_LIMIT = 1000;

/** The highest band — treated as "all words", including unranked entries. */
export const ALL_WORDS_LIMIT = FREQUENCY_BANDS[FREQUENCY_BANDS.length - 1];

/**
 * Restrict a vocabulary list to the words within a frequency band.
 *
 * - For the top band (`>= ALL_WORDS_LIMIT`) every word is returned, including
 *   words whose `frequency_rank` is null/missing (AC5: unranked words appear
 *   only in the "all" option).
 * - For every other band, only words with a numeric `frequency_rank <= limit`
 *   are kept; unranked words are excluded.
 *
 * Pure — returns a new array, never mutates the input.
 *
 * @param {Array<{frequency_rank?: number|null}>} vocab
 * @param {number} limit
 * @returns {Array}
 */
export function filterByFrequency(vocab, limit) {
  if (!Array.isArray(vocab)) return [];
  if (limit >= ALL_WORDS_LIMIT) return vocab.slice();
  return vocab.filter(
    (word) => typeof word.frequency_rank === 'number' && word.frequency_rank <= limit
  );
}

/**
 * Coerce a stored/raw value into a valid band, falling back to the default.
 *
 * @param {*} raw — e.g. a localStorage string or number
 * @returns {number} one of FREQUENCY_BANDS
 */
export function parseFrequencyLimit(raw) {
  const value = Number(raw);
  return FREQUENCY_BANDS.includes(value) ? value : DEFAULT_FREQUENCY_LIMIT;
}
