// Dot, the one character in the facelift, as data rather than as markup.
//
// The component draws whatever this returns, so every expression can be checked without a DOM. The
// rule that matters is in the design handoff and is not a style note: DOT ONLY TALKS WHEN ASKED. Her
// reactions are visual. Nothing here produces text, and the component announces nothing — the page's
// own aria-live region is what a screen reader hears.

export const DOT_EXPRESSIONS = ['idle', 'blink', 'happy', 'oops', 'thinking', 'pointing', 'asleep'];

// Milliseconds. Kept beside the expressions because the timings are part of the character: she blinks
// while idle, thinks after a quiet spell, and falls asleep after a long one.
export const DOT_TIMING = Object.freeze({
  breatheMs: 3600,
  hopMs: 600,
  shakeMs: 400,
  blinkMs: 160,
  blinkEveryMs: 4200,
  thinkingAfterMs: 15000,
  asleepAfterMs: 45000,
  pointingMs: 1400,
});

export function isDotExpression(value) {
  return DOT_EXPRESSIONS.includes(value);
}

const PARTS = {
  idle: { eyes: 'open', mouth: 'smile', animation: 'breathe' },
  blink: { eyes: 'closed', mouth: 'smile', animation: 'none' },
  happy: { eyes: 'arch', mouth: 'grin', tongue: true, cheeks: true, animation: 'hop' },
  oops: { eyes: 'wide', brows: 'worried', mouth: 'flat', animation: 'shake' },
  thinking: { eyes: 'squint', mouth: 'o', animation: 'none' },
  pointing: { eyes: 'open', mouth: 'smile', arm: true, animation: 'none' },
  asleep: { eyes: 'closed', mouth: 'none', zz: true, animation: 'none' },
};

export function dotFaceParts(expression = 'idle') {
  const name = isDotExpression(expression) ? expression : 'idle';
  const part = PARTS[name];
  return {
    expression: name,
    eyes: part.eyes,
    // Only an open eye has a white highlight in it. A closed or arched eye is a stroke, not a ball.
    highlights: part.eyes === 'open' || part.eyes === 'wide',
    brows: part.brows || 'none',
    mouth: part.mouth,
    tongue: Boolean(part.tongue),
    cheeks: Boolean(part.cheeks),
    arm: Boolean(part.arm),
    zz: Boolean(part.zz),
    animation: part.animation,
  };
}
