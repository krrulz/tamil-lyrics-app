// pages/suggest.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const emptySong = () => ({ songName: '', movie: '' });

export default function SuggestPage() {
  const [songs, setSongs] = useState([emptySong()]);
  const [submitterName, setSubmitterName] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [playlists, setPlaylists] = useState([]);
  const [allSongs, setAllSongs] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState('');
  const [songFilter, setSongFilter] = useState('');
  const [showExisting, setShowExisting] = useState(false);

  useEffect(() => {
    fetch('/api/playlists')
      .then(r => r.json())
      .then(d => setPlaylists(d.playlists || []))
      .catch(() => {});
    fetch('/api/songs?limit=500')
      .then(r => r.json())
      .then(d => setAllSongs(d.songs || []))
      .catch(() => {});
  }, []);

  const activePl = playlists.find(p => p.id === selectedPlaylist);
  const existingSongs = activePl
    ? allSongs.filter(s => activePl.songIds.includes(s.id))
    : allSongs;

  const updateSong = (i, field, val) =>
    setSongs(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  const addSong = () => setSongs(prev => [...prev, emptySong()]);
  const removeSong = (i) => setSongs(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valid = songs.filter(s => s.songName.trim());
    if (!valid.length) return setError('At least one song name is required');
    setSubmitting(true); setError('');
    try {
      const results = await Promise.all(valid.map(s =>
        fetch('/api/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ songName: s.songName.trim(), movie: s.movie.trim(), reason, submittedBy: submitterName.trim() || 'Anonymous' }),
        })
      ));
      const failed = results.filter(r => !r.ok);
      if (failed.length) { setError(`${failed.length} suggestion(s) failed to submit. Please try again.`); }
      else setSubmitted(true);
    } catch (err) {
      setError('Failed to submit. Please try again.');
    }
    setSubmitting(false);
  };

  const reset = () => { setSongs([emptySong()]); setSubmitterName(''); setReason(''); setSubmitted(false); setError(''); };

  return (
    <>
      <Head>
        <title>Suggest songs — Tamil Lyrics</title>
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
        .container { max-width: 600px; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; }
        h1 { font-size: clamp(1.5rem, 4vw, 2rem); font-weight: 700; margin-bottom: 0.4rem; letter-spacing: -0.02em; }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 2rem; }
        .ornament { text-align: center; font-size: 1.2rem; color: var(--gold); margin: 1.5rem 0 1rem; letter-spacing: 0.4rem; }
        label { display: block; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
        .required { color: var(--gold); }
        input, textarea { width: 100%; padding: 0.65rem 0.9rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.9rem; background: #FFFDF7; color: var(--deep); outline: none; font-family: inherit; }
        input:focus, textarea:focus { border-color: var(--gold); }
        textarea { resize: vertical; }
        .hint { font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; }
        .error-msg { background: #FFF0F0; border: 1px solid #F4A0A0; border-radius: 8px; padding: 0.75rem 1rem; color: #8B0000; font-size: 0.85rem; margin-bottom: 1rem; }
        /* Song entries */
        .songs-section { margin-bottom: 1.5rem; }
        .section-label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }
        .song-entry { background: var(--card-bg); border: 1.5px solid var(--border); border-radius: 10px; padding: 1rem 1.1rem; margin-bottom: 10px; position: relative; }
        .song-entry-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .song-num { font-size: 0.75rem; font-weight: 700; color: var(--gold); }
        .remove-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.1rem; padding: 0 4px; line-height: 1; }
        .remove-btn:hover { color: #c0392b; }
        .song-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 768px) {
          .container { padding: 1.75rem 1rem 3rem; }
          .fields-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .song-row { grid-template-columns: 1fr; }
          .container { padding: 1.25rem 0.9rem 2.5rem; }
          h1 { font-size: 1.4rem; }
          .existing-list { max-height: 200px; }
        }
        .field { margin-bottom: 0; }
        .field input { margin-top: 4px; }
        .add-song-btn { width: 100%; padding: 0.6rem; border: 2px dashed var(--border); border-radius: 8px; background: none; color: var(--text-muted); font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .add-song-btn:hover { border-color: var(--gold); color: var(--gold); }
        /* Submitter info */
        .submitter-section { background: var(--card-bg); border: 1.5px solid var(--border); border-radius: 10px; padding: 1rem 1.1rem; margin-bottom: 1.5rem; }
        .fields-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        @media (max-width: 480px) { .fields-grid { grid-template-columns: 1fr; } }
        .submit-btn { width: 100%; padding: 0.85rem; background: var(--deep); color: var(--gold-light); border: 2px solid var(--gold); border-radius: 10px; font-size: 1rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: opacity 0.15s; }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .success-box { text-align: center; padding: 3rem 1rem; animation: fadeIn 0.4s ease; }
        .success-icon { font-size: 3rem; margin-bottom: 1rem; }
        .success-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; }
        .success-sub { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
        .suggest-another { color: var(--gold); background: none; border: 2px solid var(--gold); border-radius: 8px; padding: 0.6rem 1.25rem; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
        @keyframes fadeIn { from { opacity:0;transform:translateY(8px); } to { opacity:1;transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner-gold { width: 18px; height: 18px; border: 2px solid rgba(200,146,42,0.3); border-top-color: var(--gold-light); border-radius: 50%; animation: spin 0.7s linear infinite; }
        .count-badge { background: var(--gold); color: var(--deep); font-size: 0.7rem; font-weight: 700; padding: 1px 7px; border-radius: 20px; margin-left: 6px; }
        .existing-section { background: var(--card-bg); border: 1.5px solid var(--border); border-radius: 10px; padding: 1rem 1.1rem; margin-bottom: 1.75rem; }
        .existing-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; }
        .existing-title { font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .existing-toggle { font-size: 0.75rem; color: var(--gold); font-weight: 600; }
        .existing-filter { width: 100%; margin-top: 0.75rem; padding: 0.5rem 0.75rem; border: 1.5px solid var(--border); border-radius: 8px; font-size: 0.85rem; background: #FFFDF7; color: var(--deep); outline: none; font-family: inherit; cursor: pointer; }
        .existing-filter:focus { border-color: var(--gold); }
        .existing-list { margin-top: 0.6rem; max-height: 260px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
        .existing-item { display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.5rem; border-radius: 6px; background: rgba(200,146,42,0.05); font-size: 0.82rem; }
        .existing-item-name { color: var(--deep); font-weight: 500; }
        .existing-item-movie { color: var(--text-muted); font-size: 0.75rem; }
        .existing-empty { text-align: center; color: var(--text-muted); font-size: 0.82rem; padding: 0.75rem 0; }
      `}</style>

      <div className="header">
        <Link href="/" className="back-btn">← Tamil Lyrics</Link>
      </div>

      <main className="container">
        {submitted ? (
          <div className="success-box">
            <div className="success-icon">🎵</div>
            <div className="success-title">{songs.filter(s => s.songName.trim()).length > 1 ? 'Songs submitted!' : 'Suggestion submitted!'}</div>
            <div className="success-sub">Thank you! Our team will review your suggestion{songs.filter(s => s.songName.trim()).length > 1 ? 's' : ''} and they may be added to the next playlist.</div>
            <button className="suggest-another" onClick={reset}>Suggest more songs</button>
          </div>
        ) : (
          <>
            <h1>Suggest songs</h1>
            <p className="subtitle">Know Tamil songs that belong in our collection? Add up to 10 at once.</p>
            <div className="ornament">✦ ✦ ✦</div>

            {allSongs.length > 0 && (
              <div className="existing-section">
                <div className="existing-header" onClick={() => setShowExisting(v => !v)}>
                  <span className="existing-title">
                    Already in collection
                    <span className="count-badge">{existingSongs.length}</span>
                  </span>
                  <span className="existing-toggle">{showExisting ? '▲ Hide' : '▼ View list'}</span>
                </div>
                {playlists.length > 0 && (
                  <select
                    className="existing-filter"
                    style={{ marginTop: '0.6rem' }}
                    value={selectedPlaylist}
                    onChange={e => { setSelectedPlaylist(e.target.value); setSongFilter(''); }}
                    onClick={e => e.stopPropagation()}
                  >
                    <option value="">All playlists ({allSongs.length} songs)</option>
                    {playlists.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.songIds.length} songs)</option>
                    ))}
                  </select>
                )}
                {showExisting && (
                  <>
                    <input
                      className="existing-filter"
                      type="text"
                      placeholder="Search existing songs…"
                      value={songFilter}
                      onChange={e => setSongFilter(e.target.value)}
                    />
                    <div className="existing-list">
                      {(() => {
                        const q = songFilter.trim().toLowerCase();
                        const filtered = q
                          ? existingSongs.filter(s =>
                              s.name.toLowerCase().includes(q) ||
                              (s.movie || '').toLowerCase().includes(q)
                            )
                          : existingSongs;
                        if (!filtered.length) return <div className="existing-empty">No matches found.</div>;
                        return filtered.map(s => (
                          <div key={s.id} className="existing-item">
                            <span className="existing-item-name">{s.name}</span>
                            {s.movie && <span className="existing-item-movie">🎬 {s.movie}</span>}
                          </div>
                        ));
                      })()}
                    </div>
                  </>
                )}
              </div>
            )}

            {error && <div className="error-msg">⚠ {error}</div>}

            <form onSubmit={handleSubmit}>
              {/* Songs */}
              <div className="songs-section">
                <div className="section-label">
                  Songs to suggest <span className="count-badge">{songs.length}</span>
                </div>
                {songs.map((s, i) => (
                  <div key={i} className="song-entry">
                    {songs.length > 1 && (
                      <div className="song-entry-header">
                        <span className="song-num">Song {i + 1}</span>
                        <button type="button" className="remove-btn" onClick={() => removeSong(i)} title="Remove">✕</button>
                      </div>
                    )}
                    <div className="song-row">
                      <div className="field">
                        <label>Song name <span className="required">*</span></label>
                        <input type="text" value={s.songName} onChange={e => updateSong(i, 'songName', e.target.value)}
                          placeholder="e.g. Venmathi Venmathiye" />
                      </div>
                      <div className="field">
                        <label>Movie / album</label>
                        <input type="text" value={s.movie} onChange={e => updateSong(i, 'movie', e.target.value)}
                          placeholder="e.g. Minnale" />
                      </div>
                    </div>
                  </div>
                ))}
                {songs.length < 10 && (
                  <button type="button" className="add-song-btn" onClick={addSong}>+ Add another song</button>
                )}
              </div>

              {/* Submitter info */}
              <div className="submitter-section">
                <div className="fields-grid">
                  <div className="field">
                    <label>Your name</label>
                    <input type="text" value={submitterName} onChange={e => setSubmitterName(e.target.value)}
                      placeholder="e.g. Priya" maxLength={40} />
                  </div>
                  <div className="field">
                    <label>Why include these?</label>
                    <input type="text" value={reason} onChange={e => setReason(e.target.value)}
                      placeholder="e.g. 90s classics…" maxLength={120} />
                    <p className="hint">Optional</p>
                  </div>
                </div>
              </div>

              <button className="submit-btn" type="submit" disabled={submitting}>
                {submitting ? <><span className="spinner-gold" /> Submitting…</> : `→ Submit ${songs.filter(s => s.songName.trim()).length || ''} suggestion${songs.filter(s => s.songName.trim()).length !== 1 ? 's' : ''}`}
              </button>
            </form>
          </>
        )}
      </main>
    </>
  );
}
