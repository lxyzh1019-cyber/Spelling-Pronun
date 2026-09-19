import fs from 'node:fs';
import { parsePage } from './columns.mjs';
const pages = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

// A Grade 5/6 page is one whose two grade headers say so.
const isG56 = (parsed) => {
  const text = Object.values(parsed).flat().map((l) => l.text).join(' ');
  return /\bGrade 5\b/.test(text) && /\bGrade 6\b/.test(text);
};

// A statement ends where the next one starts at the column's left margin.
//
// Sentence-final punctuation is not enough on its own: several statements end in a bullet list, and a
// bullet's own wrapped continuation looks exactly like the start of a new statement in flattened text.
// The layout distinguishes them — a bullet and its continuation are indented, a new statement is not —
// so the left margin of the column is what actually marks the boundary.
function statementsFrom(lines) {
  if (!lines.length) return [];
  const margin = Math.min(...lines.map((l) => l.x));
  const out = [];
  let current = '';
  let prevIndented = false;
  const flush = () => { if (current.trim()) out.push(current.replace(/\s+/g, ' ').trim()); current = ''; };
  for (const line of lines) {
    const { text, x } = line;
    if (/^(Knowledge|Understanding|Skills & Procedures|Grade \d)$/.test(text)) { flush(); prevIndented = false; continue; }
    const bullet = text.startsWith('\u2022');
    const indented = bullet || x > margin + 4;
    const atMargin = !indented;
    if (current && atMargin && (prevIndented || (/[.]$/.test(current.trim()) && !/,$/.test(current.trim())))) flush();
    current += (current ? ' ' : '') + text;
    prevIndented = indented;
  }
  flush();
  return out;
}

const ideas = [];
let currentIdea = null;
for (const page of pages) {
  const parsed = parsePage(page);
  if (!isG56(parsed)) continue;
  const k5 = parsed['g5.knowledge'] || [];
  const ideaLine = k5.find((l) => /^[A-Z][A-Za-z ]+: [A-Z]/.test(l.text) && l.text.length > 60);
  if (ideaLine) {
    const [name, ...rest] = ideaLine.text.split(':');
    currentIdea = {
      organizingIdea: name.trim(),
      statement: rest.join(':').trim(),
      pages: [],
      grade5: { guidingQuestion: '', learningOutcome: '', knowledge: [], understanding: [], skills: [] },
      grade6: { guidingQuestion: '', learningOutcome: '', knowledge: [], understanding: [], skills: [] },
    };
    ideas.push(currentIdea);
  }
  if (!currentIdea) continue;
  currentIdea.pages.push(page.page);
  for (const [grade, prefix] of [['grade5', 'g5'], ['grade6', 'g6']]) {
    for (const [field, col] of [['knowledge', 'knowledge'], ['understanding', 'understanding'], ['skills', 'skills']]) {
      let lines = parsed[`${prefix}.${col}`] || [];
      if (col === 'knowledge') {
        // the header rows share this column; peel them off when they are present
        const qIdx = lines.findIndex((l) => /\?$/.test(l.text) && l.text.length < 140);
        if (qIdx >= 0) {
          currentIdea[grade].guidingQuestion ||= lines[qIdx].text;
          const kIdx = lines.findIndex((l) => l.text === 'Knowledge');
          if (kIdx > qIdx) {
            currentIdea[grade].learningOutcome ||= lines.slice(qIdx + 1, kIdx).map((l) => l.text).join(' ').replace(/\s+/g, ' ').trim();
          }
          lines = kIdx >= 0 ? lines.slice(kIdx) : lines.slice(qIdx + 1);
        }
        lines = lines.filter((l) => !/^[A-Z][A-Za-z ]+: [A-Z]/.test(l.text) || l.text.length <= 60);
      }
      currentIdea[grade][field].push(...statementsFrom(lines));
    }
  }
}
fs.writeFileSync(process.argv[3], JSON.stringify(ideas, null, 2));
for (const i of ideas) {
  console.log(i.organizingIdea.padEnd(26), 'pages', i.pages.join(','),
    '| G5 k/u/s', i.grade5.knowledge.length, i.grade5.understanding.length, i.grade5.skills.length,
    '| G6 k/u/s', i.grade6.knowledge.length, i.grade6.understanding.length, i.grade6.skills.length);
}
