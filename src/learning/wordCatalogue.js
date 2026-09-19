// Word catalogue shaping. Large categories are split into sections so a game session stays
// focused, but a word's ID is derived from the ORIGINAL category, never the section. That is what
// keeps a learner's progress valid when section boundaries change.

export const SECTION_SIZE = 25;

export function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function shortGradeLabel(name) {
  // "Grade 4 — Alberta Curriculum" -> "Grade 4"
  const match = String(name).match(/Grade\s*\d+/i);
  return match ? match[0] : name;
}

export function wordId(categoryName, word) {
  return `${slug(categoryName)}__${slug(word)}`;
}

// A word's id, honouring a pinned one. When a word's spelling is corrected (the list dictated the US
// `center` while the lesson pack teaches the Canadian `colour`), the entry carries the id it already
// had, so the corrected word keeps its history instead of appearing as a new word.
export function idForWord(categoryName, word) {
  return word.id || wordId(categoryName, word.word);
}

// Which list a word belongs to. `level` is authoritative because the stored categories are unreliable:
// the Grade 6 category's last eighty words are the strictly alphabetical continuation of the Grade 4
// list, every one of them sorting after `ocean`, and its middle block is spelling-bee vocabulary. The
// category a word is stored under still decides its id, so re-levelling never moves a progress row.
export function levelOf(category, word) {
  return word.level || shortGradeLabel(category.name);
}

// Display order for the level groups: school grades in order, then anything else, then Challenge last.
function levelRank(level) {
  if (/^Grade\s*\d+$/i.test(level)) return [0, Number(level.match(/\d+/)[0])];
  return level === 'Challenge' ? [2, 0] : [1, 0];
}

// Regroups the stored categories by each word's level, keeping the original category for id purposes.
function groupByLevel(categories = []) {
  const groups = new Map();
  for (const category of categories) {
    for (const word of category.words || []) {
      const level = levelOf(category, word);
      // A word that declares no level stays in the category it was stored under, under that category's
      // own name, so a list without levels behaves exactly as before. Only a declared level makes a new
      // group, and only the grade groups are claimed as Alberta curriculum: the challenge words are
      // explicitly not, being the spelling-bee vocabulary the grade 6 list had absorbed.
      const name = !word.level ? category.name : /^Grade\s*\d+$/i.test(level) ? `${level} — Alberta Curriculum` : `${level} words`;
      if (!groups.has(level)) groups.set(level, { name, level, words: [] });
      // The id is computed here, from the category the word is stored under, before any regrouping.
      groups.get(level).words.push({ ...word, id: idForWord(category.name, word) });
    }
  }
  return [...groups.values()].sort((a, b) => {
    const [aKind, aGrade] = levelRank(a.level);
    const [bKind, bGrade] = levelRank(b.level);
    return aKind - bKind || aGrade - bGrade || a.level.localeCompare(b.level);
  });
}

export function withIds(categories = [], sectionSize = SECTION_SIZE) {
  const sections = [];
  for (const category of groupByLevel(categories)) {
    const words = category.words || [];
    const total = words.length;
    if (total <= sectionSize) {
      sections.push({
        ...category,
        id: slug(category.name),
        words,
      });
      continue;
    }
    const sectionCount = Math.ceil(total / sectionSize);
    for (let index = 0; index < sectionCount; index++) {
      const start = index * sectionSize;
      const end = Math.min(start + sectionSize, total);
      const sectionName = `${category.level || shortGradeLabel(category.name)} — Section ${index + 1} (words ${start + 1}-${end})`;
      sections.push({
        ...category,
        name: sectionName,
        id: slug(sectionName),
        words: words.slice(start, end),
      });
    }
  }
  return sections;
}
