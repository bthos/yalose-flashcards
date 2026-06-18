import { describe, it, expect } from 'vitest';
import {
  createSwipeState,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  computeProgress,
} from './swipeGesture.js';

const T = 60; // threshold used throughout

describe('createSwipeState', () => {
  it('returns neutral state', () => {
    const s = createSwipeState();
    expect(s.active).toBe(false);
    expect(s.axisLocked).toBeNull();
    expect(s.dx).toBe(0);
  });
});

describe('onPointerDown', () => {
  it('marks active and records start position', () => {
    const s = onPointerDown(100, 200);
    expect(s.active).toBe(true);
    expect(s.startX).toBe(100);
    expect(s.startY).toBe(200);
    expect(s.axisLocked).toBeNull();
    expect(s.dx).toBe(0);
  });
});

describe('onPointerMove', () => {
  it('locks horizontal when |dx| >= |dy| and movement > 5 px', () => {
    let s = onPointerDown(0, 0);
    s = onPointerMove(s, 10, 3);
    expect(s.axisLocked).toBe('horizontal');
    expect(s.dx).toBe(10);
  });

  it('locks vertical when |dy| > |dx| and movement > 5 px', () => {
    let s = onPointerDown(0, 0);
    s = onPointerMove(s, 3, 10);
    expect(s.axisLocked).toBe('vertical');
  });

  it('does not lock axis when movement is within 5 px noise floor', () => {
    let s = onPointerDown(0, 0);
    s = onPointerMove(s, 3, 2);
    expect(s.axisLocked).toBeNull();
  });

  it('axis lock is sticky — not re-evaluated on subsequent moves', () => {
    let s = onPointerDown(0, 0);
    s = onPointerMove(s, 10, 3);  // horizontal
    s = onPointerMove(s, 2, 50); // would be vertical if re-locked
    expect(s.axisLocked).toBe('horizontal');
  });

  it('is a no-op when not active', () => {
    const s = createSwipeState();
    expect(onPointerMove(s, 100, 0)).toBe(s);
  });
});

describe('onPointerUp — AC1 / AC2 of spec', () => {
  it('fires "known" when dx >= threshold (right swipe)', () => {
    let s = onPointerDown(0, 0);
    s = onPointerMove(s, 70, 5);
    expect(onPointerUp(s, T).action).toBe('known');
  });

  it('fires "review" when dx <= -threshold (left swipe)', () => {
    let s = onPointerDown(0, 0);
    s = onPointerMove(s, -70, 5);
    expect(onPointerUp(s, T).action).toBe('review');
  });

  it('fires no action when |dx| < threshold (short swipe)', () => {
    let s = onPointerDown(0, 0);
    s = onPointerMove(s, 40, 0);
    expect(onPointerUp(s, T).action).toBeNull();
  });

  it('fires "known" exactly at threshold boundary (AC1)', () => {
    let s = onPointerDown(0, 0);
    s = onPointerMove(s, T, 0);
    expect(onPointerUp(s, T).action).toBe('known');
  });

  it('fires no action when axis is vertical (AC4 — allows page scroll)', () => {
    let s = onPointerDown(0, 0);
    s = onPointerMove(s, 5, 80);
    expect(onPointerUp(s, T).action).toBeNull();
  });

  it('fires no action when axis was never locked (tiny movement)', () => {
    let s = onPointerDown(0, 0);
    s = onPointerMove(s, 3, 2);
    expect(onPointerUp(s, T).action).toBeNull();
  });

  it('returns neutral state after up', () => {
    let s = onPointerDown(0, 0);
    s = onPointerMove(s, 70, 0);
    const { state } = onPointerUp(s, T);
    expect(state.active).toBe(false);
    expect(state.axisLocked).toBeNull();
    expect(state.dx).toBe(0);
  });
});

describe('onPointerCancel', () => {
  it('resets to neutral state', () => {
    const s = onPointerCancel();
    expect(s.active).toBe(false);
    expect(s.axisLocked).toBeNull();
    expect(s.dx).toBe(0);
  });
});

describe('computeProgress', () => {
  it('returns 0 when not active', () => {
    expect(computeProgress(createSwipeState(), T)).toBe(0);
  });

  it('returns 0 when axis is vertical', () => {
    let s = onPointerDown(0, 0);
    s = onPointerMove(s, 5, 80);
    expect(computeProgress(s, T)).toBe(0);
  });

  it('returns 0 when axis is unlocked', () => {
    let s = onPointerDown(0, 0);
    s = onPointerMove(s, 3, 2);
    expect(computeProgress(s, T)).toBe(0);
  });

  it('returns 1 at dx == threshold (fully right)', () => {
    let s = onPointerDown(0, 0);
    s = onPointerMove(s, T, 5);
    expect(computeProgress(s, T)).toBeCloseTo(1);
  });

  it('returns -1 at dx == -threshold (fully left)', () => {
    let s = onPointerDown(0, 0);
    s = onPointerMove(s, -T, -5);
    expect(computeProgress(s, T)).toBeCloseTo(-1);
  });

  it('clamps to 1 when dx > threshold', () => {
    let s = onPointerDown(0, 0);
    s = onPointerMove(s, T * 2, 5);
    expect(computeProgress(s, T)).toBe(1);
  });

  it('clamps to -1 when dx < -threshold', () => {
    let s = onPointerDown(0, 0);
    s = onPointerMove(s, -T * 2, -5);
    expect(computeProgress(s, T)).toBe(-1);
  });

  it('returns 0.5 at dx == threshold / 2', () => {
    let s = onPointerDown(0, 0);
    s = onPointerMove(s, T / 2, 0);
    expect(computeProgress(s, T)).toBeCloseTo(0.5);
  });
});
