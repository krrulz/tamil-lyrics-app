// pages/admin/login.js
import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRequest, setShowRequest] = useState(false);
  const [reqEmail, setReqEmail] = useState('');
  const [reqReason, setReqReason] = useState('');
  const [reqSent, setReqSent] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { initializeApp, getApps } = await import('firebase/app');
      const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
      if (!getApps().length) {
        initializeApp({
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
      }
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
      // Verify admin status
      const token = await auth.currentUser.getIdToken();
      const check = await fetch('/api/admin/check', { headers: { Authorization: `Bearer ${token}` } });
      if (!check.ok) { setError('Your account is not approved as admin yet.'); await auth.signOut(); setLoading(false); return; }
      router.push('/admin');
    } catch (err) {
      const msgs = { 'auth/wrong-password': 'Incorrect password.', 'auth/user-not-found': 'No account found. Request access below.', 'auth/invalid-email': 'Invalid email address.', 'auth/too-many-requests': 'Too many attempts. Try again later.' };
      setError(msgs[err.code] || err.message);
    }
    setLoading(false);
  };

  const handleRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/admin/access-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: reqEmail, reason: reqReason }) });
    const data = await res.json();
    if (res.ok) { setReqSent(true); } else { setError(data.error || 'Failed to submit'); }
    setLoading(false);
  };

  return (
    <>
      <Head><title>Admin Login — Tamil Lyrics</title></Head>
      <style>{`
        body { background: var(--admin-bg); }
        .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; }
        .card { background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 16px; padding: 2.5rem; width: 100%; max-width: 400px; }
        .logo { text-align: center; margin-bottom: 2rem; }
        .logo-icon { font-size: 2.5rem; display: block; margin-bottom: 0.5rem; }
        .logo h1 { color: var(--admin-text); font-size: 1.4rem; font-weight: 600; }
        .logo p { color: var(--admin-muted); font-size: 0.85rem; margin-top: 4px; }
        label { display: block; font-size: 0.78rem; font-weight: 500; color: var(--admin-muted); margin-bottom: 0.35rem; text-transform: uppercase; letter-spacing: 0.05em; }
        input { width: 100%; padding: 0.65rem 0.9rem; background: rgba(255,255,255,0.05); border: 1px solid var(--admin-border); border-radius: 8px; color: var(--admin-text); font-size: 0.9rem; outline: none; margin-bottom: 1rem; }
        input:focus { border-color: var(--admin-accent); }
        .btn { width: 100%; padding: 0.7rem; background: var(--admin-accent); color: #fff; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .error { color: var(--error); font-size: 0.82rem; margin-bottom: 1rem; padding: 0.5rem 0.75rem; background: rgba(252,129,129,0.1); border-radius: 6px; }
        .divider { text-align: center; color: var(--admin-muted); font-size: 0.8rem; margin: 1.5rem 0; position: relative; }
        .divider::before { content: ''; position: absolute; left: 0; top: 50%; width: 40%; height: 1px; background: var(--admin-border); }
        .divider::after { content: ''; position: absolute; right: 0; top: 50%; width: 40%; height: 1px; background: var(--admin-border); }
        .link-btn { background: none; border: none; color: var(--admin-accent); font-size: 0.85rem; cursor: pointer; padding: 0; }
        .success { color: var(--success); font-size: 0.85rem; padding: 0.75rem; background: rgba(52,211,153,0.1); border-radius: 8px; text-align: center; }
        textarea { width: 100%; padding: 0.65rem 0.9rem; background: rgba(255,255,255,0.05); border: 1px solid var(--admin-border); border-radius: 8px; color: var(--admin-text); font-size: 0.88rem; outline: none; margin-bottom: 1rem; resize: vertical; }
        textarea:focus { border-color: var(--admin-accent); }
      `}</style>
      <div className="wrap">
        <div className="card">
          <div className="logo">
            <span className="logo-icon">🎵</span>
            <h1>Admin Portal</h1>
            <p>Tamil Lyrics App</p>
          </div>

          {!showRequest ? (
            <>
              <form onSubmit={handleLogin}>
                {error && <div className="error">{error}</div>}
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
                <label>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                <button className="btn" type="submit" disabled={loading}>
                  {loading ? <><span className="spinner" /> Signing in…</> : 'Sign in'}
                </button>
              </form>
              <div className="divider">or</div>
              <div style={{ textAlign: 'center' }}>
                <button className="link-btn" onClick={() => setShowRequest(true)}>Request admin access</button>
              </div>
            </>
          ) : (
            <>
              <button className="link-btn" onClick={() => setShowRequest(false)} style={{ marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--admin-muted)' }}>← Back to login</button>
              {reqSent ? (
                <div className="success">
                  ✓ Request submitted! An email will be sent to karthikramamurthy0@gmail.com for approval. You'll receive your login credentials once approved.
                </div>
              ) : (
                <form onSubmit={handleRequest}>
                  {error && <div className="error">{error}</div>}
                  <label>Your email</label>
                  <input type="email" value={reqEmail} onChange={e => setReqEmail(e.target.value)} placeholder="you@email.com" required />
                  <label>Why do you need access?</label>
                  <textarea rows={3} value={reqReason} onChange={e => setReqReason(e.target.value)} placeholder="Briefly describe why you need admin access…" required />
                  <button className="btn" type="submit" disabled={loading}>
                    {loading ? <><span className="spinner" /> Submitting…</> : 'Submit request'}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
