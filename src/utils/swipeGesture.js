// Pure swipe-gesture state machine driven by pointer events.
// All functions are side-effect-free; the caller owns the state object.
//
// --swipe-threshold (CSS custom property on the card container, default 60 px)
// is read by FlashCard.jsx at runtime — this module only uses the numeric value
// passed in by the caller.

export function createSwipeState() {
  return { active: false, startX: 0, startY: 0, axisLocked: null, dx: 0 };
}

export function onPointerDown(x, y) {
  return { active: true, startX: x, startY: y, axisLocked: null, dx: 0 };
}

export function onPointerMove(state, x, y) {
  if (!state.active) return state;
  const dx = x - state.startX;
  const dy = y - state.startY;
  let { axisLocked } = state;
  // Lock axis on the first movement that clears the 5 px noise floor.
  if (axisLocked === null && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
    axisLocked = Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical';
  }
  return { ...state, dx, axisLocked };
}

// Returns { state, action: null | 'known' | 'review' }
export function onPointerUp(state, threshold) {
  const neutral = { active: false, startX: 0, startY: 0, axisLocked: null, dx: 0 };
  if (!state.active || state.axisLocked !== 'horizontal') {
    return { state: neutral, action: null };
  }
  const action = Math.abs(state.dx) >= threshold
    ? (state.dx > 0 ? 'known' : 'review')
    : null;
  return { state: neutral, action };
}

export function onPointerCancel() {
  return { active: false, startX: 0, startY: 0, axisLocked: null, dx: 0 };
}

// Maps current drag offset to a normalised −1…1 progress value.
// Returns 0 whenever a swipe isn't in progress or the axis is vertical.
export function computeProgress(state, threshold) {
  if (!state.active || state.axisLocked !== 'horizontal') return 0;
  return Math.max(-1, Math.min(1, state.dx / threshold));
}
