import { useState, useEffect, useCallback, useRef } from 'react';
import { useWords } from '../context/WordProvider';
import { generateCrossword } from '../learning/crossword';
import styles from './Crossword.module.css';

export default function Crossword({ sessionLearnerId }) {
  const { activeWords, recordResults } = useWords();
  const [puzzle, setPuzzle] = useState(null);
  const [userGrid, setUserGrid] = useState([]);
  const [checked, setChecked] = useState(false);
  const [attemptRecorded, setAttemptRecorded] = useState(false);
  const [focusedCell, setFocusedCell] = useState(null);
  const gridRef = useRef(null);

  const newPuzzle = useCallback(() => {
    if (activeWords.length < 3) return;
    const puzzleData = generateCrossword(activeWords);
    setPuzzle(puzzleData);
    if (!puzzleData) return;
    setUserGrid(Array.from({ length: puzzleData.size }, () => Array.from({ length: puzzleData.size }, () => '')));
    setChecked(false);
    setAttemptRecorded(false);
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
    } else if (e.key === 'ArrowDown' && r < puzzle.size - 1) {
      e.preventDefault();
      let nr = r + 1;
      while (nr < puzzle.size && !puzzle?.grid[nr][c]) nr++;
      if (nr < puzzle.size) setFocusedCell({ r: nr, c });
    } else if (e.key === 'ArrowLeft' && c > 0) {
      e.preventDefault();
      let nc = c - 1;
      while (nc >= 0 && !puzzle?.grid[r][nc]) nc--;
      if (nc >= 0) setFocusedCell({ r, c: nc });
    } else if (e.key === 'ArrowRight' && c < puzzle.size - 1) {
      e.preventDefault();
      let nc = c + 1;
      while (nc < puzzle.size && !puzzle?.grid[r][nc]) nc++;
      if (nc < puzzle.size) setFocusedCell({ r, c: nc });
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
      while (nc < puzzle.size && !puzzle?.grid[r][nc]) nc++;
      if (nc < puzzle.size) {
        setFocusedCell({ r, c: nc });
      }
    }
  };

  const inputRef = useRef(null);

  useEffect(() => {
    if (focusedCell) {
      // Focus the hidden input so iOS Safari shows the on-screen keyboard.
      // (Focusing a div with tabIndex doesn't summon the keyboard on iOS.)
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [focusedCell]);

  const handleHiddenInput = (e) => {
    const value = e.target.value;
    e.target.value = '';
    if (!focusedCell || checked || !value) return;
    const ch = value.slice(-1);
    if (!/^[a-zA-Z]$/.test(ch)) return;
    const { r, c } = focusedCell;
    const newGrid = userGrid.map((row) => [...row]);
    newGrid[r][c] = ch.toLowerCase();
    setUserGrid(newGrid);
    let nc = c + 1;
    while (nc < puzzle.size && !puzzle?.grid[r][nc]) nc++;
    if (nc < puzzle.size) setFocusedCell({ r, c: nc });
  };

  const handleCheck = () => {
    setChecked(true);
    if (!puzzle) return;
    const results = puzzle.entries.map((entry) => {
      let correct = true;
      for (let i = 0; i < entry.word.length; i++) {
        const r = entry.direction === 'across' ? entry.row : entry.row + i;
        const c = entry.direction === 'across' ? entry.col + i : entry.col;
        if ((userGrid[r]?.[c] || '').toLowerCase() !== entry.word[i].toLowerCase()) {
          correct = false;
          break;
        }
      }
      return { wordId: entry.id, correct, evidenceType: 'crossword_practice', learnerId: sessionLearnerId };
    }).filter(({ wordId }) => wordId);
    if (!attemptRecorded) {
      recordResults(results);
      setAttemptRecorded(true);
    }
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
      <h1 className={styles.heading}>Crossword</h1>

      <div className={styles.layout}>
        <div className={styles.gridSection}>
          <input
            ref={inputRef}
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            className={styles.hiddenInput}
            aria-hidden="true"
            tabIndex={-1}
            onInput={handleHiddenInput}
            onKeyDown={handleKeyDown}
          />
          <div
            ref={gridRef}
            className={styles.grid}
            style={{ '--crossword-cell-size': `min(42px, calc((100vw - 40px) / ${puzzle.size}))` }}
            onKeyDown={handleKeyDown}
            role="grid"
            aria-label={`Crossword grid, ${puzzle.size} by ${puzzle.size}`}
            aria-rowcount={puzzle.size}
            aria-colcount={puzzle.size}
          >
            {puzzle.grid.map((row, r) => (
              <div key={r} className={styles.gridRow} role="row" aria-rowindex={r + 1}>
                {row.map((cell, c) => {
                  const isFocused = focusedCell?.r === r && focusedCell?.c === c;
                  const isCorrect = checked && cell && userGrid[r][c]?.toLowerCase() === cell;
                  const isWrong = checked && cell && userGrid[r][c]?.toLowerCase() !== cell;

                  if (cell === null) {
                    return (
                      <div
                        key={c}
                        role="gridcell"
                        aria-colindex={c + 1}
                        aria-label="Blocked square"
                        className={styles.blackCell}
                      />
                    );
                  }

                  const userValue = userGrid[r][c];
                  const cellLabel = `Row ${r + 1}, column ${c + 1}${
                    puzzle.cellNumbers[r][c] > 0 ? `, clue ${puzzle.cellNumbers[r][c]}` : ''
                  }${userValue ? `, contains ${userValue}` : ', empty'}`;

                  return (
                    <div
                      key={c}
                      role="gridcell"
                      aria-colindex={c + 1}
                      aria-label={cellLabel}
                      aria-selected={isFocused}
                      aria-invalid={isWrong ? 'true' : undefined}
                      data-row={r}
                      data-col={c}
                      data-answer={cell}
                      className={`${styles.cell} ${isFocused ? styles.focused : ''} ${isCorrect ? styles.correct : ''} ${isWrong ? styles.wrong : ''}`}
                      onClick={() => handleCellClick(r, c)}
                    >
                      {puzzle.cellNumbers[r][c] > 0 && (
                        <span className={styles.cellNum} aria-hidden="true">{puzzle.cellNumbers[r][c]}</span>
                      )}
                      <span className={styles.cellLetter} aria-hidden="true">{checked ? cell : userValue}</span>
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
              <h2 className={styles.clueHeading}>Across</h2>
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
              <h2 className={styles.clueHeading}>Down</h2>
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
          <>
            <button className={styles.checkBtn} onClick={() => setChecked(false)}>
              Repair Mistakes
            </button>
            <button className={styles.newBtn} onClick={newPuzzle}>New Puzzle</button>
          </>
        )}
      </div>
    </div>
  );
}
