import { describe, it, expect } from 'vitest';
import {
  buildRaeUrl,
  filterVocabularyStrings,
  stringsNeedingUpdate,
} from './crowdin_set_context.js';

const makeItem = (identifier, context = '') => ({
  data: { id: 1, identifier, context },
});

describe('buildRaeUrl', () => {
  it('produces the RAE DLE URL for a plain word', () => {
    expect(buildRaeUrl('de')).toBe('https://dle.rae.es/de');
  });

  it('percent-encodes spaces and special characters', () => {
    expect(buildRaeUrl('a propósito')).toBe('https://dle.rae.es/a%20prop%C3%B3sito');
  });
});

describe('filterVocabularyStrings', () => {
  const sourceMap = { abc123: 'de', def456: 'ella' };

  it('keeps only strings whose identifier is in sourceMap', () => {
    const items = [
      makeItem('abc123'),
      makeItem('zzz999'),   // UI string — not in sourceMap
      makeItem('def456'),
    ];
    const result = filterVocabularyStrings(items, sourceMap);
    expect(result).toHaveLength(2);
    expect(result.map(i => i.data.identifier)).toEqual(['abc123', 'def456']);
  });

  it('returns empty array when no matches', () => {
    expect(filterVocabularyStrings([makeItem('unknown')], sourceMap)).toEqual([]);
  });
});

describe('stringsNeedingUpdate', () => {
  const sourceMap = { abc123: 'de', def456: 'ella' };

  it('includes strings with no context', () => {
    const items = [makeItem('abc123', '')];
    expect(stringsNeedingUpdate(items, sourceMap)).toHaveLength(1);
  });

  it('includes strings with outdated context', () => {
    const items = [makeItem('abc123', 'old context')];
    expect(stringsNeedingUpdate(items, sourceMap)).toHaveLength(1);
  });

  it('excludes strings already carrying the correct RAE URL', () => {
    const items = [makeItem('abc123', 'https://dle.rae.es/de')];
    expect(stringsNeedingUpdate(items, sourceMap)).toHaveLength(0);
  });

  it('handles mixed already-correct and stale strings', () => {
    const items = [
      makeItem('abc123', 'https://dle.rae.es/de'),   // correct — skip
      makeItem('def456', ''),                         // needs update
    ];
    const result = stringsNeedingUpdate(items, sourceMap);
    expect(result).toHaveLength(1);
    expect(result[0].data.identifier).toBe('def456');
  });
});
