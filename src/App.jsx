import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import { ChunkBoundary } from './components/ChunkBoundary';
import { WordProvider } from './context/WordProvider';
import { LearningProvider } from './context/LearningProvider';
import Home from './pages/Home';
import styles from './App.module.css';

const SpellingTest = lazy(() => import('./pages/SpellingTest'));
const Flashcards = lazy(() => import('./pages/Flashcards'));
const WordScramble = lazy(() => import('./pages/WordScramble'));
const Hangman = lazy(() => import('./pages/Hangman'));
const Crossword = lazy(() => import('./pages/Crossword'));
const SpeedRound = lazy(() => import('./pages/SpeedRound'));
const CasePage = lazy(() => import('./pages/CasePage'));
const LessonPage = lazy(() => import('./pages/LessonPage'));
const AssessmentPage = lazy(() => import('./pages/AssessmentPage'));
const AssessmentRunner = lazy(() => import('./pages/AssessmentRunner'));
const ReviewPage = lazy(() => import('./pages/ReviewPage'));
const ProgressPage = lazy(() => import('./pages/ProgressPage'));
const ParentPage = lazy(() => import('./pages/ParentPage'));

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
      <LearningProvider>
        <a href="#main" className={styles.skipLink}>Skip to main content</a>
        <Header />
        <main id="main" tabIndex={-1} className={styles.main}>
          <ChunkBoundary>
            <Suspense fallback={<PageFallback />}>
              <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/test" element={<SpellingTest />} />
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="/scramble" element={<WordScramble />} />
              <Route path="/hangman" element={<Hangman />} />
              <Route path="/crossword" element={<Crossword />} />
              <Route path="/speed" element={<SpeedRound />} />
                <Route path="/case" element={<CasePage />} />
                <Route path="/lesson/:sessionId" element={<LessonPage />} />
                <Route path="/assessment" element={<AssessmentPage />} />
                <Route path="/assessment/:sessionId" element={<AssessmentRunner />} />
                <Route path="/review" element={<ReviewPage />} />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/parent" element={<ParentPage />} />
              </Routes>
            </Suspense>
          </ChunkBoundary>
        </main>
      </LearningProvider>
    </WordProvider>
  );
}
