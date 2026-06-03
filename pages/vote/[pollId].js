// pages/vote/[pollId].js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

async function getFingerprint() {
  const parts = [navigator.userAgent, navigator.language, screen.colorDepth, `${screen.width}x${screen.height}`, new Date().getTimezoneOffset(), navigator.hardwareConcurrency, navigator.platform].join('|');
  const data = new TextEncoder().encode(parts);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function VotePage() {
  const { query } = useRouter();
  const { pollId } = query;
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [voterName, setVoterName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [voted, setVoted] = useState(false);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [fp, setFp] = useState('');

  useEffect(() => {
    if (!pollId) return;
    fetch(`/api/polls/${pollId}`)
      .then(r => { if (!r.ok) return r.json().then(d => { throw new Error(d.error || 'Poll unavailable'); }); return r.json(); })
      .then(d => { setPoll(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
    getFingerprint().then(setFp);
  }, [pollId]);

  const toggle = (songId) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(songId) ? next.delete(songId) : next.add(songId);
      return next;
    });
  };

  const submit = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    const res = await fetch(`/api/polls/${pollId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ songIds: [...selected], voterName: voterName.trim() || 'Anonymous', fingerprint: fp }),
    });
    const data = await res.json();
    if (res.status === 409) { setAlreadyVoted(true); }
    else if (res.ok) { setVoted(true); }
    else { setError(data.error || 'Failed to submit'); }
    setSubmitting(false);
  };

  return (
    <>
      <Head>
        <title>{poll?.title || 'Vote'} — Tamil Lyrics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --cream: #FAF6EF; --deep: #1C1208; --gold: #C8922A;
          --gold-light: #E8B355; --card-bg: #FFF8EE; --border: #E8D5B0; --text-muted: #7A6645;
        }
        body { background: var(--cream); color: var(--deep); font-family: 'Inter', sans-serif; min-height: 100vh; }
        .header { background: var(--deep); padding: 1rem 1.5rem; display: flex; align-items: center; gap: 1rem; border-bottom: 2px solid var(--gold); }
        .back-btn { color: var(--gold-light); text-decoration: none; font-size: 0.9rem; opacity: 0.8; }
        .back-btn:hover { opacity: 1; }
        .container { max-width: 680px; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
        .page-title { font-size: clamp(1.5rem, 4vw, 2rem); font-weight: 700; color: var(--deep); margin-bottom: 0.5rem; letter-spacing: -0.02em; }
        .page-desc { font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.5rem; }
        .hint { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1.5rem; padding: 0.6rem 0.9rem; background: #FFF8EE; border: 1px solid var(--border); border-radius: 8px; }
        .songs-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 1.5rem; }
        .song-option {
          display: flex; align-items: center; gap: 12px;
          padding: 0.9rem 1.1rem; background: var(--card-bg); border: 1.5px solid var(--border);
          border-radius: 10px; cursor: pointer; transition: border-color 0.15s, background 0.15s; user-select: none;
        }
        .song-option:hover { border-color: var(--gold); }
        .song-option.selected { border-color: var(--gold); background: #FFF3DC; }
        .checkbox {
          width: 20px; height: 20px; border: 2px solid var(--border); border-radius: 6px;
          flex-shrink: 0; display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .song-option.selected .checkbox { background: var(--gold); border-color: var(--gold); }
        .checkmark { color: #fff; font-size: 12px; font-weight: 700; }
        .song-details { flex: 1; min-width: 0; }
        .song-name { font-size: 0.95rem; font-weight: 600; color: var(--deep); }
        .song-movie { font-size: 0.78rem; color: var(--text-muted); margin-top: 2px; }
        .name-input-wrap { margin-bottom: 1rem; }
        .name-label { display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 6px; }
        .name-input { width: 100%; padding: 0.65rem 0.9rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; outline: none; background: var(--card-bg); color: var(--deep); }
        .name-input:focus { border-color: var(--gold); }
        .submit-btn {
          width: 100%; padding: 0.9rem; background: var(--deep); color: var(--gold-light);
          border: 2px solid var(--gold); border-radius: 10px; font-size: 1rem; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: opacity 0.15s;
        }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .selection-count { text-align: center; font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1rem; }
        .selection-count strong { color: var(--gold); }
        .result-box { text-align: center; padding: 3rem 1rem; animation: fadeIn 0.4s ease; }
        .result-icon { font-size: 3rem; margin-bottom: 1rem; }
        .result-title { font-size: 1.5rem; font-weight: 700; color: var(--deep); margin-bottom: 0.5rem; }
        .result-sub { color: var(--text-muted); font-size: 0.9rem; }
        .divider { border: none; border-top: 1px solid var(--border); margin: 1.5rem 0; }
        .error-msg { background: #FFF0F0; border: 1px solid #F4A0A0; border-radius: 8px; padding: 0.75rem 1rem; color: #8B0000; font-size: 0.88rem; margin-bottom: 1rem; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner-gold { width: 18px; height: 18px; border: 2px solid rgba(200,146,42,0.3); border-top-color: var(--gold-light); border-radius: 50%; animation: spin 0.7s linear infinite; }
        @media (max-width: 480px) { .song-option { padding: 0.75rem 0.9rem; } }
      `}</style>

      <div className="header">
        <Link href="/" className="back-btn">← Tamil Lyrics</Link>
      </div>

      <main className="container">
        {loading && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>Loading poll…</p>}

        {error && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔒</div>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>{error}</p>
            <Link href="/" style={{ color: 'var(--gold)', fontSize: '0.9rem' }}>← Back to home</Link>
          </div>
        )}

        {alreadyVoted && (
          <div className="result-box">
            <div className="result-icon">✋</div>
            <div className="result-title">Already voted</div>
            <div className="result-sub">You've already cast your vote in this poll. Each person can vote only once.</div>
            <div className="divider" />
            <Link href="/" style={{ color: 'var(--gold)', fontSize: '0.9rem' }}>← Back to home</Link>
          </div>
        )}

        {voted && (
          <div className="result-box">
            <div className="result-icon">🎉</div>
            <div className="result-title">Vote recorded!</div>
            <div className="result-sub">You voted for <strong>{selected.size}</strong> song{selected.size !== 1 ? 's' : ''}. Thank you!</div>
            <div className="divider" />
            <Link href="/" style={{ color: 'var(--gold)', fontSize: '0.9rem' }}>← Back to home</Link>
          </div>
        )}

        {poll && !voted && !alreadyVoted && !error && (
          <>
            <h1 className="page-title">{poll.title}</h1>
            {poll.description && <p className="page-desc">{poll.description}</p>}
            <div className="hint">✦ Select as many songs as you like, then cast your vote. You can only vote once.</div>

            <div className="songs-list">
              {poll.songs.map(song => {
                const isSelected = selected.has(song.songId);
                return (
                  <div key={song.songId} className={`song-option${isSelected ? ' selected' : ''}`} onClick={() => toggle(song.songId)}>
                    <div className="checkbox">
                      {isSelected && <span className="checkmark">✓</span>}
                    </div>
                    <div className="song-details">
                      <div className="song-name">{song.name}</div>
                      {song.movie && <div className="song-movie">🎬 {song.movie}</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {error && <div className="error-msg">⚠ {error}</div>}

            <div className="name-input-wrap">
              <label className="name-label">Your name (optional — shown in leaderboard)</label>
              <input className="name-input" type="text" placeholder="e.g. Priya" value={voterName} onChange={e => setVoterName(e.target.value)} maxLength={40} />
            </div>

            {selected.size > 0 && (
              <p className="selection-count">You've selected <strong>{selected.size}</strong> song{selected.size !== 1 ? 's' : ''}</p>
            )}

            <button className="submit-btn" disabled={selected.size === 0 || submitting} onClick={submit}>
              {submitting ? <><span className="spinner-gold" /> Submitting…</> : selected.size === 0 ? 'Select songs to vote' : `Cast vote for ${selected.size} song${selected.size !== 1 ? 's' : ''}`}
            </button>
          </>
        )}
      </main>
    </>
  );
}
