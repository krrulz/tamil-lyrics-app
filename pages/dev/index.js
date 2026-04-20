/* pages/dev/index.js - Developer Portal with Preview → Edit → Save workflow */
import { useState } from 'react';
import Head from 'next/head';

const STYLES = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0F1117; --surface: #1A1E2E; --surface2: #222840;
    --accent: #6C8EFF; --accent2: #A78BFA;
    --text: #E2E8F0; --muted: #64748B; --border: #2D3748;
    --success: #34D399; --error: #FC8181; --warn: #FBBF24;
    --male: #93B4F8; --female: #F4A0C0; --chorus: #7EC87A;
  }
  body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; min-height: 100vh; }
  .header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 1rem 1.5rem; display: flex; align-items: center; gap: 0.75rem; }
  .badge { background: var(--accent); color: #fff; font-size: 0.65rem; padding: 0.2rem 0.55rem; border-radius: 4px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
  .container { max-width: 800px; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
  .auth-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 2rem; margin-top: 3rem; text-align: center; }
  .auth-icon { font-size: 2.5rem; margin-bottom: 1rem; }
  .auth-title { font-size: 1.3rem; font-weight: 600; margin-bottom: 0.4rem; }
  .auth-sub { font-size: 0.82rem; color: var(--muted); margin-bottom: 1.5rem; }
  .auth-input { width: 100%; padding: 0.75rem 1rem; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 0.9rem; margin-bottom: 0.75rem; outline: none; letter-spacing: 0.05em; }
  .auth-input:focus { border-color: var(--accent); }
  .auth-error { color: var(--error); font-size: 0.8rem; margin-bottom: 0.75rem; }
  .section-title { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
  .section-title::after { content: ''; flex: 1; height: 1px; background: var(--border); }
  .form-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
  .form-group { margin-bottom: 1.1rem; }
  label { display: block; font-size: 0.8rem; font-weight: 500; margin-bottom: 0.4rem; color: var(--text); }
  label span { color: var(--muted); font-weight: 400; margin-left: 0.3rem; font-size: 0.75rem; }
  input[type="text"], textarea { width: 100%; padding: 0.7rem 0.9rem; background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-family: 'Inter', sans-serif; font-size: 0.9rem; outline: none; resize: vertical; }
  input[type="text"]:focus, textarea:focus { border-color: var(--accent); }
  .hint { font-size: 0.72rem; color: var(--muted); margin-top: 0.4rem; }
  .btn { padding: 0.7rem 1.4rem; border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: opacity 0.15s; display: inline-flex; align-items: center; gap: 0.5rem; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary { background: var(--accent); color: #fff; width: 100%; justify-content: center; }
  .btn-primary:hover:not(:disabled) { opacity: 0.88; }
  .btn-sm { padding: 0.4rem 0.9rem; font-size: 0.8rem; border-radius: 6px; }
  .btn-success { background: rgba(52,211,153,0.15); color: var(--success); border: 1px solid var(--success); }
  .btn-warn { background: rgba(251,191,36,0.15); color: var(--warn); border: 1px solid var(--warn); }
  .btn-danger { background: rgba(252,129,129,0.15); color: var(--error); border: 1px solid var(--error); }
  .form-error { color: var(--error); font-size: 0.82rem; margin-bottom: 1rem; }

  /* Preview cards */
  .preview-list { display: flex; flex-direction: column; gap: 1rem; margin-top: 1.5rem; }
  .preview-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
  .preview-header { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); }
  .preview-name { font-weight: 600; font-size: 0.95rem; }
  .preview-status { font-size: 0.72rem; padding: 0.2rem 0.55rem; border-radius: 4px; font-weight: 600; }
  .status-found { background: rgba(52,211,153,0.15); color: var(--success); }
  .status-notfound { background: rgba(252,129,129,0.15); color: var(--error); }
  .preview-body { padding: 1rem; }
  .preview-tabs { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
  .preview-tab { padding: 0.3rem 0.75rem; border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer; border: 1px solid var(--border); background: var(--surface2); color: var(--muted); }
  .preview-tab.active { background: var(--accent); color: #fff; border-color: var(--accent); }
  .lyrics-preview { font-size: 0.8rem; color: var(--text); white-space: pre-wrap; max-height: 200px; overflow-y: auto; background: var(--surface2); border-radius: 6px; padding: 0.75rem; line-height: 1.7; }
  .lyrics-edit { width: 100%; min-height: 200px; font-size: 0.8rem; padding: 0.75rem; background: var(--surface2); border: 1px solid var(--accent); border-radius: 6px; color: var(--text); resize: vertical; line-height: 1.7; }
  .preview-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap; }
  .preview-note { font-size: 0.72rem; color: var(--muted); margin-top: 0.5rem; }
  .label-tip { font-size: 0.72rem; background: rgba(108,142,255,0.08); border: 1px solid rgba(108,142,255,0.2); border-radius: 6px; padding: 0.5rem 0.75rem; margin-bottom: 0.75rem; color: var(--muted); line-height: 1.6; }
  .label-tip code { color: var(--accent2); }

  /* Results */
  .result-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem; margin-top: 1.5rem; }
  .result-title { font-size: 0.85rem; color: var(--success); margin-bottom: 0.75rem; font-weight: 600; }
  .result-item { display: flex; justify-content: space-between; align-items: center; padding: 0.45rem 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.82rem; }
  .result-item:last-child { border-bottom: none; }
  .rbadge { padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.68rem; font-weight: 600; }
  .rbadge-ok { background: rgba(52,211,153,0.15); color: var(--success); }
  .rbadge-no { background: rgba(252,129,129,0.15); color: var(--error); }
  .rbadge-exists { background: rgba(251,191,36,0.15); color: var(--warn); }
  .rbadge-ai { background: rgba(167,139,250,0.15); color: #A78BFA; }

  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
  .step-label { font-size: 0.7rem; background: var(--accent); color: #fff; border-radius: 50%; width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; margin-right: 0.4rem; flex-shrink: 0; }
`;

// States: 'input' → 'previewing' → 'editing' → 'saving' → 'done'
export default function DevPortal() {
  const [apiKey, setApiKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');

  const [topicName, setTopicName] = useState('');
  const [songsText, setSongsText] = useState('');

  // Preview state — array of { song, movie, found, tamilLyrics, englishLyrics, tamilSource, englishSource, status, editTab, editing }
  const [previews, setPreviews] = useState([]);
  const [step, setStep] = useState('input'); // 'input' | 'previewing' | 'saving' | 'done'
  const [loadingIdx, setLoadingIdx] = useState(-1); // which song is being fetched
  const [saveResults, setSaveResults] = useState([]);
  const [error, setError] = useState('');

  const handleAuth = (e) => {
    e.preventDefault();
    if (!apiKey.trim()) { setAuthError('Enter your API key'); return; }
    setAuthed(true);
  };

  // Step 1: fetch previews one by one
  const handlePreview = async (e) => {
    e.preventDefault();
    setError('');
    if (!topicName.trim()) { setError('Topic name is required'); return; }
    const lines = songsText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) { setError('Add at least one song'); return; }

    const songs = lines.map(line => {
      const [name, movie] = line.split('|').map(s => s.trim());
      return { name, movie: movie || '' };
    });

    setStep('previewing');
    setPreviews([]);

    for (let i = 0; i < songs.length; i++) {
      setLoadingIdx(i);
      try {
        const res = await fetch('/api/dev/preview-lyrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
          body: JSON.stringify({ song: songs[i].name, movie: songs[i].movie }),
        });
        const data = await res.json();
        setPreviews(prev => [...prev, {
          ...songs[i],
          found: data.found,
          tamilLyrics: data.tamilLyrics || '',
          englishLyrics: data.englishLyrics || '',
          tamilSource: data.tamilSource,
          englishSource: data.englishSource,
          editTab: 'english',
          editing: false,
          approved: data.found, // auto-approve found songs
        }]);
      } catch {
        setPreviews(prev => [...prev, { ...songs[i], found: false, tamilLyrics: '', englishLyrics: '', approved: false }]);
      }
    }
    setLoadingIdx(-1);
  };

  const updatePreview = (i, patch) => {
    setPreviews(prev => prev.map((p, idx) => idx === i ? { ...p, ...patch } : p));
  };

  // Step 2: save approved songs
  const handleSave = async () => {
    setStep('saving');
    setSaveResults([]);
    setError('');
    const toSave = previews.filter(p => p.approved);
    const results = [];

    for (const p of toSave) {
      try {
        const res = await fetch('/api/dev/add-topic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
          body: JSON.stringify({
            topicName,
            forceRescrape: true,
            song: {
              name: p.name,
              movie: p.movie,
              tamilLyrics: p.tamilLyrics,
              englishLyrics: p.englishLyrics,
            },
          }),
        });
        const data = await res.json();
        results.push({ name: p.name, ok: res.ok, result: data.result });
      } catch {
        results.push({ name: p.name, ok: false });
      }
      setSaveResults([...results]);
    }
    setStep('done');
  };

  const resetAll = () => {
    setStep('input'); setPreviews([]); setSaveResults([]);
    setSongsText(''); setTopicName(''); setError('');
  };

  return (
    <>
      <Head>
        <title>Developer Portal — Tamil Lyrics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>
      <style>{STYLES}</style>

      <header className="header">
        <span className="badge">Dev</span>
        <span style={{fontWeight:600,fontSize:'1rem'}}>Developer Portal</span>
        <span style={{fontSize:'0.78rem',color:'var(--muted)',marginLeft:'auto'}}>Tamil Lyrics Admin</span>
      </header>

      <main className="container">
        {!authed ? (
          <div className="auth-card">
            <div className="auth-icon">🔑</div>
            <h2 className="auth-title">Developer Access</h2>
            <p className="auth-sub">Enter your API key to manage lyrics content</p>
            <form onSubmit={handleAuth}>
              <input className="auth-input" type="password" placeholder="Enter API key..." value={apiKey} onChange={e => setApiKey(e.target.value)} autoFocus />
              {authError && <p className="auth-error">{authError}</p>}
              <button className="btn btn-primary" type="submit">Unlock →</button>
            </form>
          </div>
        ) : (
          <>
            <div style={{color:'var(--success)',fontSize:'0.82rem',margin:'0.5rem 0 1.5rem'}}>✓ Authenticated</div>

            {/* ── STEP 1: Input ── */}
            {step === 'input' && (
              <>
                <p className="section-title"><span className="step-label">1</span>Enter Songs</p>
                <div className="form-card">
                  <div className="form-group">
                    <label>Topic Name</label>
                    <input type="text" placeholder="e.g. Vidyasagar Classics, 90s Hits…" value={topicName} onChange={e => setTopicName(e.target.value)} />
                  </div>
                  <div className="form-group" style={{marginBottom:0}}>
                    <label>Songs <span>(one per line)</span></label>
                    <textarea rows={6} placeholder={"Roja Roja | Roja\nMalare Mounama | Karna\nTheradi Veedhiyil | Run\nAzhagooril Poothavale | Thirumalai"} value={songsText} onChange={e => setSongsText(e.target.value)} />
                    <p className="hint">Format: Song Name | Movie (movie optional). Songs will be searched automatically even if spelling differs.</p>
                  </div>
                </div>
                {error && <p className="form-error">⚠ {error}</p>}
                <button className="btn btn-primary" onClick={handlePreview}>
                  → Preview Lyrics Before Saving
                </button>
              </>
            )}

            {/* ── STEP 2: Preview & Edit ── */}
            {(step === 'previewing' || (step !== 'input' && step !== 'done' && previews.length > 0)) && step !== 'saving' && step !== 'done' && (
              <>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.5rem'}}>
                  <p className="section-title" style={{margin:0}}><span className="step-label">2</span>Review & Edit Lyrics</p>
                  <button className="btn btn-sm" style={{background:'var(--surface2)',color:'var(--muted)',border:'1px solid var(--border)'}} onClick={resetAll}>← Start Over</button>
                </div>
                <p style={{fontSize:'0.78rem',color:'var(--muted)',marginBottom:'1rem'}}>
                  Lyrics auto-fetched below. ✅ = found automatically. Click <strong style={{color:'var(--warn)'}}>Edit</strong> only if you spot errors — fix speaker labels, wrong characters, or spelling. Uncheck songs to skip saving them.
                </p>

                <div className="preview-list">
                  {previews.map((p, i) => (
                    <div key={i} className="preview-card" style={{borderColor: p.approved ? 'var(--success)' : p.found ? 'var(--border)' : 'var(--error)'}}>
                      <div className="preview-header">
                        <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
                          <input type="checkbox" checked={!!p.approved} onChange={e => updatePreview(i, {approved: e.target.checked})}
                            style={{width:16,height:16,cursor:'pointer',accentColor:'var(--success)'}} />
                          <div>
                            <div className="preview-name">{p.name}</div>
                            {p.movie && <div style={{fontSize:'0.72rem',color:'var(--muted)'}}>🎬 {p.movie}</div>}
                          </div>
                        </div>
                        <div style={{display:'flex',gap:'0.4rem',alignItems:'center'}}>
                          {p.found
                            ? <span className="preview-status status-found">✓ Found</span>
                            : <span className="preview-status status-notfound">✗ Not found</span>}
                          <button className="btn btn-sm btn-warn" onClick={() => updatePreview(i, {editing: !p.editing})}>
                            {p.editing ? 'Preview' : '✏ Edit'}
                          </button>
                        </div>
                      </div>

                      <div className="preview-body">
                      {!p.found && !p.editing && (
                          <p style={{fontSize:'0.78rem',color:'var(--error)',marginBottom:'0.5rem'}}>
                            ⚠ Could not find lyrics automatically. Click Edit to paste manually, or uncheck to skip.
                          </p>
                        )}

                        <div className="preview-tabs">
                          <button className={`preview-tab ${p.editTab==='english'?'active':''}`} onClick={() => updatePreview(i,{editTab:'english'})}>English</button>
                          <button className={`preview-tab ${p.editTab==='tamil'?'active':''}`} onClick={() => updatePreview(i,{editTab:'tamil'})}>தமிழ்</button>
                        </div>

                        {p.editing ? (
                          <>
                            {p.editTab === 'english' && (
                              <>
                                <div className="label-tip">
                                  Add speaker labels for colour coding: <code>Male : lyrics here</code> · <code>Female : lyrics here</code> · <code>Chorus : lyrics here</code>
                                </div>
                                <textarea className="lyrics-edit" value={p.englishLyrics}
                                  onChange={e => updatePreview(i,{englishLyrics:e.target.value})}
                                  placeholder={"Male : First line\nSecond line\n\nFemale : Her line\n\nChorus : Together"} />
                              </>
                            )}
                            {p.editTab === 'tamil' && (
                              <>
                                <div className="label-tip">
                                  Tamil labels: <code>ஆண் : வரிகள்</code> · <code>பெண் : வரிகள்</code> · <code>இருவரும் : வரிகள்</code>
                                </div>
                                <textarea className="lyrics-edit" value={p.tamilLyrics}
                                  onChange={e => updatePreview(i,{tamilLyrics:e.target.value})}
                                  placeholder={"ஆண் : முதல் வரி\nரண்டாம் வரி\n\nபெண் : அவள் வரி"} />
                              </>
                            )}
                            <div className="preview-actions">
                              <button className="btn btn-sm btn-success" onClick={() => updatePreview(i,{editing:false,approved:true})}>✓ Done editing</button>
                            </div>
                          </>
                        ) : (
                          <div className="lyrics-preview">
                            {(p.editTab==='english' ? p.englishLyrics : p.tamilLyrics) || '(empty)'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator for remaining songs */}
                  {loadingIdx >= 0 && loadingIdx < 999 && previews.length < songsText.split('\n').filter(Boolean).length && (
                    <div style={{color:'var(--muted)',fontSize:'0.82rem',padding:'0.75rem',display:'flex',alignItems:'center',gap:'0.5rem'}}>
                      <div className="spinner" style={{borderTopColor:'var(--accent)'}}></div>
                      Fetching lyrics…
                    </div>
                  )}
                </div>

                {loadingIdx === -1 && previews.length > 0 && (
                  <div style={{marginTop:'1.5rem',display:'flex',gap:'0.75rem',flexWrap:'wrap',alignItems:'center'}}>
                    <button className="btn btn-primary" style={{width:'auto'}}
                      onClick={handleSave}
                      disabled={!previews.some(p => p.approved)}>
                      → Save {previews.filter(p=>p.approved).length} Approved Song{previews.filter(p=>p.approved).length!==1?'s':''}
                    </button>
                    <span style={{fontSize:'0.78rem',color:'var(--muted)'}}>
                      Topic: <strong style={{color:'var(--text)'}}>{topicName}</strong>
                    </span>
                  </div>
                )}
              </>
            )}

            {/* ── STEP 3: Saving ── */}
            {step === 'saving' && (
              <div style={{color:'var(--muted)',fontSize:'0.88rem',display:'flex',alignItems:'center',gap:'0.75rem',padding:'2rem 0'}}>
                <div className="spinner" style={{borderTopColor:'var(--accent)'}}></div>
                Saving songs to topic "{topicName}"…
              </div>
            )}

            {/* ── STEP 4: Done ── */}
            {step === 'done' && (
              <>
                <div className="result-card">
                  <p className="result-title">✓ Topic "{topicName}" saved</p>
                  {saveResults.map((r, i) => (
                    <div className="result-item" key={i}>
                      <span>{r.name}</span>
                      <div style={{display:'flex',gap:'0.3rem'}}>
                        {r.ok
                          ? <>
                              <span className={`rbadge ${r.result?.tamilFound?'rbadge-ok':'rbadge-no'}`}>{r.result?.tamilFound?'Tamil ✓':'Tamil ✗'}</span>
                              <span className={`rbadge ${r.result?.englishFound?'rbadge-ok':'rbadge-no'}`}>{r.result?.englishFound?'EN ✓':'EN ✗'}</span>
                            </>
                          : <span className="rbadge rbadge-no">Failed</span>
                        }
                      </div>
                    </div>
                  ))}
                  <div style={{display:'flex',gap:'0.75rem',marginTop:'1rem',flexWrap:'wrap'}}>
                    <a href="/" target="_blank" style={{color:'var(--accent)',fontSize:'0.8rem',textDecoration:'none'}}>View site →</a>
                    <button className="btn btn-sm" style={{background:'var(--surface2)',color:'var(--muted)',border:'1px solid var(--border)'}} onClick={resetAll}>Add more songs</button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
