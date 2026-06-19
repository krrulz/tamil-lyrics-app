// pages/admin/suggestions.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAdminAuth } from '../../lib/useAdmin.js';

export default function AdminSuggestions() {
  const { auth, loading, apiFetch } = useAdminAuth();
  const router = useRouter();
  const [suggestions, setSuggestions] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [toast, setToast] = useState('');
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualForm, setManualForm] = useState({ name: '', movie: '', tamil: '', english: '', playlistId: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!loading && !auth) router.replace('/admin/login'); }, [auth, loading]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    if (!auth) return;
    setFetching(true);
    try {
      const [sugRes, plRes] = await Promise.all([
        apiFetch('/api/suggestions'),
        apiFetch('/api/admin/playlists'),
      ]);
      const [sugData, plData] = await Promise.all([
        sugRes.ok ? sugRes.json() : Promise.resolve({ suggestions: [] }),
        plRes.ok  ? plRes.json()  : Promise.resolve({ playlists: [] }),
      ]);
      setSuggestions(sugData.suggestions || []);
      setPlaylists(plData.playlists || []);
    } catch (err) {
      showToast('⚠ Failed to load: ' + err.message);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { load(); }, [auth]);

  const saveManualSong = async () => {
    if (!manualForm.name.trim()) { showToast('⚠ Song name is required'); return; }
    if (!manualForm.playlistId) { showToast('⚠ Please select a playlist'); return; }
    setSaving(true);
    try {
      const res = await apiFetch('/api/admin/add-song', {
        method: 'POST',
        body: JSON.stringify({
          name: manualForm.name,
          movie: manualForm.movie,
          tamilLyrics: manualForm.tamil,
          englishLyrics: manualForm.english,
          playlistId: manualForm.playlistId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('✓ Song added to playlist');
        setShowManualAdd(false);
        setManualForm({ name: '', movie: '', tamil: '', english: '', playlistId: '' });
        load();
      } else {
        showToast('⚠ ' + (data.error || `Error ${res.status}`));
      }
    } catch (err) {
      showToast('⚠ ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !auth) return null;

  const inboxPlaylist = playlists.find(p => p.id === 'suggestions-inbox');

  return (
    <>
      <Head><title>Suggestions — Admin</title></Head>
      <style>{`
        body { background: var(--admin-bg); }
        .wrap { max-width: 900px; margin: 0 auto; padding: 2rem; }
        .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 10px; }
        .topbar h1 { color: var(--admin-text); font-size: 1.3rem; font-weight: 600; }
        .back { color: var(--admin-muted); text-decoration: none; font-size: 0.85rem; }
        .info-banner { background: rgba(108,142,255,0.08); border: 1px solid rgba(108,142,255,0.25); border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
        .info-text { font-size: 0.85rem; color: var(--admin-muted); }
        .info-text strong { color: var(--admin-text); }
        .btn-inbox { background: var(--admin-accent); color: #fff; border: none; border-radius: 6px; padding: 0.45rem 1rem; font-size: 0.82rem; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 5px; }
        .card { background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 10px; padding: 1.1rem 1.25rem; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap; }
        .song-name { font-size: 0.97rem; font-weight: 600; color: var(--admin-text); margin-bottom: 2px; }
        .meta { font-size: 0.75rem; color: var(--admin-muted); }
        .lyrics-pills { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
        .pill { font-size: 0.68rem; padding: 0.15rem 0.55rem; border-radius: 20px; font-weight: 600; }
        .pill-ok { background: rgba(52,211,153,0.12); color: var(--success); border: 1px solid var(--success); }
        .pill-no { background: rgba(100,116,139,0.12); color: var(--admin-muted); border: 1px solid var(--admin-border); }
        .submitter { font-size: 0.78rem; color: var(--admin-muted); text-align: right; white-space: nowrap; }
        .empty { color: var(--admin-muted); text-align: center; padding: 3rem; }
        .toast { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); background: var(--admin-surface); color: var(--admin-text); border: 1px solid var(--admin-border); padding: 0.65rem 1.25rem; border-radius: 8px; font-size: 0.88rem; white-space: nowrap; z-index: 999; }
        .btn { padding: 0.4rem 0.9rem; border-radius: 6px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: none; display: flex; align-items: center; gap: 5px; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-add-song { background: rgba(52,211,153,0.12); color: #34D399; border: 1px solid #34D399; }
        .btn-approve { background: rgba(52,211,153,0.15); color: var(--success); border: 1px solid var(--success); }
        .btn-reject { background: rgba(252,129,129,0.1); color: var(--error); border: 1px solid var(--error); }
        .manual-panel { background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem; }
        .manual-panel h2 { font-size: 1rem; font-weight: 600; color: var(--admin-text); margin-bottom: 1rem; }
        .manual-row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 0.9rem; }
        .manual-label { font-size: 0.78rem; color: var(--admin-muted); font-weight: 500; }
        .manual-input { padding: 0.5rem 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid var(--admin-border); border-radius: 6px; color: var(--admin-text); font-size: 0.88rem; outline: none; width: 100%; font-family: inherit; }
        .manual-input:focus { border-color: var(--admin-accent); }
        .manual-textarea { min-height: 80px; resize: vertical; }
        .manual-actions { display: flex; gap: 8px; margin-top: 0.5rem; }
        .section-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--admin-muted); margin-bottom: 0.75rem; }
        @media (max-width: 768px) {
          .wrap { padding: 1.25rem; }
          .topbar { flex-wrap: wrap; gap: 8px; margin-bottom: 1rem; }
          .topbar h1 { font-size: 1.1rem; }
          .info-banner { flex-direction: column; align-items: flex-start; gap: 8px; }
          .manual-panel { padding: 1.1rem; }
          .card { flex-direction: column; gap: 0.5rem; }
          .submitter { text-align: left; }
        }
        @media (max-width: 480px) {
          .wrap { padding: 0.9rem; }
          .manual-actions { flex-wrap: wrap; }
          .manual-actions .btn { flex: 1; justify-content: center; }
        }
      `}</style>

      <div className="wrap" suppressHydrationWarning>
        {toast && <div className="toast">{toast}</div>}

        <div className="topbar">
          <h1>💡 Song Suggestions</h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn btn-add-song" onClick={() => setShowManualAdd(v => !v)}>➕ Add Song Manually</button>
            <Link href="/admin" className="back">← Dashboard</Link>
          </div>
        </div>

        <div className="info-banner">
          <span className="info-text">
            Songs submitted by users are <strong>automatically fetched and added</strong> to the <strong>Suggestions Inbox</strong> playlist.
            Review and delete songs there as needed.
          </span>
          {inboxPlaylist
            ? <Link href="/admin/playlists" className="btn-inbox">Open Suggestions Inbox ({inboxPlaylist.songs?.length || 0} songs) →</Link>
            : <Link href="/admin/playlists" className="btn-inbox">Go to Playlists →</Link>
          }
        </div>

        {showManualAdd && (
          <div className="manual-panel">
            <h2>Add Song Manually</h2>
            <div className="manual-row">
              <label className="manual-label">Song Name *</label>
              <input className="manual-input" value={manualForm.name} onChange={e => setManualForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter song name" />
            </div>
            <div className="manual-row">
              <label className="manual-label">Movie / Album</label>
              <input className="manual-input" value={manualForm.movie} onChange={e => setManualForm(f => ({ ...f, movie: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="manual-row">
              <label className="manual-label">Tamil Lyrics</label>
              <textarea className="manual-input manual-textarea" value={manualForm.tamil} onChange={e => setManualForm(f => ({ ...f, tamil: e.target.value }))} placeholder="Paste Tamil lyrics (optional)" />
            </div>
            <div className="manual-row">
              <label className="manual-label">English Lyrics</label>
              <textarea className="manual-input manual-textarea" value={manualForm.english} onChange={e => setManualForm(f => ({ ...f, english: e.target.value }))} placeholder="Paste English lyrics (optional)" />
            </div>
            <div className="manual-row">
              <label className="manual-label">Playlist *</label>
              <select className="manual-input" value={manualForm.playlistId} onChange={e => setManualForm(f => ({ ...f, playlistId: e.target.value }))}>
                <option value="">— Select playlist —</option>
                {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="manual-actions">
              <button className="btn btn-approve" disabled={saving} onClick={saveManualSong}>{saving ? 'Saving…' : '✓ Save Song'}</button>
              <button className="btn btn-reject" onClick={() => { setShowManualAdd(false); setManualForm({ name: '', movie: '', tamil: '', english: '', playlistId: '' }); }}>Cancel</button>
            </div>
          </div>
        )}

        <div className="section-title">Submission log ({suggestions.length})</div>

        {fetching && <div className="empty">Loading…</div>}
        {!fetching && suggestions.length === 0 && <div className="empty">No suggestions yet.</div>}

        {suggestions.map(s => (
          <div key={s.id} className="card">
            <div style={{ flex: 1 }}>
              <div className="song-name">{s.songName}</div>
              <div className="meta">
                {s.movie && <span>🎬 {s.movie} · </span>}
                {s.createdAt?.slice(0, 10)}
                {s.reason && <span> · "{s.reason}"</span>}
              </div>
              <div className="lyrics-pills">
                <span className={`pill ${s.tamilLyrics ? 'pill-ok' : 'pill-no'}`}>Tamil {s.tamilLyrics ? '✓' : '—'}</span>
                <span className={`pill ${s.englishLyrics ? 'pill-ok' : 'pill-no'}`}>English {s.englishLyrics ? '✓' : '—'}</span>
              </div>
            </div>
            <div className="submitter">by {s.submittedBy || 'Anonymous'}</div>
          </div>
        ))}
      </div>
    </>
  );
}
