import { describe, it, expect } from 'vitest';
import { buildVocabularySource } from './build_vocabulary_source.js';

describe('buildVocabularySource (AC1)', () => {
  it('produces one entry per word', () => {
    const words = [
      { id: 'a1', word: 'de' },
      { id: 'b2', word: 'ella' },
    ];
    expect(Object.keys(buildVocabularySource(words))).toHaveLength(2);
  });

  it('keys are word ids, values are Spanish words', () => {
    const words = [{ id: '5f02', word: 'de' }];
    expect(buildVocabularySource(words)).toEqual({ '5f02': 'de' });
  });

  it('all values are strings', () => {
    const words = [
      { id: 'a', word: 'uno' },
      { id: 'b', word: 'dos' },
    ];
    for (const v of Object.values(buildVocabularySource(words))) {
      expect(typeof v).toBe('string');
    }
  });

  it('no duplicate keys for unique ids', () => {
    const words = [
      { id: 'x1', word: 'uno' },
      { id: 'x2', word: 'dos' },
      { id: 'x3', word: 'tres' },
    ];
    const result = buildVocabularySource(words);
    expect(Object.keys(result)).toHaveLength(3);
  });

  it('handles 5000-word vocabulary without duplicate keys', () => {
    const words = Array.from({ length: 5000 }, (_, i) => ({
      id: `id_${i}`,
      word: `palabra_${i}`,
    }));
    const result = buildVocabularySource(words);
    expect(Object.keys(result)).toHaveLength(5000);
  });

  it('handles empty vocabulary', () => {
    expect(buildVocabularySource([])).toEqual({});
  });
});
