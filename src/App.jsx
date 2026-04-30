import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import { WordProvider } from './context/WordProvider';
import Home from './pages/Home';
import SpellingTest from './pages/SpellingTest';
import Flashcards from './pages/Flashcards';
import WordScramble from './pages/WordScramble';
import Hangman from './pages/Hangman';
import Crossword from './pages/Crossword';
import styles from './App.module.css';

export default function App() {
  return (
    <WordProvider>
      <Header />
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/test" element={<SpellingTest />} />
          <Route path="/flashcards" element={<Flashcards />} />
          <Route path="/scramble" element={<WordScramble />} />
          <Route path="/hangman" element={<Hangman />} />
          <Route path="/crossword" element={<Crossword />} />
        </Routes>
      </main>
    </WordProvider>
  );
}
