// Dot has seven expressions and one rule that is not decoration: she reacts visually and never
// announces. The first test holds the face, the second holds the rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DOT_EXPRESSIONS, DOT_TIMING, dotFaceParts, isDotExpression } from '../src/learning/dotExpressions.js';

test('every Dot expression resolves to a full, distinct set of face parts', () => {
  const seen = new Set();
  for (const expression of DOT_EXPRESSIONS) {
    const parts = dotFaceParts(expression);
    assert.equal(parts.expression, expression);
    for (const key of ['eyes', 'highlights', 'brows', 'mouth', 'tongue', 'cheeks', 'arm', 'zz', 'animation']) {
      assert.ok(key in parts, `${expression} has no ${key}`);
    }
    assert.equal(parts.cheeks, expression === 'happy', 'cheeks belong to happy alone');
    assert.equal(parts.arm, expression === 'pointing', 'the pointing arm belongs to pointing alone');
    assert.equal(parts.zz, expression === 'asleep', 'the zZ belongs to asleep alone');
    assert.equal(parts.brows === 'worried', expression === 'oops', 'worried brows belong to oops alone');
    assert.equal(parts.tongue, parts.mouth === 'grin', 'the tongue only shows inside the grin');
    if (['closed', 'arch', 'squint'].includes(parts.eyes)) {
      assert.equal(parts.highlights, false, 'a closed or drawn eye has no highlight in it');
    }
    const signature = JSON.stringify({ ...parts, expression: null });
    assert.ok(!seen.has(signature), `${expression} draws the same face as another expression`);
    seen.add(signature);
  }
  assert.equal(dotFaceParts('grumpy').expression, 'idle', 'an unknown expression falls back to idle');
  assert.equal(dotFaceParts().expression, 'idle');
  assert.equal(isDotExpression('happy'), true);
  assert.equal(isDotExpression('grumpy'), false);
  assert.ok(DOT_TIMING.thinkingAfterMs < DOT_TIMING.asleepAfterMs, 'she thinks before she sleeps');
});

test('source guard: Dot is decorative and never speaks', async () => {
  const component = await readFile(new URL('../src/components/Dot.jsx', import.meta.url), 'utf8');
  assert.match(component, /aria-hidden="true"/);
  assert.match(component, /dotFaceParts\(/);
  assert.doesNotMatch(component, /aria-live|role="status"|role="alert"|utils\/speech|useCancellableSpeech|speechSynthesis|playHintSound/);
  const css = await readFile(new URL('../src/components/Dot.module.css', import.meta.url), 'utf8');
  assert.match(css, /prefers-reduced-motion/);
});
