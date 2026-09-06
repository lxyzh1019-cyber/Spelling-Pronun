import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useWords } from '../context/WordProvider';
import { useLearning } from '../context/LearningProvider';
import { itemById, pilotEpisode, pilotLesson, PILOT_FIXTURE_NOTICE } from '../data/pilotFixtures';
import styles from './Learning.module.css';

const stages = ['teach', 'attempt', 'feedback', 'repair', 'transfer', 'reflection', 'complete'];

function Question({ item, onAnswer }) {
  const [answer, setAnswer] = useState('');
  return <form onSubmit={(event) => { event.preventDefault(); if (answer) onAnswer(answer); }}>
    <p>{item.prompt}</p>
    {item.choices?.map((choice) => <label className={styles.choice} key={choice.id}><input type="radio" name={item.id} value={choice.id} checked={answer === choice.id} onChange={() => setAnswer(choice.id)} /> {choice.text}</label>)}
    {!item.choices && <input className={styles.input} value={answer} onChange={(event) => setAnswer(event.target.value)} />}
    <button className={styles.primary} type="submit" disabled={!answer}>Check my answer</button>
  </form>;
}

export default function LessonPage() {
  const { sessionId } = useParams();
  const { activeProfileId } = useWords();
  const { submitAttempt, saveStatus } = useLearning();
  const key = `spelling-lesson:${activeProfileId}:${sessionId}`;
  const [stage, setStage] = useState(() => localStorage.getItem(key) || 'teach');
  const [feedback, setFeedback] = useState(null);
  useEffect(() => { localStorage.setItem(key, stage); }, [key, stage]);
  const item = itemById(stage === 'transfer' ? pilotLesson.transferItemId : pilotLesson.itemId);
  const answer = async (response) => {
    const transfer = stage === 'transfer';
    const { evaluation } = await submitAttempt(item, response, { sessionId, unseen: transfer, evidenceType: transfer ? 'independent_transfer' : stage === 'repair' ? 'assisted_repair' : 'independent_choice', helped: stage === 'repair' });
    setFeedback({ ...evaluation, explanation: item.explanation, fromStage: stage });
    if (transfer && evaluation.correct) setStage('reflection');
    else if (stage === 'repair' && evaluation.correct) setStage('transfer');
    else setStage('feedback');
  };
  const index = stages.indexOf(stage);
  return <div className={styles.page}>
    <p className={styles.notice} role="note">{PILOT_FIXTURE_NOTICE}</p>
    <div className={styles.progress} aria-label={`Step ${index + 1} of ${stages.length}`}><span style={{ width: `${((index + 1) / stages.length) * 100}%` }} /></div>
    <section className={styles.card}>
      <p className={styles.meta}>{pilotLesson.primarySkill} · Save status: {saveStatus}</p><h1>{pilotLesson.title}</h1>
      {stage === 'teach' && <><h2>Learn the rule</h2><p>{pilotLesson.rule}</p>{pilotLesson.examples.map((example) => <p key={example.text}><strong>{example.text}</strong> — {example.note}</p>)}<button className={styles.primary} onClick={() => setStage('attempt')}>Try it independently</button></>}
      {(stage === 'attempt' || stage === 'repair' || stage === 'transfer') && <><h2>{stage === 'repair' ? 'Repair the mistake' : stage === 'transfer' ? 'New example' : 'First attempt'}</h2>{stage === 'repair' && <p>Use the explanation, then submit a separate helped attempt. Your first answer is never overwritten.</p>}<Question key={`${stage}-${item.id}`} item={item} onAnswer={answer} /></>}
      {stage === 'feedback' && feedback && <><div className={styles.feedback}><h2>{feedback.correct ? 'Correct' : 'Not yet'}</h2><p>{feedback.explanation}</p></div><button className={styles.primary} onClick={() => setStage(feedback.fromStage === 'transfer' ? (feedback.correct ? 'reflection' : 'transfer') : (feedback.correct ? 'transfer' : 'repair'))}>{feedback.fromStage === 'transfer' ? (feedback.correct ? 'Reveal the clue' : 'Try the new example again') : (feedback.correct ? 'Try an unseen example' : 'Repair it')}</button></>}
      {stage === 'reflection' && <><div className={styles.success}><h2>Clue solved</h2><p>{pilotEpisode.reveal}</p></div><p>What helped you recognize a complete sentence?</p><button className={styles.primary} onClick={() => setStage('complete')}>Finish reflection</button></>}
      {stage === 'complete' && <><div className={styles.success}><h2>Lesson complete</h2><p>Your attempts were saved. Because this is unreviewed fixture content, they do not count toward mastery.</p></div><div className={styles.actions}><Link className={styles.primary} to="/progress">View progress</Link><button className={styles.secondary} onClick={() => { localStorage.removeItem(key); setFeedback(null); setStage('teach'); }}>Restart preview</button></div></>}
    </section>
  </div>;
}
