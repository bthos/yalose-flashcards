import { describe, it, expect } from 'vitest';
import { buildVocabularySource } from './build_vocabulary_source.js';

describe('buildVocabularySource (AC1)', () => {
  it('produces one entry per word', () => {
    const words = [
      { id: 'a1', translations: { en: 'of, from' } },
      { id: 'b2', translations: { en: 'she' } },
    ];
    expect(Object.keys(buildVocabularySource(words))).toHaveLength(2);
  });

  it('keys are word ids, values are english translations', () => {
    const words = [{ id: '5f02', translations: { en: 'of, from' } }];
    expect(buildVocabularySource(words)).toEqual({ '5f02': 'of, from' });
  });

  it('all values are strings', () => {
    const words = [
      { id: 'a', translations: { en: 'one' } },
      { id: 'b', translations: { en: 'two, three' } },
    ];
    for (const v of Object.values(buildVocabularySource(words))) {
      expect(typeof v).toBe('string');
    }
  });

  it('no duplicate keys for unique ids', () => {
    const words = [
      { id: 'x1', translations: { en: 'cat' } },
      { id: 'x2', translations: { en: 'dog' } },
      { id: 'x3', translations: { en: 'bird' } },
    ];
    const result = buildVocabularySource(words);
    expect(Object.keys(result)).toHaveLength(3);
  });

  it('handles 5000-word vocabulary without duplicate keys', () => {
    const words = Array.from({ length: 5000 }, (_, i) => ({
      id: `id_${i}`,
      translations: { en: `meaning ${i}` },
    }));
    const result = buildVocabularySource(words);
    expect(Object.keys(result)).toHaveLength(5000);
  });

  it('handles empty vocabulary', () => {
    expect(buildVocabularySource([])).toEqual({});
  });
});
