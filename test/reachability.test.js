// source guard: this test does not execute any component. It reads files as text and resolves the
// import graph to find code and content that nothing can reach.
//
// It exists because this repository has now shipped the same failure four times:
//
//   DEF-30  `withIds` and `slug` were extracted out of WordProvider and the import was not added.
//           The whole app failed to render with 192 tests passing.
//   DEF-56  192 questions and 5 episodes were authored into a place with no route to a child.
//   2026-09-19  the ten story episodes of chapters 2 to 6 — fixed in the same plan as DEF-56,
//           item four, which was written down and then not done.
//   2026-09-19  the 48-question diagnostic and `diagnosticReport.js`, built hours after DEF-56 was
//           fixed. The approval gate protects lesson packs; a diagnostic is not a lesson pack.
//
// `componentImports.test.js` guards the forward direction — a helper a component CALLS must be
// imported. This guards the reverse, which is the one that keeps happening: a module or a content
// file that nothing imports at all.
//
// The rule is not "everything must be reachable". Plenty of modules here are legitimately build-time
// or test-time. The rule is that being unreachable must be DECLARED, with a reason, so it is a known
// state rather than a discovery six weeks later.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..', 'src');

function filesUnder(dir, match) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(full, match);
    return match(entry.name) ? [full] : [];
  });
}

const sourceFiles = filesUnder(root, (name) => /\.(js|jsx)$/.test(name));

// Every specifier imported anywhere under src, resolved to an absolute path. A file is "reachable"
// when something under src imports it; the entry points are main.jsx and App.jsx, and everything a
// page pulls in follows from them.
function importedPaths() {
  const imported = new Set();
  for (const file of sourceFiles) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g)) {
      const specifier = match[1];
      const resolved = path.resolve(path.dirname(file), specifier);
      // Written with and without an extension across this repo; record both spellings.
      imported.add(resolved);
      for (const extension of ['.js', '.jsx', '.json']) imported.add(resolved + extension);
    }
  }
  return imported;
}

// Modules that nothing under src imports, each with the reason it is allowed to be that way.
// Adding a name here is a claim, and the claim has to be true: these are all reached by `test/` or
// `tools/`, which is what makes them build-time rather than dead.
const ALLOWED_UNREACHED_MODULES = {
  'learning/contentValidator.js': 'Content governance. Run by test/ and tools/ to validate authored content before it ships; nothing renders it.',
  'learning/contentManifest.js': 'Content governance. Builds the manifest that tests assert against.',
  'learning/contentReview.js': 'Content governance. Checks review records; the parent surface reads the records themselves, not this.',
  'learning/curriculumPreparation.js': 'Content governance. Validates the C1/C2 preparation record in tests.',
  'learning/storyResearchPlan.js': 'Content governance. Validates the story research record in tests.',
  'learning/readability.js': 'Used by tests and by tools/ to hold the story and explanation reading bands. Nothing in the app measures readability at runtime.',
  'learning/sessionEngine.js': 'REAL DEBT, declared rather than discovered. CLAUDE.md already describes it as "tested, not yet wired to a page". It is a complete session engine with no page behind it. Recorded here so it stays a known gap.',
};

// Authored content with no runtime importer is the exact shape of DEF-56, and the check that would
// have caught both the story file and the diagnostic.
const ALLOWED_UNREACHED_DATA = {
  'data/curriculum.k6.json': 'The 813-outcome K\u20136 extraction. tools/build_ladder.mjs resolves the ladder against it and tests diff it against the hand-verified mapping; the app reads curriculum.ladder.json, which is generated from it.',
  'data/curriculum.ladder.rungs.js': 'The hand-authored ladder table. tools/build_ladder.mjs turns it into curriculum.ladder.json, which is what the app reads.',
  'data/curriculum.c1-c2.preparation.json': 'The C1/C2 preparation record. Read by tests.',
  'data/story.research.c1-c2.json': 'Research notes behind the C1/C2 story. Read by tests; no episode is generated from it at runtime.',
  'data/pilotFixtures.js': 'Test fixtures for the pilot lifecycle. Deliberately never imported by the app.',
  'data/sources.json': 'Source registry, read by tests to check that every episode and pack cites a source that exists.',
  // The lifecycle records, and a gap worth naming rather than waving through. The app enforces the
  // lifecycle through the STATUS FIELDS on each item, which is why these files are not imported. But
  // it also means /parent cannot show the parent what has already been challenged, reviewed or
  // integrated \u2014 only that something is waiting. Surfacing them is worth doing; until it is, this
  // is a declared gap rather than an accident.
  'data/reviews.c0.json': 'Challenge record for the C0 packs. Read by tests. Not surfaced at /parent \u2014 see the note above.',
  'data/reviews.assessment.c0.json': 'Challenge record for the C0 assessment forms. Read by tests. Not surfaced at /parent.',
  'data/reviews.story.c0.json': 'Challenge record for the chapter 1 episodes. Read by tests. Not surfaced at /parent.',
  'data/reviews.educational.c0.json': 'The parent\u2019s educational review of the C0 packs. Read by tests. Not surfaced at /parent.',
  'data/reviews.educational.assessment.c0.json': 'The parent\u2019s educational review of the assessment forms. Read by tests. Not surfaced at /parent.',
  'data/reviews.educational.story.c0.json': 'The parent\u2019s educational review of the chapter 1 episodes. Read by tests. Not surfaced at /parent.',
  'data/integration.c0.json': 'Integration record for the C0 batch. Read by tests. Not surfaced at /parent.',
  'data/story.ledger.json': 'Generated by tools/build_story_ledger.mjs and asserted by tests. The app does not read it, so the 12-of-12 count is not shown to the parent anywhere \u2014 another declared gap.',
};

const relative = (file) => path.relative(root, file).split(path.sep).join('/');

test('source guard: no module under learning or persistence is unreachable without a stated reason', () => {
  const imported = importedPaths();
  const orphans = sourceFiles
    .filter((file) => /^(learning|persistence)\//.test(relative(file)))
    .filter((file) => !imported.has(file))
    .map(relative);

  for (const orphan of orphans) {
    assert.ok(
      ALLOWED_UNREACHED_MODULES[orphan],
      `${orphan} is imported by nothing under src/. Either wire it to a page, or add it to ALLOWED_UNREACHED_MODULES with the reason it is build-time only.`,
    );
  }
  // And the allowlist may not rot: a name here that IS reachable is a stale claim.
  for (const [name, reason] of Object.entries(ALLOWED_UNREACHED_MODULES)) {
    assert.ok(orphans.includes(name), `${name} is on the unreachable allowlist but something imports it now — remove the entry.`);
    assert.ok(reason.length > 40, `${name} has no real reason recorded`);
  }
});

test('source guard: no authored content file is unreachable without a stated reason', () => {
  const imported = importedPaths();
  const dataFiles = filesUnder(path.join(root, 'data'), (name) => /\.(js|json)$/.test(name));
  const orphans = dataFiles.filter((file) => !imported.has(file)).map(relative);

  for (const orphan of orphans) {
    assert.ok(
      ALLOWED_UNREACHED_DATA[orphan],
      `${orphan} is imported by nothing under src/. Content with no path to a user is how 192 questions and 10 episodes came to be unusable. Wire it, or record why it is author-time only.`,
    );
  }
  for (const [name, reason] of Object.entries(ALLOWED_UNREACHED_DATA)) {
    assert.ok(orphans.includes(name), `${name} is on the unreachable allowlist but something imports it now — remove the entry.`);
    assert.ok(reason.length > 40, `${name} has no real reason recorded`);
  }
});

// The four artifacts this guard was written for. Each one is now reached; naming them individually
// means a regression says which of the four came back rather than just "something is orphaned".
test('the content that was unreachable is reachable now', () => {
  const imported = importedPaths();
  const mustBeReached = [
    'data/story.c1.draft.json',
    'data/diagnostic.k4.draft.js',
    'learning/diagnosticReport.js',
    'data/packs.punctuation.draft.js',
    'data/packs.sentences.draft.js',
    'data/pilotApproval.batches.json',
  ];
  for (const name of mustBeReached) {
    assert.ok(imported.has(path.join(root, name)), `${name} is unreachable again`);
  }
});
