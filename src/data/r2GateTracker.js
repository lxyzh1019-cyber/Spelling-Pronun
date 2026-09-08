export const r2GateTracker = [
  {
    id: 'c0-audio-review',
    label: 'C0 Part-A audio listening check and educational review',
    state: 'blocked',
    detail: 'The 24 spoken prompts need a recorded listening check confirming the audio matches its transcript, is intelligible on the target iPad, and is labelled with the voice actually used. Model audio is acceptable when labelled truthfully; a human recording is required only for isolated phoneme audio. The 16 decoding and speaking prompts need an educational review of their targets and rubrics.',
  },
  {
    id: 'shared-identity',
    label: 'Shared parent identity and two-device session ownership',
    state: 'requires_parent_setup',
    detail: 'Enable Email/Password and deploy the reviewed Firestore rules, then verify claim, takeover, queued saves, and stale-write rejection with two linked clients.',
  },
  {
    id: 'ipad-check',
    label: 'Real iPad Safari and home-screen checks',
    state: 'requires_device_test',
    detail: 'Record playback, microphone, interruption, resume, offline, and install behavior on the target iPad. Desktop emulation does not close this gate.',
  },
  {
    id: 'pilot-approval',
    label: 'Approved-for-private-pilot decision',
    state: 'requires_parent_setup',
    detail: 'Reviewed and integrated C0 content can run the complete loop once the parent records a pilot approval. Until then no content is pilot-approved, and pilot answers are kept in a separate record that is never validated progress.',
  },
  {
    id: 'family-pilot',
    label: 'Family pilot',
    state: 'blocked',
    detail: 'Start only after the pre-pilot gates are complete. Record real visits, delayed review, and any content or navigation disagreement.',
  },
  {
    id: 'c1-c2',
    label: 'C1/C2 curriculum',
    state: 'prepared_not_authored',
    detail: 'All 38 future packs are mapped to workshops and episodes, but final authoring waits for pilot feedback and the identified source-review gaps.',
  },
];

export function gateStateLabel(state) {
  return {
    blocked: 'Blocked',
    requires_parent_setup: 'Needs parent setup',
    requires_device_test: 'Needs real-device test',
    prepared_not_authored: 'Prepared, not authored',
  }[state] || 'Unknown';
}
