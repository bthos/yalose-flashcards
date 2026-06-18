import { describe, it, expect } from 'vitest';
import { computeCoverage, buildTranslationFile, buildManifest } from './build_translations.js';

const WORD_IDS = ['id1', 'id2', 'id3', 'id4'];

// ---------------------------------------------------------------------------
// computeCoverage — AC4 coverage fraction
// ---------------------------------------------------------------------------
describe('computeCoverage (AC4)', () => {
  it('returns 1.0 when all words are translated', () => {
    const map = { id1: 'a', id2: 'b', id3: 'c', id4: 'd' };
    expect(computeCoverage(WORD_IDS, map)).toBe(1.0);
  });

  it('returns 0.5 when half the words are translated', () => {
    const map = { id1: 'a', id2: 'b' };
    expect(computeCoverage(WORD_IDS, map)).toBe(0.5);
  });

  it('returns 0 for empty translation map', () => {
    expect(computeCoverage(WORD_IDS, {})).toBe(0);
  });

  it('ignores empty-string values (treated as untranslated)', () => {
    const map = { id1: 'a', id2: '' };
    expect(computeCoverage(WORD_IDS, map)).toBe(0.25);
  });

  it('returns 0 when word list is empty', () => {
    expect(computeCoverage([], { id1: 'a' })).toBe(0);
  });

  it('result is between 0 and 1 inclusive', () => {
    const map = { id1: 'x', id3: 'y' };
    const cov = computeCoverage(WORD_IDS, map);
    expect(cov).toBeGreaterThanOrEqual(0);
    expect(cov).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// buildTranslationFile — AC4 per-locale output
// ---------------------------------------------------------------------------
describe('buildTranslationFile (AC4)', () => {
  it('returns only entries present in the translation map', () => {
    const map = { id1: 'translation1', id3: 'translation3' };
    const result = buildTranslationFile(WORD_IDS, map);
    expect(Object.keys(result)).toHaveLength(2);
    expect(result.id1).toBe('translation1');
    expect(result.id3).toBe('translation3');
  });

  it('omits entries with empty-string values', () => {
    const map = { id1: 'a', id2: '' };
    const result = buildTranslationFile(WORD_IDS, map);
    expect(result).not.toHaveProperty('id2');
    expect(result).toHaveProperty('id1');
  });

  it('returns empty object when translation map is empty', () => {
    expect(buildTranslationFile(WORD_IDS, {})).toEqual({});
  });

  it('does not include word ids absent from the vocabulary list', () => {
    const map = { id1: 'a', unknown_id: 'x' };
    const result = buildTranslationFile(WORD_IDS, map);
    expect(result).not.toHaveProperty('unknown_id');
  });
});

// ---------------------------------------------------------------------------
// chrome_json format support (vocabulary source uses { message } objects)
// ---------------------------------------------------------------------------
describe('computeCoverage — chrome_json format', () => {
  it('counts chrome_json entries with non-empty message as translated', () => {
    const map = { id1: { message: 'a' }, id2: { message: 'b' }, id3: { message: '' } };
    expect(computeCoverage(WORD_IDS, map)).toBe(0.5);
  });

  it('ignores chrome_json entries with empty message', () => {
    const map = { id1: { message: '' } };
    expect(computeCoverage(WORD_IDS, map)).toBe(0);
  });
});

describe('buildTranslationFile — chrome_json format', () => {
  it('extracts message from chrome_json entries', () => {
    const map = {
      id1: { message: 'of, from' },
      id2: { message: 'she' },
    };
    const result = buildTranslationFile(WORD_IDS, map);
    expect(result.id1).toBe('of, from');
    expect(result.id2).toBe('she');
  });

  it('omits chrome_json entries with empty message', () => {
    const map = { id1: { message: 'a' }, id2: { message: '' } };
    const result = buildTranslationFile(WORD_IDS, map);
    expect(result).toHaveProperty('id1', 'a');
    expect(result).not.toHaveProperty('id2');
  });

  it('handles mixed plain-string and chrome_json values', () => {
    const map = { id1: 'plain', id2: { message: 'structured' } };
    const result = buildTranslationFile(WORD_IDS, map);
    expect(result.id1).toBe('plain');
    expect(result.id2).toBe('structured');
  });
});

// ---------------------------------------------------------------------------
// buildManifest — AC4 manifest, AC5 empty manifest
// ---------------------------------------------------------------------------
describe('buildManifest (AC4, AC5)', () => {
  it('produces version "empty" and empty locales when no locales provided (AC5)', () => {
    const result = buildManifest({});
    expect(result.version).toBe('empty');
    expect(result.locales).toEqual({});
  });

  it('includes all provided locale entries', () => {
    const result = buildManifest({
      fr: { name: 'Français', coverage: 0.87 },
      de: { name: 'Deutsch', coverage: 0.44 },
    });
    expect(Object.keys(result.locales)).toHaveLength(2);
    expect(result.locales.fr.name).toBe('Français');
    expect(result.locales.de.coverage).toBe(0.44);
  });

  it('version is a non-empty string (not "empty") when locales present', () => {
    const result = buildManifest({ fr: { name: 'Français', coverage: 0.87 } });
    expect(typeof result.version).toBe('string');
    expect(result.version.length).toBeGreaterThan(0);
    expect(result.version).not.toBe('empty');
  });

  it('coverage values are between 0 and 1', () => {
    const result = buildManifest({ de: { name: 'Deutsch', coverage: 0.44 } });
    expect(result.locales.de.coverage).toBeGreaterThanOrEqual(0);
    expect(result.locales.de.coverage).toBeLessThanOrEqual(1);
  });

  it('manifest always has version and locales keys', () => {
    const result = buildManifest({});
    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('locales');
  });
});
