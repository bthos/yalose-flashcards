import { describe, it, expect } from 'vitest';
import {
  FREQUENCY_BANDS,
  DEFAULT_FREQUENCY_LIMIT,
  ALL_WORDS_LIMIT,
  filterByFrequency,
  parseFrequencyLimit,
} from './frequencyFilter';

const w = (rank) => ({ id: `w${rank}`, frequency_rank: rank });

const VOCAB = [
  w(1),
  w(100),
  w(101),
  w(500),
  w(1000),
  w(2000),
  w(5000),
  { id: 'unranked', frequency_rank: null },
  { id: 'missing' }, // no frequency_rank key
];

describe('FREQUENCY_BANDS', () => {
  it('exposes the five spec bands in ascending order (AC1)', () => {
    expect(FREQUENCY_BANDS).toEqual([100, 500, 1000, 2000, 5000]);
  });

  it('ALL_WORDS_LIMIT is the top band', () => {
    expect(ALL_WORDS_LIMIT).toBe(5000);
  });
});

describe('filterByFrequency', () => {
  it('keeps words with frequency_rank <= limit (boundary inclusive)', () => {
    const ids = filterByFrequency(VOCAB, 100).map((x) => x.id);
    expect(ids).toEqual(['w1', 'w100']); // rank 100 included, 101 excluded
  });

  it('selects the correct subset for each non-top band', () => {
    expect(filterByFrequency(VOCAB, 500).map((x) => x.id)).toEqual(['w1', 'w100', 'w101', 'w500']);
    expect(filterByFrequency(VOCAB, 1000).map((x) => x.id)).toEqual([
      'w1', 'w100', 'w101', 'w500', 'w1000',
    ]);
    expect(filterByFrequency(VOCAB, 2000).map((x) => x.id)).toEqual([
      'w1', 'w100', 'w101', 'w500', 'w1000', 'w2000',
    ]);
  });

  it('excludes null / missing frequency_rank from non-top bands (AC5)', () => {
    const ids = filterByFrequency(VOCAB, 2000).map((x) => x.id);
    expect(ids).not.toContain('unranked');
    expect(ids).not.toContain('missing');
  });

  it('includes every word — even unranked — in the top "all" band (AC5)', () => {
    const ids = filterByFrequency(VOCAB, 5000).map((x) => x.id);
    expect(ids).toContain('unranked');
    expect(ids).toContain('missing');
    expect(ids).toHaveLength(VOCAB.length);
  });

  it('returns a new array, never mutating the input', () => {
    const result = filterByFrequency(VOCAB, 5000);
    expect(result).not.toBe(VOCAB);
    expect(VOCAB).toHaveLength(9);
  });

  it('returns [] for non-array input', () => {
    expect(filterByFrequency(null, 1000)).toEqual([]);
    expect(filterByFrequency(undefined, 1000)).toEqual([]);
  });
});

describe('parseFrequencyLimit', () => {
  it('passes through a valid band', () => {
    expect(parseFrequencyLimit(500)).toBe(500);
    expect(parseFrequencyLimit('2000')).toBe(2000); // string coercion (localStorage)
  });

  it('falls back to the default for out-of-set or junk values', () => {
    expect(parseFrequencyLimit(750)).toBe(DEFAULT_FREQUENCY_LIMIT);
    expect(parseFrequencyLimit('abc')).toBe(DEFAULT_FREQUENCY_LIMIT);
    expect(parseFrequencyLimit(null)).toBe(DEFAULT_FREQUENCY_LIMIT);
    expect(parseFrequencyLimit(undefined)).toBe(DEFAULT_FREQUENCY_LIMIT);
  });
});
