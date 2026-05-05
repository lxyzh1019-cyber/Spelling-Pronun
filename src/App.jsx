import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import { WordProvider } from './context/WordProvider';
import Home from './pages/Home';
import styles from './App.module.css';

const SpellingTest = lazy(() => import('./pages/SpellingTest'));
const Flashcards = lazy(() => import('./pages/Flashcards'));
const WordScramble = lazy(() => import('./pages/WordScramble'));
const Hangman = lazy(() => import('./pages/Hangman'));
const Crossword = lazy(() => import('./pages/Crossword'));

function PageFallback() {
  return (
    <div role="status" aria-live="polite" className={styles.pageFallback}>
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <WordProvider>
      <a href="#main" className={styles.skipLink}>Skip to main content</a>
      <Header />
      <main id="main" tabIndex={-1} className={styles.main}>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/test" element={<SpellingTest />} />
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/scramble" element={<WordScramble />} />
            <Route path="/hangman" element={<Hangman />} />
            <Route path="/crossword" element={<Crossword />} />
          </Routes>
        </Suspense>
      </main>
    </WordProvider>
  );
}
