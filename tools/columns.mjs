import fs from 'node:fs';
const pages = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : [];
// Column x-origins on a Grade 5/6 page, read off the header row.
const COLS = [
  { key: 'label', min: 0, max: 160 },
  { key: 'g5.knowledge', min: 160, max: 330 },
  { key: 'g5.understanding', min: 330, max: 500 },
  { key: 'g5.skills', min: 500, max: 620 },
  { key: 'g6.knowledge', min: 620, max: 840 },
  { key: 'g6.understanding', min: 840, max: 1010 },
  { key: 'g6.skills', min: 1010, max: 1224 },
];
const colOf = (x) => COLS.find((c) => x >= c.min && x < c.max)?.key;
const FOOTER = /Government of Alberta|Curriculum$|Implemented September|^Page \d+$|April 2022/;

export function parsePage(page) {
  const buckets = new Map();
  for (const it of page.items) {
    const key = colOf(it.x);
    if (!key) continue;
    if (!buckets.has(key)) buckets.set(key, new Map());
    const rows = buckets.get(key);
    // group by y (lines), tolerant of tiny baseline drift
    let bucketY = [...rows.keys()].find((y) => Math.abs(y - it.y) <= 2);
    if (bucketY === undefined) { bucketY = it.y; rows.set(bucketY, []); }
    rows.get(bucketY).push(it);
  }
  const out = {};
  for (const [key, rows] of buckets) {
    const lines = [...rows.entries()].sort((a, b) => b[0] - a[0]).map(([y, items]) => ({
      y,
      x: Math.min(...items.map((i) => i.x)),
      text: items.sort((a, b) => a.x - b.x).map((i) => i.s).join('').replace(/\s+/g, ' ').trim(),
    })).filter((l) => l.text && !FOOTER.test(l.text));
    out[key] = lines;
  }
  return out;
}

if (process.argv[1].endsWith('columns.mjs') && process.argv[3]) {
  const page = pages.find((p) => p.page === Number(process.argv[3]));
  const parsed = parsePage(page);
  for (const key of Object.keys(parsed)) {
    console.log(`\n######## ${key} ########`);
    console.log(parsed[key].map((l) => l.text).join('\n'));
  }
}
