// Word scramble rules. The shuffle is injected so the anti-fixpoint rule can be tested against a
// shuffle that deliberately returns the letters unchanged.

// A scramble that hands back the original spelling gives the answer away. When the shuffle happens
// to produce the word itself, swap the first two letters. A word of two letters or fewer cannot be
// scrambled into anything else, so it is left alone rather than pretending otherwise.
export function scrambleWord(word, shuffleFn) {
  const letters = shuffleFn(word.split(''));
  if (letters.join('') === word && letters.length > 2) {
    [letters[0], letters[1]] = [letters[1], letters[0]];
  }
  return letters;
}

export const SCRAMBLE_ATTEMPTS = 3;

export function scrambleAttemptsLeft(used, total = SCRAMBLE_ATTEMPTS) {
  return Math.max(0, total - used);
}
