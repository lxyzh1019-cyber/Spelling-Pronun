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

export function withIds(categories = [], sectionSize = SECTION_SIZE) {
  const sections = [];
  for (const category of categories) {
    const words = category.words || [];
    const total = words.length;
    if (total <= sectionSize) {
      sections.push({
        ...category,
        id: slug(category.name),
        words: words.map((word) => ({ ...word, id: wordId(category.name, word.word) })),
      });
      continue;
    }
    const sectionCount = Math.ceil(total / sectionSize);
    for (let index = 0; index < sectionCount; index++) {
      const start = index * sectionSize;
      const end = Math.min(start + sectionSize, total);
      const sectionName = `${shortGradeLabel(category.name)} — Section ${index + 1} (words ${start + 1}-${end})`;
      sections.push({
        ...category,
        name: sectionName,
        id: slug(sectionName),
        words: words.slice(start, end).map((word) => ({ ...word, id: wordId(category.name, word.word) })),
      });
    }
  }
  return sections;
}
