import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWords } from '../context/WordProvider';
import { useLearning } from '../context/LearningProvider';
import { registerParent, signInParent, signOutParent } from '../firebase';
import { gateStateLabel, r2GateTracker } from '../data/r2GateTracker';
import styles from './Learning.module.css';

function friendlyAuthError(code) {
  if (code === 'auth/email-already-in-use') return 'That email already has an account. Choose Sign in instead.';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') return 'The email or password was not accepted.';
  if (code === 'auth/weak-password') return 'Choose a password with at least six characters.';
  if (code === 'auth/operation-not-allowed') return 'Parent email sign-in is not enabled in Firebase yet. Local progress remains safe.';
  if (code === 'auth/network-request-failed') return 'The network is unavailable. Local progress remains safe.';
  return 'The parent account action could not be completed. Local progress remains safe.';
}

export default function ParentPage() {
  const { activeProfileId, authStatus, syncError, user, refreshAuthState } = useWords();
  const { attempts, saveStatus, syncCloud, previewImport, confirmImport, skipImport, heldImports } = useLearning();
  const [preview, setPreview] = useState(null);
  const heldCount = Object.values(heldImports || {}).reduce((sum, count) => sum + count, 0);
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const parentConnected = Boolean(user && !user.isAnonymous);

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const credential = mode === 'register' ? await registerParent(email.trim(), password) : await signInParent(email.trim(), password);
      refreshAuthState();
      setPassword('');
      if (mode === 'register') {
        // Create path: the account has no history of its own, so local work imports additively.
        const created = await previewImport(credential.user);
        await confirmImport(credential.user, created);
        setMessage(`Parent account created. Imported ${created.totals.newAttempts} attempt${created.totals.newAttempts === 1 ? '' : 's'} and ${created.totals.newWords} word total${created.totals.newWords === 1 ? '' : 's'} from this device.`);
      } else {
        // Existing account: nothing is written until the parent reviews the exact counts.
        const proposed = await previewImport(credential.user);
        if (proposed.nothingToImport) {
          await syncCloud(credential.user, activeProfileId, { push: 'force' });
          setMessage('Signed in. This device has nothing new to import; cloud history is now available here.');
        } else {
          setPreview(proposed);
          setMessage('Signed in. Review what this device would add before importing.');
        }
      }
    } catch (error) {
      setMessage(friendlyAuthError(error.code));
    } finally { setBusy(false); }
  };

  const runImport = async () => {
    if (!user || !preview) return;
    setBusy(true); setMessage('');
    try {
      await confirmImport(user, preview);
      setMessage(`Imported ${preview.totals.newAttempts} attempt${preview.totals.newAttempts === 1 ? '' : 's'} and ${preview.totals.newWords} word total${preview.totals.newWords === 1 ? '' : 's'}. Rows already in the account were left unchanged.`);
      setPreview(null);
    } catch { setMessage('The import did not complete. Nothing was removed from this device; try again when online.'); }
    finally { setBusy(false); }
  };

  const declineImport = async () => {
    if (!user || !preview) return;
    setBusy(true); setMessage('');
    try {
      await skipImport(user, preview);
      setMessage('Import skipped. Local work stays on this device and will not be merged until you choose Import.');
      setPreview(null);
    } catch { setMessage('The decision could not be saved.'); }
    finally { setBusy(false); }
  };

  const reopenPreview = async () => {
    if (!user) return;
    setBusy(true); setMessage('');
    try { setPreview(await previewImport(user)); }
    catch { setMessage('The preview could not be loaded. Check the connection and try again.'); }
    finally { setBusy(false); }
  };

  const disconnect = async () => {
    setBusy(true); setMessage('');
    try {
      await signOutParent(); refreshAuthState(); setMessage('Signed out. New work will remain on this device until the next parent sign-in.');
    } catch { setMessage('Sign-out did not complete.'); }
    finally { setBusy(false); }
  };

  return <div className={styles.page}>
    <section className={styles.card}>
      <h1>Parent view</h1>
      <p><strong>Learner:</strong> {activeProfileId}</p><p><strong>Connection:</strong> {parentConnected ? `parent account (${user.email})` : user?.isAnonymous ? 'anonymous cloud guest' : authStatus}</p><p><strong>Learning data:</strong> {saveStatus}</p><p><strong>Attempts on this device:</strong> {attempts.length}</p>
      {syncError && <p role="alert">{syncError}</p>}
      {!parentConnected ? <form onSubmit={submit}>
        <h2>{mode === 'register' ? 'Create parent account' : 'Parent sign in'}</h2>
        <p>Only the parent uses email and password. Learners continue using their profile names. Passwords are sent directly to Firebase Authentication and are never stored by this app.</p>
        <label>Email<input className={styles.input} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label>Password<input className={styles.input} type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <div className={styles.actions}><button className={styles.primary} disabled={busy}>{busy ? 'Working…' : mode === 'register' ? 'Create and import' : 'Sign in and sync'}</button><button className={styles.secondary} type="button" onClick={() => { setMode(mode === 'register' ? 'signin' : 'register'); setMessage(''); }}>{mode === 'register' ? 'Use existing account' : 'Create an account'}</button></div>
      </form> : <>
        <p>Local immutable attempts reconcile additively with this account by attempt ID. An account that already has history never merges this device's work until you review the exact counts below; a brand-new account imports this device's work when it is created.</p>
        {heldCount > 0 && !preview && <div className={styles.notice} role="status"><strong>{heldCount} local item{heldCount === 1 ? '' : 's'} waiting for your decision.</strong> New work is saved on this device only until you import. <button className={styles.secondary} type="button" disabled={busy} onClick={reopenPreview}>Review import</button></div>}
        <button className={styles.secondary} disabled={busy} onClick={disconnect}>Sign out</button>
      </>}
      {preview && <section className={styles.feedback} aria-label="Import preview">
        <h2>Import preview</h2>
        <p>Nothing has been written yet. Importing adds only the rows below; rows already in the account are left exactly as they are.</p>
        <table className={styles.table}><thead><tr><th>Learner</th><th>New attempts</th><th>New word totals</th><th>Already in account</th></tr></thead><tbody>{preview.learners.map((entry) => <tr key={entry.learnerId}><td>{entry.learnerId}</td><td>{entry.counts.newAttempts}</td><td>{entry.counts.newWords}</td><td>{entry.counts.alreadyInCloudAttempts + entry.counts.alreadyInCloudWords}</td></tr>)}</tbody></table>
        <div className={styles.actions}><button className={styles.primary} type="button" disabled={busy || preview.nothingToImport} onClick={runImport}>{preview.nothingToImport ? 'Nothing to import' : `Import ${preview.totals.newAttempts + preview.totals.newWords} item${preview.totals.newAttempts + preview.totals.newWords === 1 ? '' : 's'}`}</button><button className={styles.secondary} type="button" disabled={busy} onClick={declineImport}>Skip for now</button></div>
      </section>}
      {message && <p role="status">{message}</p>}
      <h2>Things I need you to test</h2><p>Some of these gates only move when a person checks something the app cannot check itself. The testing page walks through each one, step by step, and records what you saw.</p><p><Link className={styles.primary} to="/checks">Open the testing checks</Link></p>
      <h2>R2 pilot gate tracker</h2><p>This is a truthful readiness list, not a release claim. Only content marked explicitly released after review, integration, and learner testing can affect mastery.</p><div className={styles.gateList}>{r2GateTracker.map((gate) => <article className={styles.gate} key={gate.id}><p><strong>{gate.label}</strong> <span className={styles.meta}>— {gateStateLabel(gate.state)}</span></p><p>{gate.detail}</p></article>)}</div>
    </section>
  </div>;
}
