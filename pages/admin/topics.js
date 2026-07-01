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
  const [editingName, setEditingName] = useState(null); // { id, value }
  const [songQuery, setSongQuery] = useState('');
  const [songResults, setSongResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);

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

  const saveTopicName = async () => {
    if (!editingName?.value.trim()) return;
    const res = await apiFetch(`/api/admin/topics/${editingName.id}`, {
      method: 'PATCH', body: JSON.stringify({ name: editingName.value.trim() }),
    });
    if (res.ok) {
      showToast('✓ Name updated');
      setTopics(prev => prev.map(t => t.id === editingName.id ? { ...t, name: editingName.value.trim() } : t));
      setEditingName(null);
    } else showToast('⚠ Failed');
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

  const addSong = (song) => {
    setEditing(prev => {
      if (prev.songs.some(s => s.songId === song.id)) return prev;
      return { ...prev, songs: [...prev.songs, { songId: song.id, name: song.name, movie: song.movie, order: prev.songs.length }] };
    });
    setSongQuery(''); setSongResults([]);
  };

  const onSongQueryChange = (val) => {
    setSongQuery(val);
    clearTimeout(searchTimer.current);
    if (!val.trim()) { setSongResults([]); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const res = await apiFetch(`/api/songs?q=${encodeURIComponent(val)}&limit=8`);
      const data = await res.json();
      setSongResults(data.songs || []);
      setSearching(false);
    }, 300);
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
        .name-edit-row { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; }
        .name-edit-input { flex: 1; padding: 0.3rem 0.6rem; background: rgba(255,255,255,0.08); border: 1px solid var(--admin-accent); border-radius: 6px; color: var(--admin-text); font-size: 0.95rem; font-weight: 600; outline: none; }
        .btn-name-save { padding: 0.25rem 0.65rem; background: var(--admin-accent); color: #fff; border: none; border-radius: 5px; font-size: 0.75rem; font-weight: 600; cursor: pointer; }
        .btn-name-cancel { padding: 0.25rem 0.6rem; background: none; border: 1px solid var(--admin-border); color: var(--admin-muted); border-radius: 5px; font-size: 0.75rem; cursor: pointer; }
        .btn-edit-name { background: none; border: none; color: var(--admin-muted); cursor: pointer; font-size: 0.8rem; padding: 1px 4px; border-radius: 4px; }
        .btn-edit-name:hover { color: var(--admin-accent); }
        .btn-edit { background: transparent; color: var(--admin-accent); border-color: var(--admin-accent); }
        .btn-delete { background: transparent; color: var(--error); border-color: var(--error); }
        .btn-pub { background: transparent; color: var(--admin-muted); border-color: var(--admin-border); text-decoration: none; }
        .btn-wheel { background: transparent; color: #C8922A; border-color: #C8922A; text-decoration: none; }
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
        .add-song-box { position: relative; margin-bottom: 1rem; }
        .add-song-input { width: 100%; padding: 0.55rem 0.8rem; background: rgba(255,255,255,0.06); border: 1px solid var(--admin-accent); border-radius: 6px; color: var(--admin-text); font-size: 0.85rem; outline: none; }
        .add-song-input::placeholder { color: var(--admin-muted); }
        .song-results { position: absolute; top: 100%; left: 0; right: 0; background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 6px; z-index: 10; max-height: 220px; overflow-y: auto; margin-top: 2px; }
        .song-result-item { padding: 0.5rem 0.8rem; cursor: pointer; border-bottom: 1px solid var(--admin-border); }
        .song-result-item:last-child { border-bottom: none; }
        .song-result-item:hover { background: rgba(108,142,255,0.15); }
        .result-name { font-size: 0.85rem; color: var(--admin-text); }
        .result-movie { font-size: 0.72rem; color: var(--admin-muted); }
        .already-added { opacity: 0.4; cursor: not-allowed; }
        .empty { color: var(--admin-muted); text-align: center; padding: 3rem; }
        .toast { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); background: var(--admin-surface); color: var(--admin-text); border: 1px solid var(--admin-border); padding: 0.65rem 1.25rem; border-radius: 8px; font-size: 0.88rem; z-index: 999; white-space: nowrap; }
        @media (max-width: 768px) {
          .wrap { padding: 1.25rem; }
          .topbar { flex-wrap: wrap; gap: 8px; margin-bottom: 1rem; }
          .topbar h1 { font-size: 1.1rem; }
          .form-row { grid-template-columns: 1fr; }
          .editor { padding: 1.1rem; }
          .topic-actions { flex-wrap: wrap; }
        }
        @media (max-width: 480px) {
          .wrap { padding: 0.9rem; }
          .form-panel { padding: 1rem; }
          .topic-card { padding: 1rem; }
          .save-row { flex-wrap: wrap; }
          .save-btn, .close-btn { flex: 1; }
        }
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
            <div className="add-song-box">
              <input
                className="add-song-input"
                placeholder="🔍 Search songs to add…"
                value={songQuery}
                onChange={e => onSongQueryChange(e.target.value)}
                onBlur={() => setTimeout(() => setSongResults([]), 200)}
              />
              {(songResults.length > 0 || searching) && (
                <div className="song-results">
                  {searching && <div className="song-result-item" style={{color:'var(--admin-muted)'}}>Searching…</div>}
                  {songResults.map(song => {
                    const already = editing.songs.some(s => s.songId === song.id);
                    return (
                      <div
                        key={song.id}
                        className={`song-result-item${already ? ' already-added' : ''}`}
                        onMouseDown={() => !already && addSong(song)}
                      >
                        <div className="result-name">{song.name} {already ? '✓' : '+'}</div>
                        {song.movie && <div className="result-movie">{song.movie}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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
            <div style={{ marginBottom: 8 }}>
              {editingName?.id === topic.id ? (
                <div className="name-edit-row">
                  <input
                    className="name-edit-input"
                    value={editingName.value}
                    autoFocus
                    onChange={e => setEditingName(p => ({ ...p, value: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') saveTopicName(); if (e.key === 'Escape') setEditingName(null); }}
                  />
                  <button className="btn-name-save" onClick={saveTopicName}>✓</button>
                  <button className="btn-name-cancel" onClick={() => setEditingName(null)}>✕</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="topic-name">{topic.name}</div>
                  <button className="btn-edit-name" title="Rename topic" onClick={() => setEditingName({ id: topic.id, value: topic.name })}>✏️</button>
                </div>
              )}
              <div className="topic-meta">{(topic.songs || []).length} songs · Created {topic.createdAt?.slice(0, 10)}</div>
            </div>
            <div className="topic-actions">
              <button className="btn-sm btn-edit" onClick={() => openEdit(topic.id)}>Edit & reorder</button>
              <Link href={`/admin/wheel/${topic.id}`} className="btn-sm btn-wheel">🎡 Wheel</Link>
              <Link href={`/topic/${topic.id}`} target="_blank" className="btn-sm btn-pub">Preview →</Link>
              <button className="btn-sm btn-delete" disabled={actionId === topic.id} onClick={() => deleteTopic(topic.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
