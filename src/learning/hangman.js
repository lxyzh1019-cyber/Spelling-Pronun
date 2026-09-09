// Hangman guess rules, kept out of the component so they can be tested and so the component does
// not run side effects inside a state updater (master plan section 9).

export const MAX_WRONG = 7;

export function createHangmanState() {
  return { guessed: [], wrongGuesses: 0, gameOver: false, won: false };
}

export function isRevealed(word, guessed = []) {
  const seen = new Set(guessed);
  return word.split('').every((letter) => seen.has(letter));
}

// Returns the next state plus the outcome the component should react to. `outcome` is null while
// the game continues, so the component plays a sound or records a result only on a real transition.
export function applyGuess(state, letter, word, { maxWrong = MAX_WRONG } = {}) {
  if (state.gameOver || state.guessed.includes(letter)) {
    return { state, outcome: null, changed: false };
  }
  const guessed = [...state.guessed, letter];
  if (!word.includes(letter)) {
    const wrongGuesses = state.wrongGuesses + 1;
    const lost = wrongGuesses >= maxWrong;
    return {
      state: { ...state, guessed, wrongGuesses, gameOver: lost, won: false },
      outcome: lost ? 'lost' : 'wrong',
      changed: true,
    };
  }
  const won = isRevealed(word, guessed);
  return {
    state: { ...state, guessed, gameOver: won, won },
    outcome: won ? 'won' : 'right',
    changed: true,
  };
}
