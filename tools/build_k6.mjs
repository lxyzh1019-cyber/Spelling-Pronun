// Build the full K–6 curriculum record from the PDF, in the same shape and id scheme as the Grade 5/6
// mapping that was verified by hand. Generated, never edited: re-running it must reproduce the file.
//
//   node tools/build_k6.mjs <k6.json> <out.json>
//
// The check that makes this trustworthy is not in this file. It is that the Grade 5 and Grade 6
// statements it produces are compared, statement for statement, against the 214 already read and
// mapped in `curriculum.alberta.elal.json`. A generaliser that silently changed those would be
// changing the only part of this anyone has checked.
import fs from 'node:fs';
import { extractGrades } from './extract_grades.mjs';

const ORDER = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const gradeKey = (grade) => (grade === 'Kindergarten' ? 'kindergarten' : `grade${grade.split(' ')[1]}`);

export function buildK6(pages) {
  const ideas = new Map();
  for (const entry of extractGrades(pages)) {
    if (!ideas.has(entry.organizingIdea)) {
      ideas.set(entry.organizingIdea, {
        id: slug(entry.organizingIdea),
        name: entry.organizingIdea,
        statement: entry.statement,
        sourcePages: [],
        grades: {},
      });
    }
    const idea = ideas.get(entry.organizingIdea);
    idea.sourcePages.push(...entry.pages);
    for (const [grade, value] of Object.entries(entry.grades)) {
      idea.grades[gradeKey(grade)] = {
        grade,
        guidingQuestion: value.guidingQuestion,
        learningOutcome: value.learningOutcome,
        knowledge: value.knowledge,
        understanding: value.understanding,
        skillsAndProcedures: value.skills.map((text, index) => ({
          id: `${idea.id}.${gradeKey(grade)}.${String(index + 1).padStart(2, '0')}`,
          text,
        })),
      };
    }
  }
  for (const idea of ideas.values()) {
    idea.sourcePages = [...new Set(idea.sourcePages)].sort((a, b) => a - b);
    idea.grades = Object.fromEntries(
      ORDER.map((grade) => [gradeKey(grade), idea.grades[gradeKey(grade)]]).filter(([, value]) => value),
    );
    // Where Alberta stops giving this organizing idea. Three of the nine end before Grade 6, and a
    // ladder that did not say so would leave a learner to assume the silence meant "not yet taught".
    const grades = Object.values(idea.grades).map((value) => value.grade);
    idea.firstGrade = grades[0];
    idea.lastGrade = grades[grades.length - 1];
  }
  return [...ideas.values()];
}

if (process.argv[1]?.endsWith('build_k6.mjs')) {
  const pages = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const organizingIdeas = buildK6(pages);
  const counts = Object.fromEntries(ORDER.map((grade) => [
    grade,
    organizingIdeas.reduce((sum, idea) => sum + (idea.grades[gradeKey(grade)]?.skillsAndProcedures.length || 0), 0),
  ]));
  fs.writeFileSync(process.argv[3], JSON.stringify({
    version: 1,
    status: 'extracted_awaiting_parent_verification',
    generatedBy: 'tools/build_k6.mjs',
    mappingReviewedBy: null,
    outcomeCountsByGrade: counts,
    organizingIdeas,
  }, null, 2) + '\n');
  console.log(counts, 'total', Object.values(counts).reduce((a, b) => a + b, 0));
  for (const idea of organizingIdeas) console.log(idea.name.padEnd(26), idea.firstGrade, '→', idea.lastGrade);
}
