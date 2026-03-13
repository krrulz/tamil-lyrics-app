/* pages/dev/index.js - Developer Portal */
import { useState } from 'react';
import Head from 'next/head';

export default function DevPortal() {
  const [apiKey, setApiKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');

  const [topicName, setTopicName] = useState('');
  const [songsText, setSongsText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleAuth = (e) => {
    e.preventDefault();
    if (!apiKey.trim()) { setAuthError('Enter your API key'); return; }
    setAuthed(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setResult(null);

    if (!topicName.trim()) { setError('Topic name is required'); return; }

    const lines = songsText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) { setError('Add at least one song'); return; }

    const songs = lines.map(line => {
      const [name, movie] = line.split('|').map(s => s.trim());
      return { name, movie: movie || '' };
    });

    setSubmitting(true);
    const results = [];

    // Call API once per song to stay within Vercel's 10s function timeout
    for (const song of songs) {
      try {
        const res = await fetch('/api/dev/add-topic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
          body: JSON.stringify({ topicName, song }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Failed on: ' + song.name); break; }
        results.push(data.result);
        // Update UI progressively
        setResult({ topic: data.topic, results: [...results] });
      } catch (err) {
        setError('Network error on: ' + song.name);
        break;
      }
    }

    if (results.length === songs.length) { setTopicName(''); setSongsText(''); }
    setSubmitting(false);
  };

  return (
    <>
      <Head>
        <title>Developer Portal — Tamil Lyrics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0F1117; --surface: #1A1E2E; --surface2: #222840;
          --accent: #6C8EFF; --accent2: #A78BFA;
          --text: #E2E8F0; --muted: #64748B; --border: #2D3748;
          --success: #34D399; --error: #FC8181; --warn: #FBBF24;
        }
        body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; min-height: 100vh; }

        .header {
          background: var(--surface); border-bottom: 1px solid var(--border);
          padding: 1rem 1.5rem; display: flex; align-items: center; gap: 0.75rem;
        }
        .header-badge {
          background: var(--accent); color: #fff; font-size: 0.65rem;
          padding: 0.2rem 0.55rem; border-radius: 4px; font-weight: 600;
          letter-spacing: 0.06em; text-transform: uppercase;
        }
        .header-title { font-weight: 600; font-size: 1rem; }
        .header-sub { font-size: 0.78rem; color: var(--muted); margin-left: auto; }

        .container { max-width: 640px; margin: 0 auto; padding: 2rem 1.25rem 4rem; }

        /* Auth screen */
        .auth-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; padding: 2rem; margin-top: 3rem;
          text-align: center;
        }
        .auth-icon { font-size: 2.5rem; margin-bottom: 1rem; }
        .auth-title { font-size: 1.3rem; font-weight: 600; margin-bottom: 0.4rem; }
        .auth-sub { font-size: 0.82rem; color: var(--muted); margin-bottom: 1.5rem; }
        .auth-input {
          width: 100%; padding: 0.75rem 1rem; background: var(--surface2);
          border: 1px solid var(--border); border-radius: 8px; color: var(--text);
          font-family: 'JetBrains Mono', monospace; font-size: 0.9rem;
          margin-bottom: 0.75rem; outline: none; letter-spacing: 0.05em;
        }
        .auth-input:focus { border-color: var(--accent); }
        .auth-error { color: var(--error); font-size: 0.8rem; margin-bottom: 0.75rem; }
        .btn-primary {
          width: 100%; padding: 0.75rem; background: var(--accent);
          color: #fff; border: none; border-radius: 8px; font-size: 0.9rem;
          font-weight: 500; cursor: pointer; transition: opacity 0.15s;
        }
        .btn-primary:hover { opacity: 0.88; }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Dev form */
        .section-title {
          font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.12em;
          color: var(--muted); margin-bottom: 1.25rem;
          display: flex; align-items: center; gap: 0.5rem;
        }
        .section-title::after { content: ''; flex: 1; height: 1px; background: var(--border); }

        .form-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;
        }
        .form-group { margin-bottom: 1.25rem; }
        label { display: block; font-size: 0.8rem; font-weight: 500; margin-bottom: 0.4rem; color: var(--text); }
        label span { color: var(--muted); font-weight: 400; margin-left: 0.3rem; font-size: 0.75rem; }

        input[type="text"], textarea {
          width: 100%; padding: 0.7rem 0.9rem;
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 8px; color: var(--text); font-family: 'Inter', sans-serif;
          font-size: 0.9rem; outline: none; resize: vertical;
        }
        input:focus, textarea:focus { border-color: var(--accent); }
        textarea { min-height: 160px; font-family: 'JetBrains Mono', monospace; font-size: 0.82rem; line-height: 1.6; }

        .hint {
          background: rgba(108,142,255,0.08); border-left: 3px solid var(--accent);
          border-radius: 0 6px 6px 0; padding: 0.6rem 0.8rem; margin-top: 0.5rem;
          font-size: 0.75rem; color: var(--muted); line-height: 1.5;
        }
        .hint code { color: var(--accent2); font-family: 'JetBrains Mono', monospace; }

        .form-error { color: var(--error); font-size: 0.8rem; margin-top: 0.5rem; }

        .submit-btn {
          width: 100%; padding: 0.85rem; background: var(--accent);
          color: #fff; border: none; border-radius: 8px; font-size: 0.95rem;
          font-weight: 500; cursor: pointer; transition: opacity 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        .submit-btn:hover { opacity: 0.88; }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Result */
        .result-card {
          background: rgba(52, 211, 153, 0.08);
          border: 1px solid rgba(52, 211, 153, 0.3);
          border-radius: 10px; padding: 1.25rem;
        }
        .result-title { color: var(--success); font-weight: 600; margin-bottom: 0.75rem; font-size: 0.9rem; }
        .result-item {
          display: flex; justify-content: space-between; align-items: center;
          padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.06);
          font-size: 0.82rem;
        }
        .result-item:last-child { border-bottom: none; }
        .result-song { color: var(--text); }
        .result-badges { display: flex; gap: 0.3rem; }
        .rbadge { padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.68rem; font-weight: 500; }
        .rbadge-ok { background: rgba(52,211,153,0.15); color: var(--success); }
        .rbadge-no { background: rgba(252,129,129,0.15); color: var(--error); }
        .rbadge-exists { background: rgba(251,191,36,0.15); color: var(--warn); }

        .link-row { margin-top: 1rem; font-size: 0.8rem; color: var(--muted); }
        .link-row a { color: var(--accent); text-decoration: none; }
        .link-row a:hover { text-decoration: underline; }

        /* Spinner */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
      `}</style>

      <header className="header">
        <span className="header-badge">Dev</span>
        <span className="header-title">Developer Portal</span>
        <span className="header-sub">Tamil Lyrics Admin</span>
      </header>

      <main className="container">
        {!authed ? (
          <div className="auth-card">
            <div className="auth-icon">🔑</div>
            <h2 className="auth-title">Developer Access</h2>
            <p className="auth-sub">Enter your API key to manage lyrics content</p>
            <form onSubmit={handleAuth}>
              <input
                className="auth-input"
                type="password"
                placeholder="Enter API key..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                autoFocus
              />
              {authError && <p className="auth-error">{authError}</p>}
              <button className="btn-primary" type="submit">Unlock →</button>
            </form>
          </div>
        ) : (
          <>
            <div style={{marginBottom:'2rem',marginTop:'0.5rem'}}>
              <div style={{color:'var(--success)',fontSize:'0.82rem',marginBottom:'0.25rem'}}>
                ✓ Authenticated
              </div>
              <div style={{color:'var(--muted)',fontSize:'0.75rem'}}>
                Add topics and songs below. Lyrics will be automatically scraped from the web.
              </div>
            </div>

            <p className="section-title">Add New Topic & Songs</p>

            <form onSubmit={handleSubmit}>
              <div className="form-card">
                <div className="form-group">
                  <label>Topic Name <span>Group name for these songs</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Love Songs, A.R. Rahman Hits, 90s Classics…"
                    value={topicName}
                    onChange={e => setTopicName(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{marginBottom:0}}>
                  <label>Songs List <span>One per line</span></label>
                  <textarea
                    placeholder={"Kannaana Kanney | Viswasam\nVenmathi Venmathiye | Minnale\nRoja Jaaneman | Roja\nNenjukulle | Kadal"}
                    value={songsText}
                    onChange={e => setSongsText(e.target.value)}
                  />
                  <div className="hint">
                    Format: <code>Song Name | Movie Name</code> (movie is optional)<br/>
                    One song per line. Lyrics will be scraped automatically from deeplyrics.in (Tamil) and tamil2lyrics.com (English).
                  </div>
                </div>
              </div>

              {error && <p className="form-error">⚠ {error}</p>}

              <button className="submit-btn" type="submit" disabled={submitting}>
                {submitting ? (
                  <><div className="spinner"/><span>Processing songs one by one… please wait</span></>
                ) : (
                  '→ Add Topic & Scrape Lyrics'
                )}
              </button>
            </form>

            {result && (
              <div className="result-card" style={{marginTop:'1.5rem'}}>
                <p className="result-title">✓ Topic "{result.topic}" updated successfully</p>
                {result.results.map((r, i) => (
                  <div className="result-item" key={i}>
                    <span className="result-song">{r.song}</span>
                    <div className="result-badges">
                      {r.new === false
                        ? <span className="rbadge rbadge-exists">already exists</span>
                        : <>
                            <span className={`rbadge ${r.tamilFound ? 'rbadge-ok' : 'rbadge-no'}`}>
                              {r.tamilFound ? 'Tamil ✓' : 'Tamil ✗'}
                            </span>
                            <span className={`rbadge ${r.englishFound ? 'rbadge-ok' : 'rbadge-no'}`}>
                              {r.englishFound ? 'EN ✓' : 'EN ✗'}
                            </span>
                          </>
                      }
                    </div>
                  </div>
                ))}
                <p className="link-row">
                  <a href="/" target="_blank">View end-user site →</a>
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
