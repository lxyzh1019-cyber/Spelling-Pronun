// Extract Alberta ELAL (K–6) outcomes for any grade, from the PDF's own text layer.
//
// The curriculum is a table. Kindergarten to Grade 2 share a page in three columns; Grades 3/4 and
// Grades 5/6 share a page in two. Read as flat text the columns interleave and every statement risks
// being attributed to the wrong grade — a mapping quietly false rather than obviously broken (DEF-53).
//
// Column boundaries are DERIVED from each page's own header row ("Knowledge", "Understanding",
// "Skills & Procedures") rather than hardcoded, so the same code reads both layouts and cannot drift
// if a layout changes. A continuation page carries no header row, so it inherits the boundaries of
// the page that opened its organizing idea.
//
//   node tools/extract_grades.mjs <k6.json> <out.json> [gradeFilter]
//
// where <k6.json> comes from `tools/extract2.mjs` and holds every text item with its x/y position.

import fs from 'node:fs';

const HEADERS = ['Knowledge', 'Understanding', 'Skills & Procedures'];
const GRADE = /^(Kindergarten|Grade \d)$/;
const FOOTER = /Government of Alberta|Curriculum$|Implemented September|^Page \d+$|April 2022/;
const PAD = 12;

// The column geometry of a grade band, derived from every page of that band at once.
//
// Per-page derivation does not work, for two reasons the PDF only shows on certain pages:
//
//  * A grade's columns can BEGIN on the continuation page. Page 13 heads the Phonics table with
//    Kindergarten and Grade 1 columns only; the Grade 2 statements start overleaf on page 14, which
//    carries no header row at all. Reading page 13 alone says Grade 2 has no phonics, which is false.
//  * "Understanding" also occurs as an ordinary word inside statements ("...can be enhanced by..."),
//    so the header row is the row at the modal y, not every item whose text matches a header.
//
// Grade labels, by contrast, are printed on every page of a band at fixed x. So the band is keyed by
// its labels, its column boundaries are taken from whichever pages of it do print a full header row,
// and every page of the band — header row or not — is read through the same geometry.
function bandKey(page) {
  const labels = page.items
    .filter((item) => GRADE.test(item.s.trim()))
    .sort((a, b) => a.x - b.x);
  return labels.length ? labels.map((item) => `${item.s.trim()}@${Math.round(item.x)}`).join('|') : null;
}

function headerRow(page) {
  const candidates = page.items.filter((item) => HEADERS.includes(item.s.trim()));
  if (candidates.length < 3) return [];
  // The row the most of them share. A stray word in a statement never has company at its own y.
  const tally = new Map();
  for (const item of candidates) {
    const y = [...tally.keys()].find((candidate) => Math.abs(candidate - item.y) <= 2) ?? item.y;
    tally.set(y, (tally.get(y) || 0) + 1);
  }
  const [row] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
  return candidates.filter((item) => Math.abs(item.y - row) <= 2).sort((a, b) => a.x - b.x);
}

export function bandLayouts(pages) {
  const bands = new Map();
  for (const page of pages) {
    const key = bandKey(page);
    if (!key) continue;
    if (!bands.has(key)) bands.set(key, { grades: key.split('|').map((part) => part.split('@')[0]), xs: [] });
    bands.get(key).xs.push(...headerRow(page).map((item) => item.x));
  }
  const layouts = new Map();
  for (const [key, band] of bands) {
    // Cluster the observed header positions. Every page of a band prints them at the same x, so a
    // cluster is a column and the count of clusters must be three per grade or the band is not a table.
    const clusters = [];
    for (const x of band.xs.sort((a, b) => a - b)) {
      const last = clusters[clusters.length - 1];
      if (last && x - last[last.length - 1] <= 6) last.push(x);
      else clusters.push([x]);
    }
    if (!clusters.length || clusters.length !== band.grades.length * 3) continue;
    // The header label is CENTRED over its column, not aligned to its left edge: "Knowledge" sits at
    // x=228 above content that starts at x=169. Using the header's own x as the boundary therefore
    // shifts every column one place left and empties the last one. The midpoint between two adjacent
    // headers is the real divide, and it needs no knowledge of either layout's measurements.
    const starts = clusters.map((group) => group[0]);
    const width = Math.max(...pages.filter((page) => bandKey(page) === key).map((page) => page.width));
    const bounds = starts.map((x, i) => ({
      key: `${band.grades[Math.floor(i / 3)]}|${HEADERS[i % 3]}`,
      min: i === 0 ? 0 : Math.round((starts[i - 1] + x) / 2),
      max: i + 1 < starts.length ? Math.round((x + starts[i + 1]) / 2) : width + PAD,
    }));
    // The row-label gutter (Organizing Idea, Guiding Question, Learning Outcome) sits at x≈30 on every
    // page. The rows those labels name — the organizing-idea sentence, the question, the outcome — all
    // start at x≈169 whatever the layout, which on a three-grade page is LEFT of the first Knowledge
    // column at x=200. So the first column has to reach back to the gutter or those rows are dropped,
    // and the organizing idea is never detected at all.
    const labelMax = 100;
    bounds[0].min = labelMax;
    layouts.set(key, { grades: band.grades, bounds, labelMax });
  }
  return layouts;
}

function linesFor(page, layout) {
  const buckets = new Map();
  for (const item of page.items) {
    if (item.x < layout.labelMax) continue;
    const column = layout.bounds.find((bound) => item.x >= bound.min && item.x < bound.max);
    if (!column) continue;
    if (!buckets.has(column.key)) buckets.set(column.key, new Map());
    const rows = buckets.get(column.key);
    const y = [...rows.keys()].find((candidate) => Math.abs(candidate - item.y) <= 2) ?? item.y;
    if (!rows.has(y)) rows.set(y, []);
    rows.get(y).push(item);
  }
  const out = {};
  for (const [key, rows] of buckets) {
    out[key] = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([y, items]) => ({
        y,
        x: Math.min(...items.map((item) => item.x)),
        text: items.sort((a, b) => a.x - b.x).map((item) => item.s).join('').replace(/\s+/g, ' ').trim(),
      }))
      .filter((line) => line.text && !FOOTER.test(line.text));
  }
  return out;
}

// A statement ends where the next one starts at the column's left margin. Sentence-final punctuation
// is not enough: several statements end in a bullet list, and a bullet's own wrapped continuation
// looks exactly like the start of a new statement in flattened text. The layout distinguishes them.
function statementsFrom(lines) {
  if (!lines.length) return [];
  const margin = Math.min(...lines.map((line) => line.x));
  const out = [];
  let current = '';
  let prevIndented = false;
  const flush = () => { if (current.trim()) out.push(current.replace(/\s+/g, ' ').trim()); current = ''; };
  for (const line of lines) {
    if (HEADERS.includes(line.text) || GRADE.test(line.text)) { flush(); prevIndented = false; continue; }
    const bullet = line.text.startsWith('•');
    const indented = bullet || line.x > margin + 4;
    if (current && !indented && (prevIndented || /[.]$/.test(current.trim()))) flush();
    current += (current ? ' ' : '') + line.text;
    prevIndented = indented;
  }
  flush();
  return out;
}

export function extractGrades(pages) {
  const layouts = bandLayouts(pages);
  const ideas = [];
  let idea = null;
  for (const page of pages) {
    const layout = layouts.get(bandKey(page));
    if (!layout) continue;
    const columns = linesFor(page, layout);
    // The organizing-idea sentence spans the table and lands in the first content column.
    const first = columns[`${layout.grades[0]}|Knowledge`] || [];
    const banner = first.find((line) => /^[A-Z][A-Za-z ]+: [A-Z]/.test(line.text) && line.text.length > 60);
    if (banner) {
      const [name, ...rest] = banner.text.split(':');
      idea = { organizingIdea: name.trim(), statement: rest.join(':').trim(), pages: [], grades: {} };
      ideas.push(idea);
    }
    if (!idea) continue;
    idea.pages.push(page.page);
    for (const grade of layout.grades) {
      if (!idea.grades[grade]) idea.grades[grade] = { guidingQuestion: '', learningOutcome: '', knowledge: [], understanding: [], skills: [] };
      const entry = idea.grades[grade];
      for (const [header, field] of [['Knowledge', 'knowledge'], ['Understanding', 'understanding'], ['Skills & Procedures', 'skills']]) {
        let lines = columns[`${grade}|${header}`] || [];
        if (header === 'Knowledge') {
          const question = lines.findIndex((line) => /\?$/.test(line.text) && line.text.length < 160);
          if (question >= 0) {
            entry.guidingQuestion ||= lines[question].text;
            const start = lines.findIndex((line) => line.text === 'Knowledge');
            if (start > question) entry.learningOutcome ||= lines.slice(question + 1, start).map((line) => line.text).join(' ').replace(/\s+/g, ' ').trim();
            lines = start >= 0 ? lines.slice(start) : lines.slice(question + 1);
          }
          lines = lines.filter((line) => !/^[A-Z][A-Za-z ]+: [A-Z]/.test(line.text) || line.text.length <= 60);
        }
        entry[field].push(...statementsFrom(lines));
      }
    }
  }
  // A grade that appears in the band's header but contributes nothing to this organizing idea does not
  // have it. Alberta ends Phonics after Grade 3 and Phonological Awareness after Grade 2; the page is
  // still headed with both grades of the band. Keeping an empty entry would claim Alberta gives that
  // grade an organizing idea it does not.
  for (const entry of ideas) {
    for (const [grade, value] of Object.entries(entry.grades)) {
      const empty = !value.knowledge.length && !value.understanding.length && !value.skills.length;
      if (empty) delete entry.grades[grade];
    }
  }
  return ideas;
}

if (process.argv[1]?.endsWith('extract_grades.mjs')) {
  const pages = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const only = process.argv[4];
  const ideas = extractGrades(pages);
  const filtered = only
    ? ideas.map((idea) => ({ ...idea, grades: Object.fromEntries(Object.entries(idea.grades).filter(([grade]) => grade === only)) }))
      .filter((idea) => Object.keys(idea.grades).length)
    : ideas;
  fs.writeFileSync(process.argv[3], JSON.stringify(filtered, null, 2) + '\n');
  for (const idea of filtered) {
    const counts = Object.entries(idea.grades).map(([grade, entry]) => `${grade}: ${entry.skills.length}`).join(', ');
    console.log(idea.organizingIdea.padEnd(26), counts);
  }
}
