import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const rules = await readFile(new URL('../firestore.rules', import.meta.url), 'utf8');

test('legacy progress collection remains available under owner checks', () => {
  assert.match(rules, /match \/spelling-progress\/\{document=\*\*\}/);
  assert.match(rules, /request\.auth\.uid == resource\.data\.userId/);
});

test('attempt events are additive and immutable', () => {
  const attemptBlock = rules.match(/match \/spelling-attempts\/\{document\} \{([\s\S]*?)\n    \}/)?.[1];
  assert.ok(attemptBlock);
  assert.match(attemptBlock, /allow create:/);
  assert.match(attemptBlock, /allow get:.*document\.matches\(request\.auth\.uid \+ '_\.\*'\)/s);
  assert.match(attemptBlock, /allow list:.*resource\.data\.userId/s);
  assert.match(attemptBlock, /allow update, delete: if false/);
});

test('cloud sessions require owner identity, monotonic revisions, and explicit takeover epochs', () => {
  const sessionBlock = rules.match(/match \/spelling-sessions\/\{document\} \{([\s\S]*?)\n    \}/)?.[1];
  assert.ok(sessionBlock);
  assert.match(sessionBlock, /allow get:.*document\.matches\(request\.auth\.uid \+ '__\.\*'\).*request\.auth\.uid == resource\.data\.userId/s);
  assert.match(sessionBlock, /allow create:.*document\.matches\(request\.auth\.uid \+ '__\.\*'\)/s);
  assert.match(sessionBlock, /request\.resource\.data\.revision == resource\.data\.revision \+ 1/);
  assert.match(sessionBlock, /request\.resource\.data\.ownerEpoch == resource\.data\.ownerEpoch \+ 1/);
  assert.match(sessionBlock, /request\.resource\.data\.mode == resource\.data\.mode/);
  assert.match(sessionBlock, /request\.resource\.data\.contentVersion == resource\.data\.contentVersion/);
  assert.match(sessionBlock, /request\.resource\.data\.orderedItemIds == resource\.data\.orderedItemIds/);
  assert.match(sessionBlock, /allow delete: if false/);
});

test('Test Lab sessions are owner-only, marked as tests, and separate from learner sessions', () => {
  const block = rules.match(/match \/spelling-testlab-sessions\/\{document\} \{([\s\S]*?)\n    \}/)?.[1];
  assert.ok(block, 'the two-device preflight needs its own collection');
  // Owner-only in every direction, by both document name and stored owner.
  assert.match(block, /allow read:.*document\.matches\(request\.auth\.uid \+ '__\.\*'\).*request\.auth\.uid == resource\.data\.userId/s);
  assert.match(block, /allow create:.*request\.auth\.uid == request\.resource\.data\.userId/s);
  assert.match(block, /allow update:.*request\.auth\.uid == resource\.data\.userId/s);
  // A record here must declare itself a test, so it can never pass as anything else.
  assert.match(block, /request\.resource\.data\.purpose == 'human_check'/);
  // Deletable, because a test record is meant to be thrown away — unlike an attempt.
  assert.match(block, /allow delete: if request\.auth\.uid != null/);
  // It is its own collection, not a corner of the real one.
  const sessionBlock = rules.match(/match \/spelling-sessions\/\{document\} \{([\s\S]*?)\n    \}/)?.[1];
  assert.doesNotMatch(sessionBlock, /human_check/);
});
