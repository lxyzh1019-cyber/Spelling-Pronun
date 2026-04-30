import { useState, useEffect, useCallback, useRef } from 'react';
import { useWords } from '../context/WordProvider';
import styles from './Crossword.module.css';

const GRID_SIZE = 8;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateCrossword(words) {
  // Pick 3-5 words
  const pool = shuffle(words).slice(0, 5);
  const grid = Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => null));
  const entries = []; // { word, row, col, direction: 'across'|'down', number }

  const placed = [];

  // Place first word horizontally in the middle
  const first = pool[0];
  const firstRow = Math.floor(GRID_SIZE / 2) - 1;
  const firstCol = Math.max(0, Math.floor((GRID_SIZE - first.word.length) / 2));

  for (let c = 0; c < first.word.length; c++) {
    if (firstCol + c < GRID_SIZE) {
      grid[firstRow][firstCol + c] = first.word[c];
    }
  }
  placed.push({ word: first.word, row: firstRow, col: firstCol, direction: 'across', num: 1 });

  // Try to place remaining words
  for (let w = 1; w < pool.length; w++) {
    const current = pool[w];
    let bestPlace = null;

    // Look for intersections with placed words
    for (const p of placed) {
      for (let i = 0; i < p.word.length; i++) {
        const sharedLetter = p.word[i];
        const idxInCurrent = current.word.indexOf(sharedLetter);
        if (idxInCurrent === -1) continue;

        if (p.direction === 'across') {
          // Try placing current vertically at this intersection
          const col = p.col + i;
          const row = p.row - idxInCurrent;
          let fits = row >= 0 && (row + current.word.length - 1) < GRID_SIZE;

          if (fits) {
            for (let r = 0; r < current.word.length; r++) {
              const cell = grid[row + r][col];
              if (cell !== null && cell !== current.word[r]) {
                fits = false;
                break;
              }
              // Check adjacent cells aren't conflicting
              if (cell === null) {
                if (col > 0 && grid[row + r][col - 1] !== null) { fits = false; break; }
                if (col < GRID_SIZE - 1 && grid[row + r][col + 1] !== null) { fits = false; break; }
              }
            }
          }

          if (fits) {
            bestPlace = { word: current.word, row, col, direction: 'down', idxInCurrent, sharedIdxInPlaced: i, placed: p };
            break;
          }
        } else {
          // Try placing current horizontally at this intersection
          const row = p.row + i;
          const col = p.col - idxInCurrent;
          let fits = col >= 0 && (col + current.word.length - 1) < GRID_SIZE;

          if (fits) {
            for (let c = 0; c < current.word.length; c++) {
              const cell = grid[row][col + c];
              if (cell !== null && cell !== current.word[c]) {
                fits = false;
                break;
              }
              if (cell === null) {
                if (row > 0 && grid[row - 1][col + c] !== null) { fits = false; break; }
                if (row < GRID_SIZE - 1 && grid[row + 1][col + c] !== null) { fits = false; break; }
              }
            }
          }

          if (fits) {
            bestPlace = { word: current.word, row, col, direction: 'across', idxInCurrent, sharedIdxInPlaced: i, placed: p };
            break;
          }
        }
      }
      if (bestPlace) break;
    }

    if (bestPlace) {
      const { word, row, col, direction } = bestPlace;
      for (let i = 0; i < word.length; i++) {
        if (direction === 'across') {
          grid[row][col + i] = word[i];
        } else {
          grid[row + i][col] = word[i];
        }
      }
      placed.push({ word, row, col, direction, num: placed.length + 1 });
    }
  }

  // Assign numbers
  let num = 0;
  const cellNumbers = Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => 0));

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === null) continue;
      const hasAcross = (c === 0 || grid[r][c - 1] === null) && (c + 1 < GRID_SIZE && grid[r][c + 1] !== null);
      const hasDown = (r === 0 || grid[r - 1][c] === null) && (r + 1 < GRID_SIZE && grid[r + 1][c] !== null);
      if (hasAcross || hasDown) {
        num++;
        cellNumbers[r][c] = num;
      }
    }
  }

  // Build clues
  const acrossClues = [];
  const downClues = [];

  for (const p of placed) {
    const n = cellNumbers[p.row][p.col];
    const fullWord = words.find((w) => w.word === p.word);
    if (p.direction === 'across') {
      acrossClues.push({ number: n, word: p.word, definition: fullWord?.definition || '' });
    } else {
      downClues.push({ number: n, word: p.word, definition: fullWord?.definition || '' });
    }
  }

  acrossClues.sort((a, b) => a.number - b.number);
  downClues.sort((a, b) => a.number - b.number);

  return { grid, cellNumbers, acrossClues, downClues, entries: placed };
}

export default function Crossword() {
  const { activeWords } = useWords();
  const [puzzle, setPuzzle] = useState(null);
  const [userGrid, setUserGrid] = useState([]);
  const [checked, setChecked] = useState(false);
  const [focusedCell, setFocusedCell] = useState(null);
  const gridRef = useRef(null);

  const newPuzzle = useCallback(() => {
    if (activeWords.length < 3) return;
    const puzzleData = generateCrossword(activeWords);
    setPuzzle(puzzleData);
    setUserGrid(Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => '')));
    setChecked(false);
    setFocusedCell(null);
  }, [activeWords]);

  useEffect(() => {
    newPuzzle();
  }, [newPuzzle]);

  const handleCellClick = (r, c) => {
    if (checked || !puzzle?.grid[r][c]) return;
    setFocusedCell({ r, c });
  };

  const handleKeyDown = (e) => {
    if (!focusedCell || checked) return;
    const { r, c } = focusedCell;

    if (e.key === 'ArrowUp' && r > 0) {
      e.preventDefault();
      let nr = r - 1;
      while (nr >= 0 && !puzzle?.grid[nr][c]) nr--;
      if (nr >= 0) setFocusedCell({ r: nr, c });
    } else if (e.key === 'ArrowDown' && r < GRID_SIZE - 1) {
      e.preventDefault();
      let nr = r + 1;
      while (nr < GRID_SIZE && !puzzle?.grid[nr][c]) nr++;
      if (nr < GRID_SIZE) setFocusedCell({ r: nr, c });
    } else if (e.key === 'ArrowLeft' && c > 0) {
      e.preventDefault();
      let nc = c - 1;
      while (nc >= 0 && !puzzle?.grid[r][nc]) nc--;
      if (nc >= 0) setFocusedCell({ r, c: nc });
    } else if (e.key === 'ArrowRight' && c < GRID_SIZE - 1) {
      e.preventDefault();
      let nc = c + 1;
      while (nc < GRID_SIZE && !puzzle?.grid[r][nc]) nc++;
      if (nc < GRID_SIZE) setFocusedCell({ r, c: nc });
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      const newGrid = userGrid.map((row) => [...row]);
      newGrid[r][c] = '';
      setUserGrid(newGrid);
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      const newGrid = userGrid.map((row) => [...row]);
      newGrid[r][c] = e.key.toLowerCase();
      setUserGrid(newGrid);

      // Auto-advance
      let nc = c + 1;
      while (nc < GRID_SIZE && !puzzle?.grid[r][nc]) nc++;
      if (nc < GRID_SIZE) {
        setFocusedCell({ r, c: nc });
      }
    }
  };

  useEffect(() => {
    if (focusedCell) {
      gridRef.current?.focus();
    }
  }, [focusedCell]);

  const handleCheck = () => {
    setChecked(true);
  };

  if (!activeWords.length || !puzzle) {
    return (
      <div className={styles.empty}>
        <p>Need at least 3 words in this category. Add some words to get started!</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>Crossword</h2>

      <div className={styles.layout}>
        <div className={styles.gridSection}>
          <div
            ref={gridRef}
            className={styles.grid}
            tabIndex={0}
            onKeyDown={handleKeyDown}
          >
            {puzzle.grid.map((row, r) => (
              <div key={r} className={styles.gridRow}>
                {row.map((cell, c) => {
                  const isFocused = focusedCell?.r === r && focusedCell?.c === c;
                  const isCorrect = checked && cell && userGrid[r][c]?.toLowerCase() === cell;
                  const isWrong = checked && cell && userGrid[r][c]?.toLowerCase() !== cell;

                  if (cell === null) {
                    return <div key={c} className={styles.blackCell} />;
                  }

                  return (
                    <div
                      key={c}
                      className={`${styles.cell} ${isFocused ? styles.focused : ''} ${isCorrect ? styles.correct : ''} ${isWrong ? styles.wrong : ''}`}
                      onClick={() => handleCellClick(r, c)}
                    >
                      {puzzle.cellNumbers[r][c] > 0 && (
                        <span className={styles.cellNum}>{puzzle.cellNumbers[r][c]}</span>
                      )}
                      <span className={styles.cellLetter}>{checked ? cell : userGrid[r][c]}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.cluesSection}>
          {puzzle.acrossClues.length > 0 && (
            <div className={styles.clueGroup}>
              <h3 className={styles.clueHeading}>Across</h3>
              {puzzle.acrossClues.map((clue) => (
                <div key={clue.number} className={styles.clue}>
                  <span className={styles.clueNum}>{clue.number}.</span>
                  <span>{clue.definition}</span>
                </div>
              ))}
            </div>
          )}

          {puzzle.downClues.length > 0 && (
            <div className={styles.clueGroup}>
              <h3 className={styles.clueHeading}>Down</h3>
              {puzzle.downClues.map((clue) => (
                <div key={clue.number} className={styles.clue}>
                  <span className={styles.clueNum}>{clue.number}.</span>
                  <span>{clue.definition}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.buttonRow}>
        {!checked && (
          <button className={styles.checkBtn} onClick={handleCheck}>
            Check Answers
          </button>
        )}
        {checked && (
          <button className={styles.newBtn} onClick={newPuzzle}>
            New Puzzle
          </button>
        )}
      </div>
    </div>
  );
}
