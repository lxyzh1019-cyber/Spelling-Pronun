import { useState } from 'react';
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
  const { attempts, saveStatus, syncCloud } = useLearning();
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
      await syncCloud(credential.user);
      setPassword('');
      setMessage(mode === 'register' ? 'Parent account created. Local attempts are being imported additively.' : 'Signed in. Local attempts are being reconciled with cloud attempts.');
    } catch (error) {
      setMessage(friendlyAuthError(error.code));
    } finally { setBusy(false); }
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
      </form> : <><p>Local immutable attempts reconcile additively with this account. Legacy word totals import automatically only when that learner has no cloud totals, preventing accidental double counting.</p><button className={styles.secondary} disabled={busy} onClick={disconnect}>Sign out</button></>}
      {message && <p role="status">{message}</p>}
      <h2>R2 pilot gate tracker</h2><p>This is a truthful readiness list, not a release claim. Only content marked explicitly released after review, integration, and learner testing can affect mastery.</p><div className={styles.gateList}>{r2GateTracker.map((gate) => <article className={styles.gate} key={gate.id}><p><strong>{gate.label}</strong> <span className={styles.meta}>— {gateStateLabel(gate.state)}</span></p><p>{gate.detail}</p></article>)}</div>
    </section>
  </div>;
}
