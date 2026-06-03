// pages/suggest.js
import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function SuggestPage() {
  const [form, setForm] = useState({ songName: '', movie: '', reason: '', submittedBy: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.songName.trim()) return setError('Song name is required');
    setSubmitting(true); setError('');
    const res = await fetch('/api/suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (res.ok) setSubmitted(true);
    else setError(data.error || 'Failed to submit. Please try again.');
    setSubmitting(false);
  };

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <>
      <Head>
        <title>Suggest a song — Tamil Lyrics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --cream:#FAF6EF;--deep:#1C1208;--gold:#C8922A;--gold-light:#E8B355;--card-bg:#FFF8EE;--border:#E8D5B0;--text-muted:#7A6645; }
        body { background: var(--cream); color: var(--deep); font-family: 'Inter', sans-serif; min-height: 100vh; }
        .header { background: var(--deep); padding: 1rem 1.5rem; display: flex; align-items: center; gap: 1rem; border-bottom: 2px solid var(--gold); }
        .back-btn { color: var(--gold-light); text-decoration: none; font-size: 0.9rem; opacity: 0.8; }
        .back-btn:hover { opacity: 1; }
        .container { max-width: 560px; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; }
        h1 { font-size: clamp(1.5rem, 4vw, 2rem); font-weight: 700; margin-bottom: 0.4rem; letter-spacing: -0.02em; }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 2rem; }
        .form-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px; padding: 1.75rem; }
        label { display: block; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
        .required { color: var(--gold); }
        input, textarea { width: 100%; padding: 0.65rem 0.9rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; background: #FFFDF7; color: var(--deep); outline: none; font-family: inherit; margin-bottom: 1.1rem; }
        input:focus, textarea:focus { border-color: var(--gold); }
        textarea { resize: vertical; }
        .hint { font-size: 0.75rem; color: var(--text-muted); margin-top: -0.8rem; margin-bottom: 1rem; }
        .submit-btn { width: 100%; padding: 0.85rem; background: var(--deep); color: var(--gold-light); border: 2px solid var(--gold); border-radius: 10px; font-size: 1rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: opacity 0.15s; margin-top: 0.5rem; }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .error-msg { background: #FFF0F0; border: 1px solid #F4A0A0; border-radius: 8px; padding: 0.75rem 1rem; color: #8B0000; font-size: 0.85rem; margin-bottom: 1rem; }
        .success-box { text-align: center; padding: 3rem 1rem; animation: fadeIn 0.4s ease; }
        .success-icon { font-size: 3rem; margin-bottom: 1rem; }
        .success-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
        .success-sub { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
        .suggest-another { color: var(--gold); background: none; border: 2px solid var(--gold); border-radius: 8px; padding: 0.6rem 1.25rem; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
        .ornament { text-align: center; font-size: 1.2rem; color: var(--gold); margin: 1.5rem 0 1rem; letter-spacing: 0.4rem; }
        @keyframes fadeIn { from { opacity:0;transform:translateY(8px); } to { opacity:1;transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner-gold { width: 18px; height: 18px; border: 2px solid rgba(200,146,42,0.3); border-top-color: var(--gold-light); border-radius: 50%; animation: spin 0.7s linear infinite; }
      `}</style>

      <div className="header">
        <Link href="/" className="back-btn">← Tamil Lyrics</Link>
      </div>

      <main className="container">
        {submitted ? (
          <div className="success-box">
            <div className="success-icon">🎵</div>
            <div className="success-title">Suggestion submitted!</div>
            <div className="success-sub">Thank you! Our team will review your suggestion and it may be added to the next playlist.</div>
            <button className="suggest-another" onClick={() => { setSubmitted(false); setForm({ songName: '', movie: '', reason: '', submittedBy: '' }); }}>
              Suggest another song
            </button>
          </div>
        ) : (
          <>
            <h1>Suggest a song</h1>
            <p className="subtitle">Know a Tamil song that belongs in our collection? Tell us about it.</p>
            <div className="ornament">✦ ✦ ✦</div>
            <div className="form-card">
              {error && <div className="error-msg">⚠ {error}</div>}
              <form onSubmit={handleSubmit}>
                <label>Song name <span className="required">*</span></label>
                <input type="text" value={form.songName} onChange={f('songName')} placeholder="e.g. Venmathi Venmathiye" required />

                <label>Movie / album</label>
                <input type="text" value={form.movie} onChange={f('movie')} placeholder="e.g. Minnale" />

                <label>Why should this song be included?</label>
                <textarea rows={3} value={form.reason} onChange={f('reason')} placeholder="e.g. Beautiful melody, classic from the 90s…" />
                <p className="hint">Optional — helps us understand why this song matters to you.</p>

                <label>Your name</label>
                <input type="text" value={form.submittedBy} onChange={f('submittedBy')} placeholder="e.g. Priya" maxLength={40} />

                <button className="submit-btn" type="submit" disabled={submitting}>
                  {submitting ? <><span className="spinner-gold" /> Submitting…</> : '→ Submit suggestion'}
                </button>
              </form>
            </div>
          </>
        )}
      </main>
    </>
  );
}
