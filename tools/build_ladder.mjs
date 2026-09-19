// Build the grade ladder: for every skill this app teaches, which grade Alberta introduces it, which
// grade finishes with it, and what the curriculum actually says at each rung.
//
//   node tools/build_ladder.mjs
//
// Every outcome id in `curriculum.ladder.rungs.js` is resolved against `curriculum.k6.json` and the
// build FAILS on one that does not exist. That is the whole guarantee: a rung cannot name a grade the
// curriculum does not state, because the grade is read back off the resolved outcome rather than
// typed alongside it. Re-running must reproduce the file byte for byte.
import fs from 'node:fs';
import { skillRungs, noCurriculumBasis, disputedByLadder } from '../src/data/curriculum.ladder.rungs.js';

const ORDER = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
const skills = JSON.parse(fs.readFileSync(new URL('../src/data/skills.json', import.meta.url), 'utf8'));
const k6 = JSON.parse(fs.readFileSync(new URL('../src/data/curriculum.k6.json', import.meta.url), 'utf8'));

const byId = new Map();
for (const idea of k6.organizingIdeas) {
  for (const grade of Object.values(idea.grades)) {
    for (const outcome of grade.skillsAndProcedures) {
      byId.set(outcome.id, { ...outcome, grade: grade.grade, organizingIdea: idea.name });
    }
  }
}

function resolve(ids = [], skillId, field) {
  return ids.map((id) => {
    const outcome = byId.get(id);
    if (!outcome) throw new Error(`${skillId}.${field}: ${id} is not an outcome in curriculum.k6.json`);
    return { id, grade: outcome.grade, organizingIdea: outcome.organizingIdea, text: outcome.text };
  });
}

// The grade of a rung is the EARLIEST grade among its outcomes for "introduced" and the LATEST for
// "consolidated". Reading it off the outcomes is what stops a rung asserting a grade of its own.
const earliest = (list) => list.map((o) => o.grade).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))[0];
const latest = (list) => list.map((o) => o.grade).sort((a, b) => ORDER.indexOf(b) - ORDER.indexOf(a))[0];

export function buildLadder() {
  const skillIds = (Array.isArray(skills) ? skills : skills.skills).map((skill) => skill.id);
  const placed = [];
  for (const [skillId, rung] of Object.entries(skillRungs)) {
    if (!skillIds.includes(skillId)) throw new Error(`${skillId} is on the ladder but is not a skill in skills.json`);
    const introduced = resolve(rung.introducedBy, skillId, 'introducedBy');
    const consolidated = resolve(rung.consolidatedBy, skillId, 'consolidatedBy');
    const also = resolve(rung.alsoAt, skillId, 'alsoAt');
    if (!introduced.length || !consolidated.length) throw new Error(`${skillId} has an empty rung`);
    const introducedAt = earliest(introduced);
    const consolidatedAt = latest(consolidated);
    if (ORDER.indexOf(consolidatedAt) < ORDER.indexOf(introducedAt)) {
      throw new Error(`${skillId} is consolidated at ${consolidatedAt}, before it is introduced at ${introducedAt}`);
    }
    placed.push({
      skillId,
      introducedAt,
      consolidatedAt,
      // Alberta finishes with three organizing ideas before Grade 6. A skill that consolidates below
      // Grade 5 is one a Grade 5 child revisits, and the app says so rather than letting them assume
      // everything on the home screen is at their grade.
      endsBeforeGrade5: ORDER.indexOf(consolidatedAt) < ORDER.indexOf('Grade 5'),
      // Nothing is mapped past Grade 6 yet. The 7–9 program is built from General Outcomes 1–5 and
      // 10–12 is streamed by course, not grade; neither is the same scale as the 2022 K–6 curriculum,
      // so an empty list here is the honest answer and a guessed rung would not be.
      extendedAt: [],
      scaleNote: 'Grades 7–12 are not on this ladder. Alberta’s 7–9 program is organised by General Outcomes 1–5 and its 10–12 program by course (ELA 10-1, 10-2, 20-1, 30-1), neither of which is the grade-by-grade scale used K–6. Placing a rung there would mean inventing a correspondence the curriculum does not state.',
      evidence: { introducedBy: introduced, consolidatedBy: consolidated, alsoAt: also },
      ...(rung.note ? { note: rung.note } : {}),
    });
  }
  const unplaced = skillIds.filter((id) => !skillRungs[id]);
  for (const id of unplaced) {
    if (!noCurriculumBasis[id]) throw new Error(`${id} is neither placed on the ladder nor given a reason for having no place`);
  }
  for (const id of Object.keys(noCurriculumBasis)) {
    if (skillRungs[id]) throw new Error(`${id} is both placed on the ladder and said to have no place on it`);
    if (!skillIds.includes(id)) throw new Error(`${id} has no place on the ladder and is not a skill either`);
  }
  return {
    version: 1,
    status: 'ladder_awaiting_parent_verification',
    generatedBy: 'tools/build_ladder.mjs',
    // Unchanged and deliberate. A ladder is a reading of a curriculum, and until a person has read it
    // this app must not tell a child which grade they are working at on the strength of it.
    mappingReviewedBy: null,
    mappingReviewNote: 'Every rung cites outcome ids that resolve against curriculum.k6.json, which was extracted from the PDF’s own text layer. That the ids resolve says the quotation is real; it does not say the judgement is right. Nothing in the app may present a grade to a learner as fact while this is null.',
    source: k6.status,
    organizingIdeaRange: Object.fromEntries(k6.organizingIdeas.map((idea) => [idea.name, `${idea.firstGrade} to ${idea.lastGrade}`])),
    skills: placed.sort((a, b) => a.skillId.localeCompare(b.skillId)),
    noCurriculumBasis,
    disputedByLadder,
  };
}

if (process.argv[1]?.endsWith('build_ladder.mjs')) {
  const ladder = buildLadder();
  fs.writeFileSync(new URL('../src/data/curriculum.ladder.json', import.meta.url), JSON.stringify(ladder, null, 2) + '\n');
  const byGrade = new Map();
  for (const skill of ladder.skills) byGrade.set(skill.introducedAt, (byGrade.get(skill.introducedAt) || 0) + 1);
  console.log('placed', ladder.skills.length, 'of', ladder.skills.length + Object.keys(noCurriculumBasis).length, 'skills');
  for (const grade of ORDER) if (byGrade.get(grade)) console.log(' introduced at', grade.padEnd(13), byGrade.get(grade));
  console.log(' revisiting at Grade 5 (Alberta finishes before then):', ladder.skills.filter((s) => s.endsBeforeGrade5).map((s) => s.skillId).join(', '));
}
