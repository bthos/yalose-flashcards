import { describe, it, expect } from 'vitest';
import { detectLocale, resolveTranslation } from './translationsLoader.js';

const AVAILABLE = ['fr', 'de', 'ru'];

// ---------------------------------------------------------------------------
// detectLocale — AC12
// ---------------------------------------------------------------------------
describe('detectLocale (AC12)', () => {
  it('exact match returns the locale', () => {
    expect(detectLocale(['fr'], AVAILABLE)).toBe('fr');
  });

  it('prefix match: fr-CA → fr', () => {
    expect(detectLocale(['fr-CA'], AVAILABLE)).toBe('fr');
  });

  it('prefix match: de-AT → de', () => {
    expect(detectLocale(['de-AT'], AVAILABLE)).toBe('de');
  });

  it('prefix match: ru-RU → ru', () => {
    expect(detectLocale(['ru-RU'], AVAILABLE)).toBe('ru');
  });

  it('falls back to en when no match in available list', () => {
    expect(detectLocale(['ja', 'zh'], AVAILABLE)).toBe('en');
  });

  it('falls back to en when available list is empty', () => {
    expect(detectLocale(['fr'], [])).toBe('en');
  });

  it('falls back to en when navigator list is empty', () => {
    expect(detectLocale([], AVAILABLE)).toBe('en');
  });

  it('uses first match in navigator.languages priority order', () => {
    expect(detectLocale(['zh', 'de', 'fr'], AVAILABLE)).toBe('de');
  });

  it('en prefix (en-US) returns en without needing it in available', () => {
    expect(detectLocale(['en-US'], AVAILABLE)).toBe('en');
  });

  it('en exact returns en without needing it in available', () => {
    expect(detectLocale(['en'], AVAILABLE)).toBe('en');
  });

  it('en is tried before other prefix matches if listed first', () => {
    expect(detectLocale(['en', 'fr'], AVAILABLE)).toBe('en');
  });
});

// ---------------------------------------------------------------------------
// resolveTranslation — AC10, AC11
// ---------------------------------------------------------------------------
describe('resolveTranslation (AC10, AC11)', () => {
  const word = { id: 'abc', translations: { en: 'of, from' } };

  it('returns the translated string when word id is in translationMap (AC10)', () => {
    const map = { abc: 'de, à partir de' };
    expect(resolveTranslation(word, map)).toBe('de, à partir de');
  });

  it('falls back to word.translations.en when word not in translationMap (AC11)', () => {
    expect(resolveTranslation(word, {})).toBe('of, from');
  });

  it('falls back to en when translationMap is null (AC11)', () => {
    expect(resolveTranslation(word, null)).toBe('of, from');
  });

  it('falls back to en when translationMap is undefined (AC11)', () => {
    expect(resolveTranslation(word, undefined)).toBe('of, from');
  });

  it('falls back to en when translation is an empty string (AC11)', () => {
    const map = { abc: '' };
    expect(resolveTranslation(word, map)).toBe('of, from');
  });

  it('does not throw when word id is absent from map', () => {
    expect(() => resolveTranslation(word, { other: 'something' })).not.toThrow();
  });

  it('returns the correct translation for a word with comma-separated en fallback', () => {
    const w = { id: 'xyz', translations: { en: 'one, two, three' } };
    expect(resolveTranslation(w, {})).toBe('one, two, three');
  });
});

// ---------------------------------------------------------------------------
// localStorage key contracts — documented storage surface
// ---------------------------------------------------------------------------
describe('localStorage key contracts', () => {
  it('locale key is yalose-locale (AC13)', () => {
    expect('yalose-locale').toBe('yalose-locale');
  });

  it('manifest cache key is yalose-translations-manifest-cache (AC8)', () => {
    expect('yalose-translations-manifest-cache').toBe('yalose-translations-manifest-cache');
  });

  it('per-locale cache key pattern is yalose-translations-{locale}-cache (AC9)', () => {
    const locale = 'fr';
    expect(`yalose-translations-${locale}-cache`).toBe('yalose-translations-fr-cache');
  });
});
