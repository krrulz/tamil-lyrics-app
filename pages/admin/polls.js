// pages/admin/polls.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAdminAuth } from '../../lib/useAdmin.js';

export default function AdminPolls() {
  const { auth, loading, apiFetch } = useAdminAuth();
  const router = useRouter();
  const [polls, setPolls] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ playlistId: '', title: '', description: '' });
  const [actionId, setActionId] = useState(null);
  const [toast, setToast] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => { if (!loading && !auth) router.replace('/admin/login'); }, [auth, loading]);

  const load = async () => {
    if (!auth) return;
    const [pRes, plRes] = await Promise.all([apiFetch('/api/polls'), apiFetch('/api/admin/playlists')]);
    const [pData, plData] = await Promise.all([pRes.json(), plRes.json()]);
    setPolls(pData.polls || []);
    setPlaylists(plData.playlists || []);
    setFetching(false);
  };

  useEffect(() => { load(); }, [auth]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const createPoll = async (e) => {
    e.preventDefault();
    if (!form.playlistId) return showToast('Select a playlist');
    setCreating(true);
    const res = await apiFetch('/api/polls', { method: 'POST', body: JSON.stringify(form) });
    const data = await res.json();
    if (res.ok) { showToast('✓ Poll created!'); setShowCreate(false); setForm({ playlistId: '', title: '', description: '' }); load(); }
    else showToast('⚠ ' + data.error);
    setCreating(false);
  };

  const closePoll = async (pollId) => {
    if (!confirm('Close this poll? Vote counts will be pushed to the playlist.')) return;
    setActionId(pollId);
    const res = await apiFetch(`/api/polls/${pollId}`, { method: 'PATCH', body: JSON.stringify({ action: 'close' }) });
    if (res.ok) { showToast('✓ Poll closed and playlist updated'); load(); }
    else showToast('⚠ Failed');
    setActionId(null);
  };

  const copyLink = (pollId) => {
    const url = `${window.location.origin}/vote/${pollId}`;
    navigator.clipboard.writeText(url);
    setCopied(pollId);
    setTimeout(() => setCopied(''), 2000);
  };

  if (loading || !auth) return null;

  return (
    <>
      <Head><title>Polls — Admin</title></Head>
      <style>{`
        body { background: var(--admin-bg); }
        .wrap { max-width: 900px; margin: 0 auto; padding: 2rem; }
        .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .topbar h1 { color: var(--admin-text); font-size: 1.3rem; font-weight: 600; }
        .back { color: var(--admin-muted); text-decoration: none; font-size: 0.85rem; }
        .create-btn { padding: 0.5rem 1rem; background: var(--admin-accent); color: #fff; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
        .create-form { background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
        .create-form h2 { color: var(--admin-text); font-size: 1rem; font-weight: 600; margin-bottom: 1rem; }
        label { display: block; font-size: 0.75rem; color: var(--admin-muted); margin-bottom: 0.3rem; text-transform: uppercase; letter-spacing: 0.05em; }
        input, select, textarea { width: 100%; padding: 0.6rem 0.8rem; background: rgba(255,255,255,0.05); border: 1px solid var(--admin-border); border-radius: 6px; color: var(--admin-text); font-size: 0.88rem; outline: none; margin-bottom: 0.9rem; }
        input:focus, select:focus { border-color: var(--admin-accent); }
        .form-row { display: flex; gap: 8px; }
        .form-row .create-btn { flex-shrink: 0; }
        .cancel-btn { padding: 0.5rem 1rem; background: none; border: 1px solid var(--admin-border); color: var(--admin-muted); border-radius: 8px; font-size: 0.85rem; cursor: pointer; }
        .poll-card { background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 10px; padding: 1.25rem; margin-bottom: 12px; }
        .poll-title { font-size: 1rem; font-weight: 600; color: var(--admin-text); margin-bottom: 4px; }
        .poll-meta { font-size: 0.78rem; color: var(--admin-muted); margin-bottom: 10px; }
        .status-badge { display: inline-block; font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 10px; font-weight: 600; margin-left: 8px; }
        .status-active { background: rgba(52,211,153,0.15); color: var(--success); }
        .status-closed { background: rgba(100,116,139,0.2); color: var(--admin-muted); }
        .vote-bar { height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; margin-bottom: 8px; }
        .vote-fill { height: 4px; background: var(--admin-accent); border-radius: 2px; }
        .top-songs { margin-bottom: 10px; }
        .top-song { font-size: 0.78rem; color: var(--admin-muted); display: flex; justify-content: space-between; padding: 2px 0; }
        .top-song-name { color: var(--admin-text); }
        .actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .btn { padding: 0.35rem 0.85rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: 1px solid; display: flex; align-items: center; gap: 5px; }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-copy { background: transparent; color: var(--admin-accent); border-color: var(--admin-accent); }
        .btn-view { background: transparent; color: var(--admin-muted); border-color: var(--admin-border); text-decoration: none; }
        .btn-close { background: rgba(251,191,36,0.1); color: var(--warn); border-color: var(--warn); }
        .empty { color: var(--admin-muted); text-align: center; padding: 3rem; }
        .toast { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); background: var(--admin-surface); color: var(--admin-text); border: 1px solid var(--admin-border); padding: 0.65rem 1.25rem; border-radius: 8px; font-size: 0.88rem; }
      `}</style>
      <div className="wrap">
        {toast && <div className="toast">{toast}</div>}
        <div className="topbar">
          <h1>🗳️ Polls</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/admin" className="back">← Dashboard</Link>
            <button className="create-btn" onClick={() => setShowCreate(v => !v)}>+ New poll</button>
          </div>
        </div>

        {showCreate && (
          <form className="create-form" onSubmit={createPoll}>
            <h2>Create poll from playlist</h2>
            <label>Playlist</label>
            <select value={form.playlistId} onChange={e => setForm(p => ({ ...p, playlistId: e.target.value }))} required>
              <option value="">— Select playlist —</option>
              {playlists.map(p => <option key={p.id} value={p.id}>{p.name} ({(p.songs || []).length} songs)</option>)}
            </select>
            <label>Poll title (optional)</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Vote for your favourite songs!" />
            <label>Description (optional)</label>
            <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description shown to voters" />
            <div className="form-row">
              <button type="button" className="cancel-btn" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="create-btn" disabled={creating}>
                {creating ? <><span className="spinner" /> Creating…</> : 'Create poll'}
              </button>
            </div>
          </form>
        )}

        {fetching && <div className="empty">Loading…</div>}
        {!fetching && polls.length === 0 && <div className="empty">No polls yet. Create one from a playlist.</div>}
        {polls.map(poll => {
          const topSongs = (poll.songs || []).sort((a, b) => (b.votes || 0) - (a.votes || 0)).slice(0, 3);
          const maxVotes = Math.max(...(poll.songs || []).map(s => s.votes || 0), 1);
          return (
            <div key={poll.id} className="poll-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className="poll-title">{poll.title}</span>
                  <span className={`status-badge ${poll.status === 'active' ? 'status-active' : 'status-closed'}`}>{poll.status}</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--admin-muted)', textAlign: 'right' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--admin-text)' }}>{poll.totalVotes || 0}</div>
                  votes
                </div>
              </div>
              <div className="poll-meta">{poll.createdAt?.slice(0, 10)} · {(poll.songs || []).length} songs</div>

              {topSongs.length > 0 && (
                <div className="top-songs">
                  {topSongs.map(s => (
                    <div key={s.songId}>
                      <div className="top-song">
                        <span className="top-song-name">{s.name || s.songId}</span>
                        <span>{s.votes || 0} votes</span>
                      </div>
                      <div className="vote-bar"><div className="vote-fill" style={{ width: `${Math.round((s.votes || 0) / maxVotes * 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}

              <div className="actions">
                <button className="btn btn-copy" onClick={() => copyLink(poll.id)}>
                  {copied === poll.id ? '✓ Copied!' : '🔗 Copy vote link'}
                </button>
                <Link href={`/vote/${poll.id}`} target="_blank" className="btn btn-view">Preview →</Link>
                {poll.status === 'active' && (
                  <button className="btn btn-close" disabled={actionId === poll.id} onClick={() => closePoll(poll.id)}>
                    {actionId === poll.id ? <><span className="spinner" /> Closing…</> : 'Close & tally'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
