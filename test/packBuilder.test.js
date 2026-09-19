// The one pack builder, and the thing it must never do.
//
// This function was written three times, and the copies had already drifted: only the C0 one honoured
// a row's `responseType`, `evaluator`, `allowReview`, `commonErrors` and per-row `version` — exactly
// the fields a content correction writes back. So a correction installed into a C1 or F1 pack would
// have been silently dropped by the builder that assembled it.
import test from 'node:test';
import assert from 'node:assert/strict';
import snapshot from './fixtures/c0ItemShape.json' with { type: 'json' };
import { DEFAULT_SOURCE_IDS, ROLE_SEQUENCE, makePack } from '../src/data/packBuilder.js';
import { c0PilotPacks } from '../src/data/packs.c0.draft.js';
import { c1Packs } from '../src/data/packs.c1.draft.js';
import { foundationPacks } from '../src/data/packs.foundation.draft.js';

// The one that matters. 96 of these items are pilot-approved by a parent decision on 2026-09-09, and
// an approval, a correction record, a durable session and a learner's attempt history are all keyed
// by item id. If consolidating three builders into one moved a single id, every one of those breaks.
test('no pilot-approved item moved when the three builders became one', () => {
  const actual = c0PilotPacks.map((pack) => ({
    id: pack.id,
    skillId: pack.skillId,
    items: pack.items.map((item) => ({
      id: item.id,
      role: item.role,
      evidenceEligibility: item.evidenceEligibility,
      responseType: item.responseType,
      evaluator: item.evaluator,
      version: item.version,
      transferGroup: item.transferGroup,
      difficulty: item.difficulty,
    })),
  }));
  assert.deepEqual(actual, snapshot);
  assert.equal(actual.reduce((sum, pack) => sum + pack.items.length, 0), 96);
});

const rows = (overrides = {}) => ROLE_SEQUENCE.map((_, index) => ({
  prompt: `Question ${index + 1}, long enough to be a real prompt.`,
  acceptedAnswers: ['a'],
  choices: [['a', 'first'], ['b', 'second'], ['c', 'third'], ['d', 'fourth']],
  explanation: `Because of the rule, for question ${index + 1}.`,
  ...overrides,
}));

test('a pack holds twenty-four objects in the roles a lesson expects', () => {
  const pack = makePack({ prefix: 'x1', skillId: 'XX.demo', title: 'T', rule: 'R', helpSteps: ['one'], rows: rows() });
  assert.equal(pack.items.length, 24);
  assert.deepEqual(pack.items.map((item) => item.role), ROLE_SEQUENCE);
  assert.equal(pack.id, 'x1.pack.xx.demo');
  assert.equal(pack.items[0].id, 'x1.xx.demo.01');
  assert.equal(pack.items[23].id, 'x1.xx.demo.24');
  assert.deepEqual(pack.sourceIds, DEFAULT_SOURCE_IDS);
  assert.throws(() => makePack({ prefix: 'x1', skillId: 'XX.demo', title: 'T', rule: 'R', helpSteps: [], rows: rows().slice(0, 12) }), /24 rows/);
});

// A worked example is read, never answered. Giving it an accepted answer would make it markable, and
// a lesson would then record an attempt against something the learner was only shown.
test('a worked example can never be answered', () => {
  const pack = makePack({ prefix: 'x1', skillId: 'XX.demo', title: 'T', rule: 'R', helpSteps: [], rows: rows() });
  for (const item of pack.items.filter((entry) => entry.role === 'worked_example')) {
    assert.equal(item.acceptedAnswers, undefined, 'a worked example became answerable');
    assert.equal(item.responseType, 'display');
    assert.equal(item.evidenceEligibility, 'instruction_only');
    assert.deepEqual(item.rubric, { displayOnly: true });
  }
  // And a guided item, which IS answered, still never counts as independent evidence.
  for (const item of pack.items.filter((entry) => entry.role === 'guided')) {
    assert.equal(item.evidenceEligibility, 'instruction_only');
  }
});

// The drift the consolidation fixes. These five fields are what a correction writes back, and two of
// the three old copies ignored every one of them.
test('a row’s own response type, evaluator, review flag, errors and version are honoured', () => {
  const pack = makePack({
    prefix: 'x1',
    skillId: 'XX.demo',
    title: 'T',
    rule: 'R',
    helpSteps: [],
    rows: rows({ responseType: 'text', evaluator: 'spelling', allowReview: true, commonErrors: ['a known slip'], version: 4 }),
  });
  const answered = pack.items.find((item) => item.role === 'independent');
  assert.equal(answered.responseType, 'text');
  assert.equal(answered.evaluator, 'spelling');
  assert.equal(answered.allowReview, true);
  assert.deepEqual(answered.commonErrors, ['a known slip']);
  assert.equal(answered.version, 4, 'a corrected item could not carry its new version');
});

// A pack says where its content sits in one way or the other, never both: an Alberta placement means
// "Alberta puts this below Grade 5", and outcome ids mean "this measures a Grade 5/6 outcome".
test('a pack cannot claim a below-grade placement and a Grade 5/6 outcome at once', () => {
  assert.throws(() => makePack({
    prefix: 'x1',
    skillId: 'XX.demo',
    title: 'T',
    rule: 'R',
    helpSteps: [],
    albertaPlacement: { albertaGrades: 'Grade 3' },
    rows: rows({ outcomeIds: ['conventions.grade5.01'] }),
  }), /two places at once|also names/);
});

// Nothing is released, whichever builder assembled it. The C0 items are `pilot_approved` — a real
// parent decision recorded on 2026-09-09 — which is a different thing: pilot evidence is derived into
// its own record and never mixes with released evidence.
test('nothing is released, and only an approved pack says more than not_released', () => {
  const approvedSkills = new Set(c0PilotPacks.map((pack) => pack.skillId));
  for (const pack of [...c0PilotPacks, ...c1Packs, ...foundationPacks]) {
    for (const item of pack.items) {
      assert.notEqual(item.releaseStatus, 'released', `${item.id} claims a release`);
      const allowed = approvedSkills.has(pack.skillId) ? ['not_released', 'pilot_approved'] : ['not_released'];
      assert.ok(allowed.includes(item.releaseStatus), `${item.id} is ${item.releaseStatus} in an unapproved pack`);
      assert.equal(item.packId, pack.id, `${item.id} names the wrong pack`);
      assert.equal(item.primarySkill, pack.skillId);
    }
    // And a foundation pack still names no Grade 5/6 outcome, which is the claim it exists to avoid.
    if (pack.albertaPlacement) assert.deepEqual(pack.curriculumOutcomeIds, []);
  }
});
