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

// ————————————————————————————————————————————————————————————————————————————————————————————
// The fifth time, and the one the guard above could not see.
//
// 2026-09-19: `/diagnostic` was built, wired, tested, merged and deployed — and the parent could not
// find it. Every check above passed, because every check above asks whether a file is IMPORTED. The
// route existed. The page rendered. `diagnostic.k4.draft.js` had an importer. What it did not have
// was a link anyone would come across: the only one sat two thirds of the way down a 309-line
// `/parent`, under a heading that did not contain the word, reached by a link at the very bottom of
// Home below the badge shelf.
//
// A feature a person cannot find is unreachable in the only sense that matters to that person, and
// an import graph cannot tell you so. So this asks the other question: starting at Home, can a
// person CLICK their way to every route?
//
// The rule is the same as above — unreachable is allowed, but it has to be declared with a reason.
const ROUTE_ENTRY = '/';

// Routes nothing links to, each with the reason. A route here is a route a person can only reach by
// typing a URL, which for this app's users means not at all.
const ALLOWED_UNLINKED_ROUTES = {};

function routesFromApp() {
  const text = readFileSync(path.join(root, 'App.jsx'), 'utf8');
  return [...text.matchAll(/<Route\s+path="([^"]+)"\s+element=\{<(\w+)\s*\/>\}/g)]
    .map(([, route, component]) => ({ route, component }));
}

// Where each page component lives, so a link found in a file can be attributed to the route that
// renders it. Both the lazy imports and the eager one are read from App.jsx itself.
function componentFiles() {
  const text = readFileSync(path.join(root, 'App.jsx'), 'utf8');
  const files = {};
  for (const [, name, spec] of text.matchAll(/const (\w+) = lazy\(\(\) => import\('([^']+)'\)\)/g)) {
    files[name] = path.resolve(root, spec.replace(/^\.\//, '')) + '.jsx';
  }
  for (const [, name, spec] of text.matchAll(/^import (\w+) from '(\.\/pages\/[^']+)'/gm)) {
    files[name] = path.resolve(root, spec.replace(/^\.\//, '')) + '.jsx';
  }
  return files;
}

// Every `to="..."` in a file, plus the static prefix of a template link like `to={`/lesson/${id}`}`,
// because a parameterised route is linked by construction rather than by literal.
//
// It also reads link TABLES — `{ to: '/test', label: 'Spelling Test' }` rendered later as
// `to={game.to}`. The first version of this test missed both that and `to="/test?mode=daily"`, and
// reported `/test` as unreachable when Home links it twice. A guard that cries wolf gets an
// allowlist entry written for it, which is how a guard quietly stops guarding.
function linksIn(file) {
  const text = readFileSync(file, 'utf8');
  const links = [
    ...[...text.matchAll(/\bto=\{?["'`](\/[^"'`$]*)/g)].map((match) => match[1]),
    ...[...text.matchAll(/\bto:\s*["'`](\/[^"'`$]*)/g)].map((match) => match[1]),
  ];
  // A query string or a fragment is the same route to the router and to the person clicking it.
  return links.map((link) => link.split(/[?#]/)[0].replace(/\/$/, '') || '/');
}

// A file's links plus the links of every component it imports, since a page reached through a
// shared component still offers that component's links to the person looking at it.
function linksReachableFrom(file, seen = new Set()) {
  if (seen.has(file)) return [];
  seen.add(file);
  let links = [];
  try {
    links = linksIn(file);
  } catch {
    return [];
  }
  const text = readFileSync(file, 'utf8');
  for (const [, specifier] of text.matchAll(/from\s*['"](\.[^'"]+)['"]/g)) {
    const resolved = path.resolve(path.dirname(file), specifier);
    for (const candidate of [resolved, resolved + '.jsx', resolved + '.js']) {
      try {
        if (readFileSync(candidate, 'utf8')) {
          links = links.concat(linksReachableFrom(candidate, seen));
          break;
        }
      } catch { /* not this spelling */ }
    }
  }
  return links;
}

// A route matches a link when they are equal, or — for `/lesson/:sessionId` — when the link starts
// with the static part the route is built from.
const routeMatchesLink = (route, link) => {
  if (route === link) return true;
  const prefix = route.split('/:')[0];
  return route.includes('/:') && link.startsWith(prefix + '/');
};

test('source guard: every route can be reached by clicking, starting at the home page', () => {
  const routes = routesFromApp();
  const files = componentFiles();
  assert.ok(routes.length >= 15, 'the route table was not read');

  // Grow the set of routes a person can get to, one click at a time, until it stops growing.
  const reached = new Set([ROUTE_ENTRY]);
  for (let pass = 0; pass < routes.length + 1; pass += 1) {
    const before = reached.size;
    // The header is on every page, so its links are available from anywhere.
    const offered = linksReachableFrom(path.join(root, 'components', 'Header.jsx'));
    for (const { route, component } of routes) {
      if (!reached.has(route)) continue;
      const file = files[component];
      if (file) offered.push(...linksReachableFrom(file));
    }
    for (const { route } of routes) {
      if (offered.some((link) => routeMatchesLink(route, link))) reached.add(route);
    }
    if (reached.size === before) break;
  }

  const unlinked = routes.map(({ route }) => route).filter((route) => !reached.has(route));
  for (const route of unlinked) {
    assert.ok(
      ALLOWED_UNLINKED_ROUTES[route],
      `${route} cannot be reached by clicking from ${ROUTE_ENTRY}. A route a person can only reach by typing its URL is the defect that hid /diagnostic for a day: it existed, it rendered, it deployed, and the parent could not find it. Link it, or record here why it is unlinkable.`,
    );
  }
  for (const [route, reason] of Object.entries(ALLOWED_UNLINKED_ROUTES)) {
    assert.ok(unlinked.includes(route), `${route} is on the unlinked allowlist but something links to it now — remove the entry.`);
    assert.ok(reason.length > 40, `${route} has no real reason recorded`);
  }
});

// Findable is more than linked. The diagnostic was linked the whole time — once, from deep inside
// the longest page in the app. The parent's own words were "I did not find diagnostic in the app".
// So the link that matters is the one on the page a person actually starts from.
test('the diagnostic is offered on the home page, not only buried in the parent view', () => {
  const home = readFileSync(path.join(root, 'pages', 'Home.jsx'), 'utf8');
  assert.match(home, /to="\/diagnostic"/, 'Home no longer offers the diagnostic; it was unfindable the last time that was true');
  // And named in words the parent would recognise, rather than hidden behind a phrase like
  // "finding out what was missed", which is what it was called when they went looking for it.
  const link = home.match(/to="\/diagnostic">([^<]+)</);
  assert.ok(link, 'the diagnostic link has no visible text');
  assert.match(link[1], /diagnostic/i, `the home link reads "${link?.[1]}" and never says the word the parent searched for`);
  // It must sit above the games furniture. Below the badge shelf is where it was, and where it was
  // not found.
  assert.ok(
    home.indexOf('to="/diagnostic"') < home.indexOf('<BadgeShelf'),
    'the diagnostic sits below the badge shelf and leaderboard again, which is where the parent failed to find it',
  );
});
