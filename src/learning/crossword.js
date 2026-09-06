import { shuffle } from '../utils/shuffle.js';

export const MIN_GRID_SIZE = 8;
export const MAX_GRID_SIZE = 18;

function tryPlace(pool, size) {
  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  const placed = [];
  const first = pool[0];
  if (!first) return { grid, placed };
  const firstRow = Math.floor(size / 2);
  const firstCol = Math.floor((size - first.word.length) / 2);
  for (let i = 0; i < first.word.length; i += 1) grid[firstRow][firstCol + i] = first.word[i].toLowerCase();
  placed.push({ word: first.word.toLowerCase(), row: firstRow, col: firstCol, direction: 'across' });

  for (const currentEntry of pool.slice(1)) {
    const current = currentEntry.word.toLowerCase();
    let candidate = null;
    for (const existing of placed) {
      for (let existingIndex = 0; existingIndex < existing.word.length && !candidate; existingIndex += 1) {
        for (let currentIndex = 0; currentIndex < current.length && !candidate; currentIndex += 1) {
          if (existing.word[existingIndex] !== current[currentIndex]) continue;
          const direction = existing.direction === 'across' ? 'down' : 'across';
          const row = direction === 'down' ? existing.row - currentIndex : existing.row + existingIndex;
          const col = direction === 'down' ? existing.col + existingIndex : existing.col - currentIndex;
          const endRow = row + (direction === 'down' ? current.length - 1 : 0);
          const endCol = col + (direction === 'across' ? current.length - 1 : 0);
          if (row < 0 || col < 0 || endRow >= size || endCol >= size) continue;
          let valid = true;
          for (let i = 0; i < current.length; i += 1) {
            const r = row + (direction === 'down' ? i : 0);
            const c = col + (direction === 'across' ? i : 0);
            const cell = grid[r][c];
            if (cell && cell !== current[i]) { valid = false; break; }
          }
          if (valid) candidate = { word: current, row, col, direction };
        }
      }
      if (candidate) break;
    }
    if (!candidate) continue;
    for (let i = 0; i < candidate.word.length; i += 1) {
      const r = candidate.row + (candidate.direction === 'down' ? i : 0);
      const c = candidate.col + (candidate.direction === 'across' ? i : 0);
      grid[r][c] = candidate.word[i];
    }
    placed.push(candidate);
  }
  return { grid, placed };
}

export function validateCrossword({ grid, entries, size }) {
  if (grid.length !== size || grid.some((row) => row.length !== size)) return false;
  return entries.every((entry) => [...entry.word].every((letter, i) => {
    const row = entry.row + (entry.direction === 'down' ? i : 0);
    const col = entry.col + (entry.direction === 'across' ? i : 0);
    return row >= 0 && col >= 0 && row < size && col < size && grid[row][col] === letter.toLowerCase();
  }));
}

export function generateCrossword(words) {
  const eligible = words.filter(({ word }) => word && word.length <= MAX_GRID_SIZE).slice(0, 25);
  if (eligible.length < 3) return null;
  const size = Math.max(MIN_GRID_SIZE, Math.min(MAX_GRID_SIZE, Math.max(...eligible.map(({ word }) => word.length)) + 2));
  let best = null;
  const longest = eligible.reduce((current, entry) => entry.word.length > current.word.length ? entry : current);
  const remaining = eligible.filter((entry) => entry !== longest);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const result = tryPlace([longest, ...shuffle(remaining).slice(0, 4)], size);
    if (!best || result.placed.length > best.placed.length) best = result;
    if (best.placed.length === 5) break;
  }
  if (!best?.placed.length) return null;

  const cellNumbers = Array.from({ length: size }, () => Array(size).fill(0));
  let number = 0;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (!best.grid[row][col]) continue;
      const startsAcross = (col === 0 || !best.grid[row][col - 1]) && col + 1 < size && best.grid[row][col + 1];
      const startsDown = (row === 0 || !best.grid[row - 1][col]) && row + 1 < size && best.grid[row + 1][col];
      if (startsAcross || startsDown) cellNumbers[row][col] = ++number;
    }
  }
  const entries = best.placed.map((entry) => {
    const source = words.find(({ word }) => word.toLowerCase() === entry.word);
    return { ...entry, id: source?.id, definition: source?.definition || '', number: cellNumbers[entry.row][entry.col] };
  });
  const acrossClues = entries.filter(({ direction }) => direction === 'across').sort((a, b) => a.number - b.number);
  const downClues = entries.filter(({ direction }) => direction === 'down').sort((a, b) => a.number - b.number);
  const puzzle = { size, grid: best.grid, cellNumbers, entries, acrossClues, downClues };
  if (!validateCrossword(puzzle)) throw new Error('Crossword generator created an invalid puzzle');
  return puzzle;
}
