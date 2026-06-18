export const DAY_MS = 24 * 60 * 60 * 1000;
export const MAX_BOX = 5;

// Review interval per box (index = box number).
// Box 1 = every session (interval 0 → nextReview = now → always due).
// Box 2–5 = 2 / 4 / 8 / 16 calendar days.
export const BOX_INTERVALS = [
  0,            // 0: unused sentinel
  0,            // 1: every session
  2 * DAY_MS,   // 2
  4 * DAY_MS,   // 3
  8 * DAY_MS,   // 4
  16 * DAY_MS,  // 5 (retired)
];

/**
 * Build the review deck: words due now, sorted by box ascending (hardest first).
 * Words with no SRS state are treated as new and always included.
 *
 * @param {Array<{id: string}>} vocab
 * @param {Object} srsState  { [wordId]: { box: number, nextReview: string (ISO8601) } }
 * @param {number} now       Unix timestamp ms
 * @returns {Array}          Due words, box ascending
 */
export function buildDeck(vocab, srsState, now = Date.now()) {
  return vocab
    .filter(word => {
      const state = srsState[word.id];
      if (!state) return true;
      return new Date(state.nextReview).getTime() <= now;
    })
    .sort((a, b) => {
      const boxA = srsState[a.id]?.box ?? 0;
      const boxB = srsState[b.id]?.box ?? 0;
      return boxA - boxB;
    });
}

/**
 * Mark a word as known: increment box (capped at MAX_BOX), set nextReview.
 * Pure — returns a new state object, never mutates the input.
 *
 * @param {Object} srsState
 * @param {string} wordId
 * @param {number} now
 * @returns {Object} new srsState
 */
export function markKnown(srsState, wordId, now = Date.now()) {
  const current = srsState[wordId] ?? { box: 0 };
  const newBox = Math.min(current.box + 1, MAX_BOX);
  return {
    ...srsState,
    [wordId]: {
      box: newBox,
      nextReview: new Date(now + BOX_INTERVALS[newBox]).toISOString(),
    },
  };
}

/**
 * Mark a word for review: reset to box 1, due immediately.
 * Pure — returns a new state object, never mutates the input.
 *
 * @param {Object} srsState
 * @param {string} wordId
 * @param {number} now
 * @returns {Object} new srsState
 */
export function markReview(srsState, wordId, now = Date.now()) {
  return {
    ...srsState,
    [wordId]: {
      box: 1,
      nextReview: new Date(now).toISOString(),
    },
  };
}

/**
 * Migrate legacy yalose-known-words entries to SRS state.
 * Each known word → box 3, nextReview = now + 4 days (AC7).
 *
 * @param {string[]} knownWordsArray
 * @param {number}   now
 * @returns {Object} srsState
 */
export function migrateKnownWords(knownWordsArray, now = Date.now()) {
  const state = {};
  for (const wordId of knownWordsArray) {
    state[wordId] = {
      box: 3,
      nextReview: new Date(now + BOX_INTERVALS[3]).toISOString(),
    };
  }
  return state;
}

/**
 * Return the earliest nextReview timestamp (ms) among words not yet due.
 * Returns null if no future reviews exist (e.g. all words are new/untracked).
 *
 * @param {Array<{id: string}>} vocab
 * @param {Object} srsState
 * @param {number} now
 * @returns {number|null}
 */
export function getEarliestNextReview(vocab, srsState, now = Date.now()) {
  let earliest = null;
  for (const word of vocab) {
    const state = srsState[word.id];
    if (!state) continue;
    const ts = new Date(state.nextReview).getTime();
    if (ts > now && (earliest === null || ts < earliest)) {
      earliest = ts;
    }
  }
  return earliest;
}
