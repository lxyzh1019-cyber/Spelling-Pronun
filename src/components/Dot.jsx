import { useEffect, useState } from 'react';
import { DOT_TIMING, dotFaceParts } from '../learning/dotExpressions';
import styles from './Dot.module.css';

// Dot is decorative. She reacts; she never announces. Anything a child needs to be told is said by
// the page, in its own live region, so a screen reader does not narrate a face.
export default function Dot({ expression = 'idle', size = 140 }) {
  const [blinking, setBlinking] = useState(false);
  useEffect(() => {
    setBlinking(false);
    if (expression !== 'idle') return undefined;
    const timers = new Set();
    const interval = setInterval(() => {
      setBlinking(true);
      const timer = setTimeout(() => setBlinking(false), DOT_TIMING.blinkMs);
      timers.add(timer);
    }, DOT_TIMING.blinkEveryMs);
    return () => {
      clearInterval(interval);
      for (const timer of timers) clearTimeout(timer);
    };
  }, [expression]);

  const parts = dotFaceParts(blinking ? 'blink' : expression);
  return (
    <div className={styles.dot} style={{ width: `${size}px`, height: `${size}px` }} data-animation={parts.animation} aria-hidden="true">
      <div className={styles.stage} style={{ transform: `scale(${size / 100})` }}>
        {parts.arm && <>
          <span className={styles.arm} />
          <span className={styles.hand} />
        </>}
        <span className={styles.face} />
        {parts.cheeks && <>
          <span className={`${styles.cheek} ${styles.left}`} />
          <span className={`${styles.cheek} ${styles.right}`} />
        </>}
        {parts.eyes === 'open' && <>
          <span className={`${styles.eye} ${styles.left}`} />
          <span className={`${styles.eye} ${styles.right}`} />
        </>}
        {parts.eyes === 'wide' && <>
          <span className={`${styles.eyeWide} ${styles.left}`} />
          <span className={`${styles.eyeWide} ${styles.right}`} />
          <span className={`${styles.pupil} ${styles.left}`} />
          <span className={`${styles.pupil} ${styles.right}`} />
        </>}
        {parts.highlights && <>
          <span className={`${styles.highlight} ${styles.left}`} />
          <span className={`${styles.highlight} ${styles.right}`} />
        </>}
        {parts.eyes === 'arch' && <>
          <span className={`${styles.arch} ${styles.left}`} />
          <span className={`${styles.arch} ${styles.right}`} />
        </>}
        {parts.eyes === 'closed' && <>
          <span className={`${styles.lid} ${styles.left}`} />
          <span className={`${styles.lid} ${styles.right}`} />
        </>}
        {parts.eyes === 'squint' && <>
          <span className={`${styles.lid} ${styles.left}`} />
          <span className={`${styles.eye} ${styles.right}`} />
          <span className={`${styles.highlight} ${styles.right}`} />
        </>}
        {parts.brows === 'worried' && <>
          <span className={`${styles.brow} ${styles.left}`} />
          <span className={`${styles.brow} ${styles.right}`} />
        </>}
        {parts.mouth === 'smile' && <span className={styles.smile} />}
        {parts.mouth === 'grin' && <span className={styles.grin}>
          <span className={styles.teeth} />
          {parts.tongue && <span className={styles.tongue} />}
        </span>}
        {parts.mouth === 'flat' && <span className={styles.flat} />}
        {parts.mouth === 'o' && <span className={styles.round} />}
        {parts.zz && <>
          <span className={styles.zSmall}>z</span>
          <span className={styles.zBig}>Z</span>
        </>}
      </div>
    </div>
  );
}
