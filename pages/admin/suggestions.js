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
  const [actionId, setActionId] = useState(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState({});
  const [filter, setFilter] = useState('pending');
  const [toast, setToast] = useState('');

  useEffect(() => { if (!loading && !auth) router.replace('/admin/login'); }, [auth, loading]);

  const load = async () => {
    if (!auth) return;
    setFetching(true);
    try {
      const [sugRes, plRes] = await Promise.all([
        apiFetch(`/api/suggestions?status=${filter}`),
        apiFetch('/api/admin/playlists'),
      ]);
      const [sugData, plData] = await Promise.all([
        sugRes.ok ? sugRes.json() : Promise.resolve({ suggestions: [] }),
        plRes.ok  ? plRes.json()  : Promise.resolve({ playlists: [] }),
      ]);
      if (!sugRes.ok) showToast(`⚠ API error ${sugRes.status} — check Vercel env vars`);
      setSuggestions(sugData.suggestions || []);
      setPlaylists(plData.playlists || []);
    } catch (err) {
      showToast('⚠ Failed to load: ' + err.message);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { load(); }, [auth, filter]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const doAction = async (id, action, extra = {}) => {
    setActionId(id);
    try {
      const res = await apiFetch(`/api/suggestions/${id}`, { method: 'PATCH', body: JSON.stringify({ action, ...extra }) });
      const text = await res.text();
      const data = (() => { try { return JSON.parse(text); } catch { return {}; } })();
      if (res.ok) { showToast(action === 'approve' ? `✓ Approved! Tamil: ${data.tamilFound ? '✓' : '✗'} EN: ${data.englishFound ? '✓' : '✗'}` : `✓ Done`); load(); }
      else showToast('⚠ ' + (data.error || `Error ${res.status}`));
    } catch (err) {
      showToast('⚠ ' + err.message);
    } finally {
      setActionId(null);
    }
  };

  const statusColors = { pending: '#FBBF24', approved: '#34D399', rejected: '#FC8181' };

  if (loading || !auth) return null;

  return (
    <>
      <Head><title>Suggestions — Admin</title></Head>
      <style>{`
        body { background: var(--admin-bg); }
        .wrap { max-width: 900px; margin: 0 auto; padding: 2rem; }
        .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .topbar h1 { color: var(--admin-text); font-size: 1.3rem; font-weight: 600; }
        .back { color: var(--admin-muted); text-decoration: none; font-size: 0.85rem; }
        .filters { display: flex; gap: 8px; margin-bottom: 1.5rem; }
        .ftab { padding: 0.4rem 1rem; border-radius: 20px; font-size: 0.82rem; border: 1px solid; cursor: pointer; font-weight: 500; }
        .ftab-active { background: var(--admin-accent); color: #fff; border-color: var(--admin-accent); }
        .ftab-inactive { background: var(--admin-surface); color: var(--admin-muted); border-color: var(--admin-border); }
        .card { background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 10px; padding: 1.25rem; margin-bottom: 12px; }
        .song-name { font-size: 1rem; font-weight: 600; color: var(--admin-text); margin-bottom: 2px; }
        .meta { font-size: 0.78rem; color: var(--admin-muted); margin-bottom: 8px; }
        .badge { display: inline-block; font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 10px; font-weight: 600; }
        .lyrics-status { font-size: 0.78rem; margin-bottom: 10px; }
        .lbl-ok { color: var(--success); } .lbl-no { color: var(--admin-muted); }
        .actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        select { padding: 0.4rem 0.6rem; background: rgba(255,255,255,0.05); border: 1px solid var(--admin-border); border-radius: 6px; color: var(--admin-text); font-size: 0.82rem; outline: none; }
        .btn { padding: 0.4rem 0.9rem; border-radius: 6px; font-size: 0.82rem; font-weight: 600; cursor: pointer; border: none; display: flex; align-items: center; gap: 5px; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-scrape { background: rgba(108,142,255,0.15); color: var(--admin-accent); border: 1px solid var(--admin-accent); }
        .btn-approve { background: rgba(52,211,153,0.15); color: var(--success); border: 1px solid var(--success); }
        .btn-reject { background: rgba(252,129,129,0.1); color: var(--error); border: 1px solid var(--error); }
        .empty { color: var(--admin-muted); text-align: center; padding: 3rem; }
        .toast { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); background: var(--admin-surface); color: var(--admin-text); border: 1px solid var(--admin-border); padding: 0.65rem 1.25rem; border-radius: 8px; font-size: 0.88rem; white-space: nowrap; }
      `}</style>
      <div className="wrap">
        {toast && <div className="toast">{toast}</div>}
        <div className="topbar">
          <h1>💡 Song Suggestions</h1>
          <Link href="/admin" className="back">← Dashboard</Link>
        </div>
        <div className="filters">
          {['pending', 'approved', 'rejected'].map(f => (
            <button key={f} className={`ftab ${filter === f ? 'ftab-active' : 'ftab-inactive'}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        {fetching && <div className="empty">Loading…</div>}
        {!fetching && suggestions.length === 0 && <div className="empty">No {filter} suggestions.</div>}
        {suggestions.map(s => (
          <div key={s.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="song-name">{s.songName}</div>
              <span className="badge" style={{ background: `${statusColors[s.status]}22`, color: statusColors[s.status] }}>{s.status}</span>
            </div>
            <div className="meta">
              {s.movie && <span>🎬 {s.movie} · </span>}
              By {s.submittedBy} · {s.createdAt?.slice(0, 10)}
              {s.reason && <span> · "{s.reason}"</span>}
            </div>
            <div className="lyrics-status">
              <span className={s.tamilLyrics ? 'lbl-ok' : 'lbl-no'}>Tamil: {s.tamilLyrics ? '✓' : '—'}</span>
              {' · '}
              <span className={s.englishLyrics ? 'lbl-ok' : 'lbl-no'}>English: {s.englishLyrics ? '✓' : '—'}</span>
              {s.lyricsStatus && s.lyricsStatus !== 'not_fetched' && <span style={{ color: 'var(--admin-muted)', marginLeft: 6 }}>({s.lyricsStatus})</span>}
            </div>
            {filter === 'pending' && (
              <div className="actions">
                <button className="btn btn-scrape" disabled={actionId === s.id} onClick={() => doAction(s.id, 'fetch-lyrics')}>
                  {actionId === s.id ? <><span className="spinner" /> Fetching…</> : '⬇ Fetch lyrics'}
                </button>
                <select value={selectedPlaylist[s.id] || ''} onChange={e => setSelectedPlaylist(p => ({ ...p, [s.id]: e.target.value }))}>
                  <option value="">— Choose playlist —</option>
                  {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button className="btn btn-approve" disabled={actionId === s.id || !selectedPlaylist[s.id]} onClick={() => doAction(s.id, 'approve', { playlistId: selectedPlaylist[s.id] })}>
                  ✓ Approve
                </button>
                <button className="btn btn-reject" disabled={actionId === s.id} onClick={() => doAction(s.id, 'reject')}>✕ Reject</button>
              </div>
            )}
            {s.status === 'approved' && <div style={{ fontSize: '0.78rem', color: 'var(--admin-muted)' }}>Added to playlist · Song ID: {s.songId}</div>}
          </div>
        ))}
      </div>
    </>
  );
}
