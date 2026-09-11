// The two-device check's preflight.
//
// It answers one question: could this check be run right now? Not whether it has
// been run. A passing preflight only unlocks the recording controls; the parent
// still has to pick up two devices and do the sequence.
//
// There is deliberately no way to declare the setup complete by hand. Each step
// below either really happened or the check stays blocked and says why, because
// a result recorded without the setup would describe nothing.

export const TEST_LAB_SESSION_COLLECTION = 'spelling-testlab-sessions';
export const TEST_LAB_PURPOSE = 'human_check';
export const TEST_LAB_TTL_MINUTES = 120;

export const PREFLIGHT_REASONS = {
  signedOut: 'Sign in as the parent first. A local-only device has no account for a second device to share.',
  anonymous: 'This device is signed in as an anonymous guest. Parent email sign-in has to be enabled in Firebase and used here.',
  unreachable: 'Firebase could not be reached from this device. Check the connection and try again.',
  rulesMissing: 'The Test Lab collection is not readable yet. Deploy the reviewed rules, including spelling-testlab-sessions, then run the preflight again.',
  readback: 'The test record was written but could not be read back as its owner, so ownership is not proven.',
};

export function testLabSessionId(uid, testRunId) {
  return `${uid}__${testRunId}`;
}

export function buildTestLabSession({ uid, testRunId, deviceLabel, now = new Date() }) {
  return {
    testRunId,
    userId: uid,
    deviceLabel: String(deviceLabel || '').slice(0, 120),
    purpose: TEST_LAB_PURPOSE,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + TEST_LAB_TTL_MINUTES * 60_000).toISOString(),
  };
}

function failureReason(error) {
  const code = error?.code || '';
  if (code.includes('permission-denied')) return PREFLIGHT_REASONS.rulesMissing;
  if (code.includes('unavailable') || code.includes('network')) return PREFLIGHT_REASONS.unreachable;
  return PREFLIGHT_REASONS.unreachable;
}

// `write` and `read` are injected so this runs against a fake in tests and the
// real Firestore in the app; neither implementation is allowed to touch an
// ordinary collection, because the collection name is fixed here.
export async function twoDevicePreflight({ user, testRunId, deviceLabel, write, read, now = new Date() }) {
  const checkedAt = now.toISOString();
  if (!user) return { ok: false, reason: PREFLIGHT_REASONS.signedOut, checkedAt };
  if (user.isAnonymous) return { ok: false, reason: PREFLIGHT_REASONS.anonymous, checkedAt };

  const documentId = testLabSessionId(user.uid, testRunId);
  const record = buildTestLabSession({ uid: user.uid, testRunId, deviceLabel, now });
  try {
    await write(TEST_LAB_SESSION_COLLECTION, documentId, record);
  } catch (error) {
    return { ok: false, reason: failureReason(error), checkedAt };
  }

  let stored;
  try {
    stored = await read(TEST_LAB_SESSION_COLLECTION, documentId);
  } catch (error) {
    return { ok: false, reason: failureReason(error), checkedAt };
  }

  // Written is not enough: it has to come back, as this owner, marked as a test.
  if (!stored || stored.userId !== user.uid || stored.purpose !== TEST_LAB_PURPOSE) {
    return { ok: false, reason: PREFLIGHT_REASONS.readback, checkedAt };
  }
  return { ok: true, reason: '', checkedAt, documentId, ownerUid: user.uid };
}

// The Test Lab namespace is invisible to everything else by construction: no
// production query names this collection. Stated as a function so a test can
// assert it against the real collection list rather than trusting a comment.
export function isTestLabCollection(name) {
  return name === TEST_LAB_SESSION_COLLECTION;
}
