import { describe, it, expect } from 'vitest';
import { buildVocabularySource } from './build_vocabulary_source.js';

const word = (id, w, defs = [], rae_link = `https://dle.rae.es/${w}`) => ({
  id,
  word: w,
  definitions: defs,
  rae_link,
});

describe('buildVocabularySource (AC1)', () => {
  it('produces one entry per word', () => {
    const words = [word('a1', 'de'), word('b2', 'ella')];
    expect(Object.keys(buildVocabularySource(words))).toHaveLength(2);
  });

  it('keys are word ids', () => {
    const words = [word('5f02', 'de')];
    expect(Object.keys(buildVocabularySource(words))).toEqual(['5f02']);
  });

  it('message is the Spanish word', () => {
    const words = [word('5f02', 'de')];
    expect(buildVocabularySource(words)['5f02'].message).toBe('de');
  });

  it('description contains the RAE link', () => {
    const words = [word('5f02', 'de', [], 'https://dle.rae.es/de')];
    expect(buildVocabularySource(words)['5f02'].description).toContain(
      'https://dle.rae.es/de',
    );
  });

  it('description includes up to 2 RAE definitions when available', () => {
    const defs = ['1. prep. Indica procedencia.', '2. prep. Indica pertenencia.', '3. prep. Extra.'];
    const words = [word('id1', 'de', defs)];
    const desc = buildVocabularySource(words)['id1'].description;
    expect(desc).toContain('1. prep. Indica procedencia.');
    expect(desc).toContain('2. prep. Indica pertenencia.');
    expect(desc).not.toContain('3. prep. Extra.');
  });

  it('filters out "Definition pending" entries from description', () => {
    const words = [word('id1', 'de', ['Definition pending...'])];
    const desc = buildVocabularySource(words)['id1'].description;
    expect(desc).not.toContain('Definition pending');
    expect(desc).toContain('https://dle.rae.es/de');
  });

  it('description is only the RAE link when no definitions available', () => {
    const words = [word('id1', 'de', [], 'https://dle.rae.es/de')];
    expect(buildVocabularySource(words)['id1'].description).toBe('https://dle.rae.es/de');
  });

  it('values are objects with message and description', () => {
    const words = [word('a', 'uno'), word('b', 'dos')];
    for (const v of Object.values(buildVocabularySource(words))) {
      expect(typeof v).toBe('object');
      expect(typeof v.message).toBe('string');
      expect(typeof v.description).toBe('string');
    }
  });

  it('no duplicate keys for unique ids', () => {
    const words = [word('x1', 'uno'), word('x2', 'dos'), word('x3', 'tres')];
    const result = buildVocabularySource(words);
    expect(Object.keys(result)).toHaveLength(3);
  });

  it('handles 5000-word vocabulary without duplicate keys', () => {
    const words = Array.from({ length: 5000 }, (_, i) =>
      word(`id_${i}`, `palabra_${i}`),
    );
    const result = buildVocabularySource(words);
    expect(Object.keys(result)).toHaveLength(5000);
  });

  it('handles empty vocabulary', () => {
    expect(buildVocabularySource([])).toEqual({});
  });
});
