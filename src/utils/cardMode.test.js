import { describe, it, expect } from 'vitest';
import {
  CARD_MODES,
  DEFAULT_CARD_MODE,
  nextCardMode,
  prevCardMode,
  parseCardMode,
} from './cardMode';

describe('CARD_MODES', () => {
  it('exposes the three spec modes (AC1)', () => {
    expect(CARD_MODES).toEqual(['translation', 'definition', 'mixed']);
  });

  it('defaults to translation (AC5)', () => {
    expect(DEFAULT_CARD_MODE).toBe('translation');
  });
});

describe('nextCardMode', () => {
  it('cycles forward and wraps around (AC9)', () => {
    expect(nextCardMode('translation')).toBe('definition');
    expect(nextCardMode('definition')).toBe('mixed');
    expect(nextCardMode('mixed')).toBe('translation');
  });

  it('falls back to default for an unknown mode', () => {
    expect(nextCardMode('bogus')).toBe(DEFAULT_CARD_MODE);
  });
});

describe('prevCardMode', () => {
  it('cycles backward and wraps around (AC9)', () => {
    expect(prevCardMode('translation')).toBe('mixed');
    expect(prevCardMode('mixed')).toBe('definition');
    expect(prevCardMode('definition')).toBe('translation');
  });

  it('falls back to default for an unknown mode', () => {
    expect(prevCardMode('bogus')).toBe(DEFAULT_CARD_MODE);
  });
});

describe('parseCardMode', () => {
  it('passes through a valid mode', () => {
    expect(parseCardMode('definition')).toBe('definition');
    expect(parseCardMode('mixed')).toBe('mixed');
  });

  it('falls back to the default for junk / null', () => {
    expect(parseCardMode('quiz')).toBe(DEFAULT_CARD_MODE);
    expect(parseCardMode(null)).toBe(DEFAULT_CARD_MODE);
    expect(parseCardMode(undefined)).toBe(DEFAULT_CARD_MODE);
  });
});
