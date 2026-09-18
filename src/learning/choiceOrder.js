// Deterministic display order for multiple-choice options.
//
// Why this exists: every renderer used to map `item.choices` in its authored order, and the authored
// keys follow patterns (the spelling pack cycles b, a, c; assessment Part B alternates a, b). A learner
// who notices the pattern scores without reading, and a retake shows identical positions, so a repeat
// measures memory of a position rather than the skill.
//
// The order is derived from a seed rather than from `Math.random`, because a lesson or assessment can be
// reloaded, resumed in another tab, or restored from a durable session. A fresh random order on each
// render would move the options under the learner's finger mid-question. Seeding on the session and the
// item gives one stable order per item per sitting, and a different order in the next sitting.
//
// The choice objects are returned unchanged, so `choice.id` still identifies the answer. Nothing about
// scoring, evidence or the stored attempt depends on display position.

// xmur3: string -> 32-bit seed. mulberry32: seed -> uniform [0, 1). Both are small, well-known and
// deterministic across engines, which a test can pin.
function seedFrom(text) {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function randomFrom(seedText) {
  let state = seedFrom(seedText)();
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// An audio choice is labelled `Recording 1`, `Recording 2`, … and the learner decides by listening, so
// its position carries no answer information and there is no pattern to learn. The Test Lab derives its
// checking rows from these choices by index, and the parent's listening check records a result against
// `Recording 2`, so reordering them on screen would make the parent's own notes point at the wrong
// recording. They are left in authored order deliberately.
export function shouldOrderChoices(item) {
  return Boolean(item?.choices) && item.choices.length > 1 && item.responseType !== 'audio_choice';
}

// Returns the item's choices in a stable, seed-derived order. Same seed in, same order out.
export function orderChoices(item, seed) {
  if (!shouldOrderChoices(item)) return item?.choices || [];
  const next = randomFrom(`${seed ?? ''}:${item.id}`);
  const ordered = [...item.choices];
  for (let i = ordered.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
  }
  return ordered;
}

// The one impure function here. A sitting mints its seed once and stores it in the durable session, so
// the order survives a reload, a resumed tab and a restored cloud session, and only a genuinely new
// sitting reshuffles. Kept separate from `orderChoices` so every rule above stays testable.
export function newOrderSeed() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
