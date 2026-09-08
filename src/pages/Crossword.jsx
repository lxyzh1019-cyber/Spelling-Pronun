import { useState, useEffect, useCallback, useRef } from 'react';
import { useWords } from '../context/WordProvider';
import { evaluateCrosswordEntries, generateCrossword } from '../learning/crossword';
import styles from './Crossword.module.css';

export default function Crossword({ sessionLearnerId }) {
  const { activeWords, recordResults } = useWords();
  const [puzzle, setPuzzle] = useState(null);
  const [userGrid, setUserGrid] = useState([]);
  // phase: solving -> checked -> repair -> checked ... -> revealed. Solution letters are shown only
  // in the revealed phase; the original Check results are recorded once and never rewritten.
  const [phase, setPhase] = useState('solving');
  const [attemptRecorded, setAttemptRecorded] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [repairable, setRepairable] = useState(new Set());
  const [repairRounds, setRepairRounds] = useState(0);
  const checked = phase !== 'solving' && phase !== 'repair';
  const editable = (r, c) => phase === 'solving' || (phase === 'repair' && repairable.has(`${r},${c}`));
  const [focusedCell, setFocusedCell] = useState(null);
  const gridRef = useRef(null);

  const newPuzzle = useCallback(() => {
    if (activeWords.length < 3) return;
    const puzzleData = generateCrossword(activeWords);
    setPuzzle(puzzleData);
    if (!puzzleData) return;
    setUserGrid(Array.from({ length: puzzleData.size }, () => Array.from({ length: puzzleData.size }, () => '')));
    setPhase('solving');
    setAttemptRecorded(false);
    setEvaluation(null);
    setRepairable(new Set());
    setRepairRounds(0);
    setFocusedCell(null);
  }, [activeWords]);

  useEffect(() => {
    newPuzzle();
  }, [newPuzzle]);

  const handleCellClick = (r, c) => {
    if (!puzzle?.grid[r][c] || !editable(r, c)) return;
    setFocusedCell({ r, c });
  };

  const handleKeyDown = (e) => {
    if (!focusedCell) return;
    const { r, c } = focusedCell;
    if (!editable(r, c)) return;

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
    if (!focusedCell || !value || !editable(focusedCell.r, focusedCell.c)) return;
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
    if (!puzzle) return;
    const next = evaluateCrosswordEntries(puzzle, userGrid);
    setFocusedCell(null);
    if (!attemptRecorded) {
      // Original results: recorded exactly once as practice evidence.
      recordResults(next.results.filter(({ wordId }) => wordId).map(({ wordId, correct }) => ({ wordId, correct, evidenceType: 'crossword_practice', learnerId: sessionLearnerId })));
      setAttemptRecorded(true);
    } else if (phase === 'repair' && evaluation) {
      // Repair results: only the entries that were wrong before, recorded separately as assisted.
      const previouslyWrong = new Set(evaluation.results.filter((result) => !result.correct).map((result) => result.wordId));
      const repairs = next.results.filter(({ wordId }) => wordId && previouslyWrong.has(wordId)).map(({ wordId, correct }) => ({ wordId, correct, evidenceType: 'assisted_repair', helped: true, learnerId: sessionLearnerId }));
      if (repairs.length) recordResults(repairs);
      setRepairRounds((rounds) => rounds + 1);
    }
    setEvaluation(next);
    setRepairable(next.repairable);
    setPhase('checked');
  };

  const startRepair = () => {
    if (!evaluation || evaluation.wrongCount === 0) return;
    setPhase('repair');
    const first = [...evaluation.repairable][0];
    if (first) { const [r, c] = first.split(',').map(Number); setFocusedCell({ r, c }); }
  };

  const revealAnswers = () => { setPhase('revealed'); setFocusedCell(null); };

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
                  const inWrongEntry = Boolean(cell) && repairable.has(`${r},${c}`);
                  const isCorrect = (checked || phase === 'repair') && cell && !inWrongEntry;
                  const isWrong = checked && inWrongEntry && phase !== 'revealed';
                  const isRevealed = phase === 'revealed';

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
                      <span className={styles.cellLetter} aria-hidden="true">{isRevealed ? cell : userValue}</span>
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

      {evaluation && phase !== 'revealed' && (
        <p className={styles.repairNote} role="status">
          {evaluation.wrongCount === 0
            ? 'Every word is correct.'
            : `${evaluation.wrongCount} word${evaluation.wrongCount === 1 ? ' is' : 's are'} not right yet. Your first answers are kept; a repair is recorded separately as assisted practice.`}
        </p>
      )}
      {phase === 'revealed' && <p className={styles.repairNote} role="status">Answers shown. Your original results were kept and nothing further is recorded.</p>}
      <div className={styles.buttonRow}>
        {phase === 'solving' && (
          <button className={styles.checkBtn} onClick={handleCheck}>
            Check Answers
          </button>
        )}
        {phase === 'repair' && (
          <button className={styles.checkBtn} onClick={handleCheck}>
            Check Repair
          </button>
        )}
        {phase === 'checked' && (
          <>
            {evaluation?.wrongCount > 0 && (
              <button className={styles.checkBtn} onClick={startRepair}>
                Repair Mistakes
              </button>
            )}
            {evaluation?.wrongCount > 0 && repairRounds >= 1 && (
              <button className={styles.newBtn} onClick={revealAnswers}>Show Answers</button>
            )}
            <button className={styles.newBtn} onClick={newPuzzle}>New Puzzle</button>
          </>
        )}
        {phase === 'revealed' && <button className={styles.newBtn} onClick={newPuzzle}>New Puzzle</button>}
      </div>
    </div>
  );
}
