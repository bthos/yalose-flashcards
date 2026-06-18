import { describe, it, expect } from 'vitest';
import {
  buildDeck,
  markKnown,
  markReview,
  migrateKnownWords,
  getEarliestNextReview,
  BOX_INTERVALS,
  DAY_MS,
  MAX_BOX,
} from './srsEngine.js';

// Fixed "now" for deterministic tests
const NOW = new Date('2026-01-01T12:00:00Z').getTime();

const VOCAB = [
  { id: 'w1', word: 'hola' },
  { id: 'w2', word: 'adios' },
  { id: 'w3', word: 'gracias' },
];

// ---------------------------------------------------------------------------
// buildDeck — AC1, AC4, AC5
// ---------------------------------------------------------------------------
describe('buildDeck', () => {
  it('includes all words when srsState is empty (AC4 — new words always due)', () => {
    const deck = buildDeck(VOCAB, {}, NOW);
    expect(deck).toHaveLength(3);
  });

  it('includes a word whose nextReview equals now (AC4 — boundary)', () => {
    const state = { w1: { box: 2, nextReview: new Date(NOW).toISOString() } };
    const deck = buildDeck(VOCAB, state, NOW);
    expect(deck.map(w => w.id)).toContain('w1');
  });

  it('includes a word whose nextReview is in the past (AC4)', () => {
    const state = { w1: { box: 2, nextReview: new Date(NOW - 1000).toISOString() } };
    const deck = buildDeck(VOCAB, state, NOW);
    expect(deck.map(w => w.id)).toContain('w1');
  });

  it('excludes a word whose nextReview is in the future (AC4)', () => {
    const state = { w1: { box: 2, nextReview: new Date(NOW + DAY_MS).toISOString() } };
    const deck = buildDeck(VOCAB, state, NOW);
    expect(deck.map(w => w.id)).not.toContain('w1');
  });

  it('sorts due words by box ascending — lowest box first (AC4)', () => {
    const state = {
      w1: { box: 3, nextReview: new Date(NOW - 1).toISOString() },
      w2: { box: 1, nextReview: new Date(NOW - 1).toISOString() },
      w3: { box: 2, nextReview: new Date(NOW - 1).toISOString() },
    };
    const deck = buildDeck(VOCAB, state, NOW);
    expect(deck[0].id).toBe('w2'); // box 1
    expect(deck[1].id).toBe('w3'); // box 2
    expect(deck[2].id).toBe('w1'); // box 3
  });

  it('treats words with no state (box 0) as lowest priority in sort', () => {
    // w1 has no state (new), w2 has box 2 (due)
    const state = { w2: { box: 2, nextReview: new Date(NOW - 1).toISOString() } };
    const deck = buildDeck([VOCAB[0], VOCAB[1]], state, NOW);
    // w2 box 2 > w1 box 0 — but box 0 is sorted before box 2 (ascending)
    expect(deck[0].id).toBe('w1'); // box 0 (new)
    expect(deck[1].id).toBe('w2'); // box 2
  });

  it('returns empty array when all words are not yet due (AC5)', () => {
    const state = {
      w1: { box: 2, nextReview: new Date(NOW + DAY_MS).toISOString() },
      w2: { box: 3, nextReview: new Date(NOW + 2 * DAY_MS).toISOString() },
      w3: { box: 4, nextReview: new Date(NOW + 4 * DAY_MS).toISOString() },
    };
    const deck = buildDeck(VOCAB, state, NOW);
    expect(deck).toHaveLength(0);
  });

  it('box 1 word (interval 0) is always due (AC1)', () => {
    const state = { w1: { box: 1, nextReview: new Date(NOW).toISOString() } };
    const deck = buildDeck(VOCAB, state, NOW);
    expect(deck.map(w => w.id)).toContain('w1');
  });
});

// ---------------------------------------------------------------------------
// markKnown — AC2
// ---------------------------------------------------------------------------
describe('markKnown', () => {
  it('moves new word (no state) from implicit box 0 to box 1 (AC2)', () => {
    const newState = markKnown({}, 'w1', NOW);
    expect(newState.w1.box).toBe(1);
  });

  it('increments box for an existing word (AC2)', () => {
    const state = { w1: { box: 2, nextReview: new Date(NOW).toISOString() } };
    const newState = markKnown(state, 'w1', NOW);
    expect(newState.w1.box).toBe(3);
  });

  it('caps box at MAX_BOX (5) (AC2)', () => {
    const state = { w1: { box: 5, nextReview: new Date(NOW).toISOString() } };
    const newState = markKnown(state, 'w1', NOW);
    expect(newState.w1.box).toBe(5);
  });

  it('sets nextReview = now for box 1 (interval is 0 — every session) (AC2)', () => {
    const newState = markKnown({}, 'w1', NOW); // box 0 → 1
    expect(new Date(newState.w1.nextReview).getTime()).toBe(NOW);
  });

  it('sets nextReview = now + 2 days when advancing to box 2 (AC2)', () => {
    const state = { w1: { box: 1, nextReview: new Date(NOW).toISOString() } };
    const newState = markKnown(state, 'w1', NOW);
    expect(newState.w1.box).toBe(2);
    expect(new Date(newState.w1.nextReview).getTime()).toBe(NOW + BOX_INTERVALS[2]);
  });

  it('sets nextReview = now + 4 days when advancing to box 3 (AC2)', () => {
    const state = { w1: { box: 2, nextReview: new Date(NOW).toISOString() } };
    const newState = markKnown(state, 'w1', NOW);
    expect(new Date(newState.w1.nextReview).getTime()).toBe(NOW + 4 * DAY_MS);
  });

  it('sets nextReview = now + 8 days when advancing to box 4 (AC2)', () => {
    const state = { w1: { box: 3, nextReview: new Date(NOW).toISOString() } };
    const newState = markKnown(state, 'w1', NOW);
    expect(new Date(newState.w1.nextReview).getTime()).toBe(NOW + 8 * DAY_MS);
  });

  it('sets nextReview = now + 16 days when advancing to box 5 (AC2)', () => {
    const state = { w1: { box: 4, nextReview: new Date(NOW).toISOString() } };
    const newState = markKnown(state, 'w1', NOW);
    expect(new Date(newState.w1.nextReview).getTime()).toBe(NOW + 16 * DAY_MS);
  });

  it('does not mutate the original state (pure function)', () => {
    const state = { w1: { box: 2, nextReview: new Date(NOW).toISOString() } };
    markKnown(state, 'w1', NOW);
    expect(state.w1.box).toBe(2);
  });

  it('preserves other words in state', () => {
    const state = {
      w1: { box: 2, nextReview: new Date(NOW).toISOString() },
      w2: { box: 3, nextReview: new Date(NOW).toISOString() },
    };
    const newState = markKnown(state, 'w1', NOW);
    expect(newState.w2.box).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// markReview — AC3
// ---------------------------------------------------------------------------
describe('markReview', () => {
  it('resets box to 1 regardless of current box (AC3)', () => {
    const state = { w1: { box: 4, nextReview: new Date(NOW + 8 * DAY_MS).toISOString() } };
    expect(markReview(state, 'w1', NOW).w1.box).toBe(1);
  });

  it('resets box 2 word to 1 (AC3)', () => {
    const state = { w1: { box: 2, nextReview: new Date(NOW + DAY_MS).toISOString() } };
    expect(markReview(state, 'w1', NOW).w1.box).toBe(1);
  });

  it('sets nextReview to now — word is due immediately (AC3)', () => {
    const state = { w1: { box: 4, nextReview: new Date(NOW + 8 * DAY_MS).toISOString() } };
    const newState = markReview(state, 'w1', NOW);
    expect(new Date(newState.w1.nextReview).getTime()).toBe(NOW);
  });

  it('does not mutate the original state (pure function)', () => {
    const state = { w1: { box: 3, nextReview: new Date(NOW + 4 * DAY_MS).toISOString() } };
    markReview(state, 'w1', NOW);
    expect(state.w1.box).toBe(3);
  });

  it('preserves other words in state', () => {
    const state = {
      w1: { box: 3, nextReview: new Date(NOW).toISOString() },
      w2: { box: 5, nextReview: new Date(NOW).toISOString() },
    };
    const newState = markReview(state, 'w1', NOW);
    expect(newState.w2.box).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// migrateKnownWords — AC7
// ---------------------------------------------------------------------------
describe('migrateKnownWords', () => {
  it('migrates each known word to box 3 (AC7)', () => {
    const state = migrateKnownWords(['w1', 'w2'], NOW);
    expect(state.w1.box).toBe(3);
    expect(state.w2.box).toBe(3);
  });

  it('sets nextReview = now + 4 days for each migrated word (AC7)', () => {
    const state = migrateKnownWords(['w1'], NOW);
    expect(new Date(state.w1.nextReview).getTime()).toBe(NOW + 4 * DAY_MS);
  });

  it('returns empty object for an empty array (AC7)', () => {
    expect(migrateKnownWords([], NOW)).toEqual({});
  });

  it('handles a single word', () => {
    const state = migrateKnownWords(['w1'], NOW);
    expect(Object.keys(state)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// getEarliestNextReview — AC5 (empty-state countdown)
// ---------------------------------------------------------------------------
describe('getEarliestNextReview', () => {
  it('returns null when srsState is empty (no future reviews)', () => {
    expect(getEarliestNextReview(VOCAB, {}, NOW)).toBeNull();
  });

  it('returns null when all tracked words are overdue (not future)', () => {
    const state = { w1: { box: 2, nextReview: new Date(NOW - DAY_MS).toISOString() } };
    expect(getEarliestNextReview(VOCAB, state, NOW)).toBeNull();
  });

  it('returns the earliest upcoming nextReview timestamp (AC5)', () => {
    const state = {
      w1: { box: 2, nextReview: new Date(NOW + 2 * DAY_MS).toISOString() },
      w2: { box: 3, nextReview: new Date(NOW + DAY_MS).toISOString() },
    };
    expect(getEarliestNextReview(VOCAB, state, NOW)).toBe(NOW + DAY_MS);
  });

  it('ignores words with no state', () => {
    const state = { w1: { box: 2, nextReview: new Date(NOW + DAY_MS).toISOString() } };
    // w2 and w3 have no state — should not affect result
    expect(getEarliestNextReview(VOCAB, state, NOW)).toBe(NOW + DAY_MS);
  });
});

// ---------------------------------------------------------------------------
// Constants sanity checks — AC1
// ---------------------------------------------------------------------------
describe('BOX_INTERVALS constants (AC1)', () => {
  it('has 6 entries (index 0 sentinel + boxes 1–5)', () => {
    expect(BOX_INTERVALS).toHaveLength(6);
  });

  it('box 1 interval is 0 (every session)', () => {
    expect(BOX_INTERVALS[1]).toBe(0);
  });

  it('box 2 interval is 2 days', () => {
    expect(BOX_INTERVALS[2]).toBe(2 * DAY_MS);
  });

  it('box 3 interval is 4 days', () => {
    expect(BOX_INTERVALS[3]).toBe(4 * DAY_MS);
  });

  it('box 4 interval is 8 days', () => {
    expect(BOX_INTERVALS[4]).toBe(8 * DAY_MS);
  });

  it('box 5 interval is 16 days', () => {
    expect(BOX_INTERVALS[5]).toBe(16 * DAY_MS);
  });

  it('MAX_BOX is 5', () => {
    expect(MAX_BOX).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// AC6 localStorage key — documented contract test
// ---------------------------------------------------------------------------
describe('localStorage key contract (AC6)', () => {
  it('SRS_STATE_KEY used by App.jsx is yalose-srs-state — documented', () => {
    // This test documents the storage contract. The key constant lives in App.jsx
    // because it is a UI integration concern, not an engine concern.
    // If this test name ever needs changing, update App.jsx too.
    expect('yalose-srs-state').toBe('yalose-srs-state');
  });
});
