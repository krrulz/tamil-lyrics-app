// pages/admin/topics.js
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAdminAuth } from '../../lib/useAdmin.js';

export default function AdminTopics() {
  const { auth, loading, apiFetch } = useAdminAuth();
  const router = useRouter();
  const [topics, setTopics] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', playlistId: '', limit: 25 });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null); // { id, songs: [{songId, name, movie, order}] }
  const [dragIdx, setDragIdx] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => { if (!loading && !auth) router.replace('/admin/login'); }, [auth, loading]);

  const load = async () => {
    if (!auth) return;
    const [tRes, pRes] = await Promise.all([apiFetch('/api/admin/topics'), apiFetch('/api/admin/playlists')]);
    const [tData, pData] = await Promise.all([tRes.json(), pRes.json()]);
    setTopics(tData.topics || []);
    setPlaylists(pData.playlists || []);
    setFetching(false);
  };

  useEffect(() => { load(); }, [auth]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const createTopic = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return showToast('Name required');
    setCreating(true);
    const res = await apiFetch('/api/admin/topics', { method: 'POST', body: JSON.stringify(form) });
    const data = await res.json();
    if (res.ok) { showToast(`✓ Topic created with ${data.songCount} songs`); setShowCreate(false); setForm({ name: '', playlistId: '', limit: 25 }); load(); }
    else showToast('⚠ ' + data.error);
    setCreating(false);
  };

  const openEdit = async (topicId) => {
    const res = await apiFetch(`/api/admin/topics/${topicId}`);
    const data = await res.json();
    setEditing({ id: topicId, name: data.name, songs: data.songs || [] });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setActionId(editing.id);
    const res = await apiFetch(`/api/admin/topics/${editing.id}`, { method: 'PATCH', body: JSON.stringify({ songs: editing.songs.map(s => s.songId) }) });
    if (res.ok) { showToast('✓ Topic saved'); setEditing(null); load(); }
    else showToast('⚠ Save failed');
    setActionId(null);
  };

  const deleteTopic = async (id) => {
    if (!confirm('Delete this topic?')) return;
    setActionId(id);
    await apiFetch(`/api/admin/topics/${id}`, { method: 'DELETE' });
    showToast('✓ Deleted');
    load();
    setActionId(null);
  };

  const removeSong = (songId) => {
    setEditing(prev => ({ ...prev, songs: prev.songs.filter(s => s.songId !== songId).map((s, i) => ({ ...s, order: i })) }));
  };

  // Drag-to-reorder
  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setEditing(prev => {
      const songs = [...prev.songs];
      const [moved] = songs.splice(dragIdx, 1);
      songs.splice(idx, 0, moved);
      setDragIdx(idx);
      return { ...prev, songs: songs.map((s, i) => ({ ...s, order: i })) };
    });
  };
  const handleDragEnd = () => setDragIdx(null);

  if (loading || !auth) return null;

  return (
    <>
      <Head><title>Topics — Admin</title></Head>
      <style>{`
        body { background: var(--admin-bg); }
        .wrap { max-width: 900px; margin: 0 auto; padding: 2rem; }
        .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .topbar h1 { color: var(--admin-text); font-size: 1.3rem; font-weight: 600; }
        .back { color: var(--admin-muted); text-decoration: none; font-size: 0.85rem; }
        .create-btn { padding: 0.5rem 1rem; background: var(--admin-accent); color: #fff; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
        .form-panel { background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
        .form-panel h2 { color: var(--admin-text); font-size: 1rem; font-weight: 600; margin-bottom: 1rem; }
        label { display: block; font-size: 0.75rem; color: var(--admin-muted); margin-bottom: 0.3rem; text-transform: uppercase; letter-spacing: 0.05em; }
        input, select { width: 100%; padding: 0.6rem 0.8rem; background: rgba(255,255,255,0.05); border: 1px solid var(--admin-border); border-radius: 6px; color: var(--admin-text); font-size: 0.88rem; outline: none; margin-bottom: 0.9rem; }
        input:focus, select:focus { border-color: var(--admin-accent); }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .btn-row { display: flex; gap: 8px; margin-top: 0.5rem; }
        .cancel-btn { padding: 0.5rem 1rem; background: none; border: 1px solid var(--admin-border); color: var(--admin-muted); border-radius: 8px; font-size: 0.85rem; cursor: pointer; }
        .topic-card { background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 10px; padding: 1.25rem; margin-bottom: 12px; }
        .topic-name { font-size: 1rem; font-weight: 600; color: var(--admin-text); margin-bottom: 4px; }
        .topic-meta { font-size: 0.78rem; color: var(--admin-muted); margin-bottom: 10px; }
        .topic-actions { display: flex; gap: 8px; }
        .btn-sm { padding: 0.35rem 0.75rem; border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer; border: 1px solid; }
        .btn-edit { background: transparent; color: var(--admin-accent); border-color: var(--admin-accent); }
        .btn-delete { background: transparent; color: var(--error); border-color: var(--error); }
        .btn-pub { background: transparent; color: var(--admin-muted); border-color: var(--admin-border); text-decoration: none; }
        /* Editor */
        .editor { background: rgba(0,0,0,0.3); border: 1px solid var(--admin-accent); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; }
        .editor h2 { color: var(--admin-text); font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; }
        .editor-hint { font-size: 0.78rem; color: var(--admin-muted); margin-bottom: 1rem; }
        .song-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; background: rgba(255,255,255,0.04); border: 1px solid var(--admin-border); border-radius: 6px; margin-bottom: 6px; cursor: grab; user-select: none; }
        .song-item.dragging { opacity: 0.4; }
        .song-item:active { cursor: grabbing; }
        .drag-handle { color: var(--admin-muted); font-size: 0.9rem; flex-shrink: 0; }
        .song-num { font-size: 0.72rem; color: var(--admin-muted); width: 22px; flex-shrink: 0; text-align: right; }
        .song-info { flex: 1; min-width: 0; }
        .song-name-ed { font-size: 0.88rem; color: var(--admin-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .song-movie-ed { font-size: 0.72rem; color: var(--admin-muted); }
        .remove-btn { background: none; border: none; color: var(--error); font-size: 1rem; cursor: pointer; flex-shrink: 0; line-height: 1; padding: 0; }
        .save-row { display: flex; gap: 8px; margin-top: 1rem; }
        .save-btn { padding: 0.55rem 1.25rem; background: var(--admin-accent); color: #fff; border: none; border-radius: 8px; font-size: 0.88rem; font-weight: 600; cursor: pointer; }
        .close-btn { padding: 0.55rem 1rem; background: none; border: 1px solid var(--admin-border); color: var(--admin-muted); border-radius: 8px; font-size: 0.88rem; cursor: pointer; }
        .empty { color: var(--admin-muted); text-align: center; padding: 3rem; }
        .toast { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); background: var(--admin-surface); color: var(--admin-text); border: 1px solid var(--admin-border); padding: 0.65rem 1.25rem; border-radius: 8px; font-size: 0.88rem; }
      `}</style>
      <div className="wrap">
        {toast && <div className="toast">{toast}</div>}
        <div className="topbar">
          <h1>📚 Topics</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/admin" className="back">← Dashboard</Link>
            <button className="create-btn" onClick={() => setShowCreate(v => !v)}>+ New topic</button>
          </div>
        </div>

        {showCreate && (
          <form className="form-panel" onSubmit={createTopic}>
            <h2>Create topic from playlist</h2>
            <label>Topic name</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. AR Rahman Classics" required />
            <div className="form-row">
              <div>
                <label>Source playlist (optional)</label>
                <select value={form.playlistId} onChange={e => setForm(p => ({ ...p, playlistId: e.target.value }))}>
                  <option value="">— Manual (empty topic) —</option>
                  {playlists.map(p => <option key={p.id} value={p.id}>{p.name} ({(p.songs || []).length} songs)</option>)}
                </select>
              </div>
              <div>
                <label>Max songs (top by votes)</label>
                <input type="number" min="1" max="50" value={form.limit} onChange={e => setForm(p => ({ ...p, limit: parseInt(e.target.value) || 25 }))} />
              </div>
            </div>
            <div className="btn-row">
              <button type="button" className="cancel-btn" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="create-btn" disabled={creating}>
                {creating ? <><span className="spinner" /> Creating…</> : 'Create topic'}
              </button>
            </div>
          </form>
        )}

        {editing && (
          <div className="editor">
            <h2>Editing: {editing.name}</h2>
            <p className="editor-hint">Drag to reorder · Click × to remove · Top 25 will show publicly</p>
            {editing.songs.map((song, idx) => (
              <div
                key={song.songId}
                className={`song-item${dragIdx === idx ? ' dragging' : ''}`}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={e => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
              >
                <span className="drag-handle">⠿</span>
                <span className="song-num">{idx + 1}</span>
                <div className="song-info">
                  <div className="song-name-ed">{song.name}</div>
                  {song.movie && <div className="song-movie-ed">{song.movie}</div>}
                </div>
                <button className="remove-btn" onClick={() => removeSong(song.songId)} title="Remove">×</button>
              </div>
            ))}
            <div className="save-row">
              <button className="close-btn" onClick={() => setEditing(null)}>Cancel</button>
              <button className="save-btn" disabled={actionId === editing.id} onClick={saveEdit}>
                {actionId === editing.id ? <><span className="spinner spinner-dark" /> Saving…</> : 'Save order'}
              </button>
            </div>
          </div>
        )}

        {fetching && <div className="empty">Loading…</div>}
        {!fetching && topics.length === 0 && <div className="empty">No topics yet. Create one from a playlist.</div>}
        {topics.map(topic => (
          <div key={topic.id} className="topic-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="topic-name">{topic.name}</div>
                <div className="topic-meta">{(topic.songs || []).length} songs · Created {topic.createdAt?.slice(0, 10)}</div>
              </div>
            </div>
            <div className="topic-actions">
              <button className="btn-sm btn-edit" onClick={() => openEdit(topic.id)}>Edit & reorder</button>
              <Link href={`/topic/${topic.id}`} target="_blank" className="btn-sm btn-pub">Preview →</Link>
              <button className="btn-sm btn-delete" disabled={actionId === topic.id} onClick={() => deleteTopic(topic.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
