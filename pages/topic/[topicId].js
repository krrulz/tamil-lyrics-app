/* pages/topic/[topicId].js */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function TopicPage() {
  const router = useRouter();
  const { topicId } = router.query;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Add song panel
  const [showAdd, setShowAdd] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiKeySet, setApiKeySet] = useState(false);
  const [addMode, setAddMode] = useState('auto'); // 'auto' | 'manual'
  const [songInput, setSongInput] = useState('');
  const [manualSong, setManualSong] = useState({ name: '', movie: '', tamil: '', english: '' });
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState(null);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    if (!topicId) return;
    fetch(`/api/topic-songs?topicId=${topicId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [topicId]);

  const reload = () => {
    setLoading(true);
    fetch(`/api/topic-songs?topicId=${topicId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const handleAutoAdd = async (e) => {
    e.preventDefault();
    setAddError(''); setAddResult(null);
    const lines = songInput.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { setAddError('Enter at least one song'); return; }
    setAdding(true);
    const results = [];
    for (const line of lines) {
      const [name, movie] = line.split('|').map(s => s.trim());
      try {
        const res = await fetch('/api/dev/add-topic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
          body: JSON.stringify({ topicName: data.topicName, song: { name, movie: movie || '' } }),
        });
        const d = await res.json();
        if (!res.ok) { setAddError(d.error || 'Failed on: ' + name); break; }
        results.push(d.result);
        setAddResult([...results]);
      } catch { setAddError('Network error'); break; }
    }
    if (results.length === lines.length) { setSongInput(''); reload(); }
    setAdding(false);
  };

  const handleManualAdd = async (e) => {
    e.preventDefault();
    setAddError(''); setAddResult(null);
    if (!manualSong.name.trim()) { setAddError('Song name is required'); return; }
    setAdding(true);
    try {
      const res = await fetch('/api/dev/add-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ topicName: data.topicName, song: { name: manualSong.name, movie: manualSong.movie, tamilLyrics: manualSong.tamil, englishLyrics: manualSong.english } }),
      });
      const d = await res.json();
      if (!res.ok) setAddError(d.error || 'Failed');
      else { setAddResult([d.result]); setManualSong({ name: '', movie: '', tamil: '', english: '' }); reload(); }
    } catch { setAddError('Network error'); }
    setAdding(false);
  };

  return (
    <>
      <Head>
        <title>{data?.topicName || 'Songs'} — Tamil Lyrics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --cream: #FAF6EF; --deep: #1C1208; --gold: #C8922A;
          --gold-light: #E8B355; --card-bg: #FFF8EE; --border: #E8D5B0; --text-muted: #7A6645;
          --dev-bg: #0F1117; --dev-surface: #1A1E2E; --dev-border: #2D3748;
          --dev-text: #E2E8F0; --dev-muted: #64748B; --dev-accent: #6C8EFF;
          --success: #34D399; --error: #FC8181; --warn: #FBBF24;
        }
        body { background: var(--cream); color: var(--deep); font-family: 'Inter', sans-serif; min-height: 100vh; }

        .topbar { background: var(--deep); padding: 1rem 1.5rem; display: flex; align-items: center; gap: 1rem; border-bottom: 2px solid var(--gold); }
        .back-btn { color: var(--gold-light); text-decoration: none; font-size: 0.9rem; display: flex; align-items: center; gap: 0.4rem; opacity: 0.8; transition: opacity 0.15s; }
        .back-btn:hover { opacity: 1; }
        .topbar-title { font-family: 'Inter', sans-serif; font-size: 1.1rem; color: #FFF8EE; font-weight: 600; }

        .container { max-width: 700px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 0.3rem; }
        .page-title { font-family: 'Inter', sans-serif; font-size: clamp(1.7rem, 5vw, 2.3rem); font-weight: 700; color: var(--deep); letter-spacing: -0.02em; }
        .page-subtitle { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.75rem; }

        .add-song-btn {
          display: flex; align-items: center; gap: 0.4rem;
          background: var(--deep); color: var(--gold-light); border: 1.5px solid var(--gold);
          padding: 0.55rem 1.1rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600;
          cursor: pointer; white-space: nowrap; transition: opacity 0.15s; flex-shrink: 0; margin-top: 0.3rem;
        }
        .add-song-btn:hover { opacity: 0.85; }

        .divider { border: none; border-top: 1px solid var(--border); margin-bottom: 1.5rem; }

        .songs-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .song-item {
          background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px;
          padding: 1rem 1.25rem; text-decoration: none; display: block;
          transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s; position: relative;
        }
        .song-item:hover { transform: translateX(4px); border-color: var(--gold); box-shadow: 0 4px 14px rgba(28,18,8,0.09); }
        .song-name { font-family: 'Inter', sans-serif; font-size: 1.05rem; color: var(--deep); font-weight: 600; margin-bottom: 0.25rem; }
        .song-movie { font-size: 0.8rem; color: var(--text-muted); }
        .song-badges { display: flex; gap: 0.4rem; margin-top: 0.5rem; flex-wrap: wrap; }
        .badge { font-size: 0.68rem; padding: 0.18rem 0.55rem; border-radius: 20px; font-weight: 500; letter-spacing: 0.04em; }
        .badge-ta { background: #FDF0D5; color: #8B5E0A; border: 1px solid #E8B355; }
        .badge-en { background: #E8F0FE; color: #1A4A8A; border: 1px solid #90B4F4; }
        .badge-na { background: #F5F5F5; color: #999; border: 1px solid #ddd; }
        .song-arrow { position: absolute; right: 1.25rem; top: 50%; transform: translateY(-50%); color: var(--gold); font-size: 1rem; }

        /* Add Song Panel */
        .add-panel {
          background: var(--dev-bg); border: 1px solid var(--dev-border);
          border-radius: 14px; padding: 1.5rem; margin-bottom: 2rem;
        }
        .add-panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
        .add-panel-title { color: var(--dev-text); font-size: 0.95rem; font-weight: 600; }
        .close-btn { background: none; border: none; color: var(--dev-muted); font-size: 1.3rem; cursor: pointer; line-height: 1; }
        .close-btn:hover { color: var(--dev-text); }

        .key-row { display: flex; gap: 0.5rem; margin-bottom: 1.25rem; }
        .key-input {
          flex: 1; padding: 0.55rem 0.8rem; background: var(--dev-surface);
          border: 1px solid var(--dev-border); border-radius: 6px; color: var(--dev-text);
          font-family: 'Inter', monospace; font-size: 0.85rem; outline: none;
        }
        .key-input:focus { border-color: var(--dev-accent); }
        .key-btn {
          padding: 0.55rem 1rem; background: var(--dev-accent); color: #fff;
          border: none; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer;
        }

        .mode-tabs { display: flex; gap: 0.4rem; margin-bottom: 1rem; }
        .mode-tab {
          padding: 0.35rem 0.9rem; border-radius: 6px; border: 1px solid; font-size: 0.8rem;
          cursor: pointer; font-weight: 500;
        }
        .mode-tab-active { background: var(--dev-accent); color: #fff; border-color: var(--dev-accent); }
        .mode-tab-inactive { background: var(--dev-surface); color: var(--dev-muted); border-color: var(--dev-border); }

        .dev-label { display: block; font-size: 0.75rem; font-weight: 500; color: var(--dev-muted); margin-bottom: 0.35rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .dev-input, .dev-textarea {
          width: 100%; padding: 0.6rem 0.8rem; background: var(--dev-surface);
          border: 1px solid var(--dev-border); border-radius: 6px; color: var(--dev-text);
          font-family: 'Inter', sans-serif; font-size: 0.88rem; outline: none;
          margin-bottom: 0.9rem; resize: vertical;
        }
        .dev-input:focus, .dev-textarea:focus { border-color: var(--dev-accent); }
        .dev-hint { font-size: 0.72rem; color: var(--dev-muted); margin-top: -0.6rem; margin-bottom: 0.9rem; }

        .submit-btn {
          width: 100%; padding: 0.7rem; background: var(--dev-accent); color: #fff;
          border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .add-error { color: var(--error); font-size: 0.8rem; margin-bottom: 0.75rem; }

        .add-results { margin-top: 1rem; }
        .add-result-item { display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0; border-bottom: 1px solid var(--dev-border); font-size: 0.8rem; color: var(--dev-text); }
        .rbadge { padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.68rem; font-weight: 600; }
        .rbadge-ok { background: rgba(52,211,153,0.15); color: var(--success); }
        .rbadge-no { background: rgba(252,129,129,0.15); color: var(--error); }
        .rbadge-exists { background: rgba(251,191,36,0.15); color: var(--warn); }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }

        .loading { text-align: center; padding: 4rem 1rem; color: var(--text-muted); font-style: italic; }
        .empty { text-align: center; padding: 3rem 1rem; color: var(--text-muted); }
        @media (max-width: 480px) { .song-arrow { display: none; } }
      `}</style>

      <div className="topbar">
        <Link href="/" className="back-btn">← Back</Link>
        <span style={{color:'#4A3018',fontSize:'1rem'}}>|</span>
        <span className="topbar-title">Tamil Lyrics</span>
      </div>

      <main className="container">
        {loading && <div className="loading">Loading songs…</div>}
        {!loading && data && (
          <>
            <div className="page-header">
              <h1 className="page-title">{data.topicName}</h1>
              <button className="add-song-btn" onClick={() => { setShowAdd(v => !v); setAddResult(null); setAddError(''); }}>
                {showAdd ? '✕ Close' : '＋ Add Songs'}
              </button>
            </div>
            <p className="page-subtitle">{data.songs.length} song{data.songs.length !== 1 ? 's' : ''} in this collection</p>

            {/* Add Song Panel */}
            {showAdd && (
              <div className="add-panel">
                <div className="add-panel-header">
                  <span className="add-panel-title">➕ Add Songs to "{data.topicName}"</span>
                  <button className="close-btn" onClick={() => setShowAdd(false)}>×</button>
                </div>

                {!apiKeySet ? (
                  <div className="key-row">
                    <input className="key-input" type="password" placeholder="Enter dev API key…" value={apiKey} onChange={e => setApiKey(e.target.value)} onKeyDown={e => e.key === 'Enter' && apiKey && setApiKeySet(true)} />
                    <button className="key-btn" onClick={() => apiKey && setApiKeySet(true)}>Unlock</button>
                  </div>
                ) : (
                  <>
                    <div className="mode-tabs">
                      <button className={`mode-tab ${addMode==='auto'?'mode-tab-active':'mode-tab-inactive'}`} onClick={() => setAddMode('auto')}>Auto-scrape</button>
                      <button className={`mode-tab ${addMode==='manual'?'mode-tab-active':'mode-tab-inactive'}`} onClick={() => setAddMode('manual')}>Manual entry</button>
                    </div>

                    {addMode === 'auto' && (
                      <form onSubmit={handleAutoAdd}>
                        <label className="dev-label">Songs to add <span style={{textTransform:'none',letterSpacing:0}}>(one per line)</span></label>
                        <textarea className="dev-textarea" rows={4}
                          placeholder={"Kannaana Kanney | Viswasam\nVenmathi Venmathiye | Minnale"}
                          value={songInput} onChange={e => setSongInput(e.target.value)} />
                        <p className="dev-hint">Format: Song Name | Movie (movie optional). Lyrics scraped automatically.</p>
                        {addError && <p className="add-error">⚠ {addError}</p>}
                        <button className="submit-btn" type="submit" disabled={adding}>
                          {adding ? <><div className="spinner"/><span>Scraping…</span></> : '→ Add & Scrape'}
                        </button>
                      </form>
                    )}

                    {addMode === 'manual' && (
                      <form onSubmit={handleManualAdd}>
                        <label className="dev-label">Song Name</label>
                        <input className="dev-input" type="text" placeholder="e.g. Aararo Aariraro" value={manualSong.name} onChange={e => setManualSong(p=>({...p,name:e.target.value}))} />
                        <label className="dev-label">Movie <span style={{textTransform:'none'}}>optional</span></label>
                        <input className="dev-input" type="text" placeholder="e.g. Ilaiyaraaja" value={manualSong.movie} onChange={e => setManualSong(p=>({...p,movie:e.target.value}))} />
                        <label className="dev-label">Tamil Lyrics</label>
                        <textarea className="dev-textarea" rows={5} placeholder="ஆரோ ஆரிரோ…" value={manualSong.tamil} onChange={e => setManualSong(p=>({...p,tamil:e.target.value}))} />
                        <label className="dev-label">English Transliteration</label>
                        <textarea className="dev-textarea" rows={5} placeholder="Aararo Aariraro…" value={manualSong.english} onChange={e => setManualSong(p=>({...p,english:e.target.value}))} />
                        {addError && <p className="add-error">⚠ {addError}</p>}
                        <button className="submit-btn" type="submit" disabled={adding}>
                          {adding ? <><div className="spinner"/><span>Saving…</span></> : '→ Save Song'}
                        </button>
                      </form>
                    )}

                    {addResult && (
                      <div className="add-results">
                        {addResult.map((r, i) => (
                          <div className="add-result-item" key={i}>
                            <span>{r.song}</span>
                            <div style={{display:'flex',gap:'0.3rem'}}>
                              {r.new === false
                                ? <span className="rbadge rbadge-exists">already exists</span>
                                : <>
                                    <span className={`rbadge ${r.tamilFound ? 'rbadge-ok' : 'rbadge-no'}`}>{r.tamilFound ? 'Tamil ✓' : 'Tamil ✗'}</span>
                                    <span className={`rbadge ${r.englishFound ? 'rbadge-ok' : 'rbadge-no'}`}>{r.englishFound ? 'EN ✓' : 'EN ✗'}</span>
                                  </>
                              }
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <hr className="divider" />
            {data.songs.length === 0 && <div className="empty">No songs yet. Use "Add Songs" above.</div>}
            <div className="songs-list">
              {data.songs.map(song => (
                <Link key={song.id} href={`/song/${song.id}`} className="song-item">
                  <div className="song-name">{song.name}</div>
                  {song.movie && <div className="song-movie">🎬 {song.movie}</div>}
                  <div className="song-badges">
                    {song.tamilAvailable ? <span className="badge badge-ta">தமிழ் ✓</span> : <span className="badge badge-na">தமிழ் —</span>}
                    {song.englishAvailable ? <span className="badge badge-en">English ✓</span> : <span className="badge badge-na">English —</span>}
                  </div>
                  <span className="song-arrow">→</span>
                </Link>
              ))}
            </div>
          </>
        )}
        {!loading && !data && <div className="empty">Topic not found.</div>}
      </main>
    </>
  );
}

export default function TopicPage() {
  const router = useRouter();
  const { topicId } = router.query;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!topicId) return;
    fetch(`/api/topic-songs?topicId=${topicId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [topicId]);

  return (
    <>
      <Head>
        <title>{data?.topicName || 'Songs'} — Tamil Lyrics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Tamil:wght@400;600;700&family=Lora:ital,wght@0,600;1,400&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --cream: #FAF6EF; --deep: #1C1208; --gold: #C8922A;
          --gold-light: #E8B355; --rust: #8B3A1A;
          --card-bg: #FFF8EE; --border: #E8D5B0; --text-muted: #7A6645;
        }
        body { background: var(--cream); color: var(--deep); font-family: 'Inter', sans-serif; min-height: 100vh; }

        .topbar {
          background: var(--deep);
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          border-bottom: 2px solid var(--gold);
        }
        .back-btn {
          color: var(--gold-light); text-decoration: none; font-size: 0.9rem;
          display: flex; align-items: center; gap: 0.4rem;
          opacity: 0.8; transition: opacity 0.15s;
        }
        .back-btn:hover { opacity: 1; }
        .topbar-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.3rem; color: #FFF8EE; font-weight: 700;
        }

        .container { max-width: 700px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
        .page-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(1.8rem, 5vw, 2.5rem);
          color: var(--deep); margin-bottom: 0.3rem;
        }
        .page-subtitle { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 2rem; letter-spacing: 0.05em; }

        .divider {
          border: none; border-top: 1px solid var(--border);
          margin-bottom: 1.5rem;
        }

        .songs-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .song-item {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 1rem 1.25rem;
          text-decoration: none;
          display: block;
          transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
          position: relative;
        }
        .song-item:hover { transform: translateX(4px); border-color: var(--gold); box-shadow: 0 4px 14px rgba(28,18,8,0.09); }
        .song-name {
          font-family: 'Playfair Display', serif;
          font-size: 1.1rem; color: var(--deep); font-weight: 600; margin-bottom: 0.25rem;
        }
        .song-movie { font-size: 0.8rem; color: var(--text-muted); }
        .song-badges { display: flex; gap: 0.4rem; margin-top: 0.5rem; flex-wrap: wrap; }
        .badge {
          font-size: 0.68rem; padding: 0.18rem 0.55rem; border-radius: 20px;
          font-weight: 500; letter-spacing: 0.04em;
        }
        .badge-ta { background: #FDF0D5; color: #8B5E0A; border: 1px solid #E8B355; }
        .badge-en { background: #E8F0FE; color: #1A4A8A; border: 1px solid #90B4F4; }
        .badge-na { background: #F5F5F5; color: #999; border: 1px solid #ddd; }
        .song-arrow {
          position: absolute; right: 1.25rem; top: 50%;
          transform: translateY(-50%);
          color: var(--gold); font-size: 1rem;
        }

        .loading { text-align: center; padding: 4rem 1rem; color: var(--text-muted); font-style: italic; }
        .empty { text-align: center; padding: 3rem 1rem; color: var(--text-muted); }

        @media (max-width: 480px) { .song-arrow { display: none; } }
      `}</style>

      <div className="topbar">
        <Link href="/" className="back-btn">← Back</Link>
        <span style={{color:'#4A3018',fontSize:'1rem'}}>|</span>
        <span className="topbar-title">Tamil Lyrics</span>
      </div>

      <main className="container">
        {loading && <div className="loading">Loading songs…</div>}
        {!loading && data && (
          <>
            <h1 className="page-title">{data.topicName}</h1>
            <p className="page-subtitle">{data.songs.length} songs in this collection</p>
            <hr className="divider" />
            {data.songs.length === 0 && <div className="empty">No songs in this topic yet.</div>}
            <div className="songs-list">
              {data.songs.map(song => (
                <Link key={song.id} href={`/song/${song.id}`} className="song-item">
                  <div className="song-name">{song.name}</div>
                  {song.movie && <div className="song-movie">🎬 {song.movie}</div>}
                  <div className="song-badges">
                    {song.tamilAvailable
                      ? <span className="badge badge-ta">தமிழ் ✓</span>
                      : <span className="badge badge-na">தமிழ் —</span>}
                    {song.englishAvailable
                      ? <span className="badge badge-en">English ✓</span>
                      : <span className="badge badge-na">English —</span>}
                  </div>
                  <span className="song-arrow">→</span>
                </Link>
              ))}
            </div>
          </>
        )}
        {!loading && !data && <div className="empty">Topic not found.</div>}
      </main>
    </>
  );
}
