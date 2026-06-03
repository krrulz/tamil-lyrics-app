// pages/admin/playlists.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAdminAuth } from '../../lib/useAdmin.js';

export default function AdminPlaylists() {
  const { auth, loading, apiFetch } = useAdminAuth();
  const router = useRouter();
  const [playlists, setPlaylists] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [playlistDetail, setPlaylistDetail] = useState({});
  const [dragIdx, setDragIdx] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [addSongInput, setAddSongInput] = useState('');
  const [songSearch, setSongSearch] = useState([]);
  const [searching, setSearching] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { if (!loading && !auth) router.replace('/admin/login'); }, [auth, loading]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    if (!auth) return;
    const res = await apiFetch('/api/admin/playlists');
    const data = await res.json();
    setPlaylists(data.playlists || []);
    setFetching(false);
  };

  useEffect(() => { load(); }, [auth]);

  const loadDetail = async (id) => {
    const res = await apiFetch(`/api/admin/playlists/${id}`);
    const data = await res.json();
    setPlaylistDetail(prev => ({ ...prev, [id]: data }));
  };

  const toggleExpand = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!playlistDetail[id]) await loadDetail(id);
  };

  const createPlaylist = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const res = await apiFetch('/api/admin/playlists', { method: 'POST', body: JSON.stringify({ name: newName }) });
    if (res.ok) { showToast('✓ Playlist created'); setNewName(''); setShowCreate(false); load(); }
    setCreating(false);
  };

  const deletePlaylist = async (id) => {
    if (!confirm('Delete this playlist?')) return;
    await apiFetch(`/api/admin/playlists/${id}`, { method: 'DELETE' });
    showToast('✓ Deleted');
    load();
    if (expanded === id) setExpanded(null);
  };

  const searchSongs = async (q) => {
    if (!q.trim()) { setSongSearch([]); return; }
    setSearching(true);
    const res = await fetch(`/api/songs?q=${encodeURIComponent(q)}&limit=10`);
    const data = await res.json();
    setSongSearch(data.songs || []);
    setSearching(false);
  };

  const addSongToPlaylist = async (playlistId, songId) => {
    setActionId(songId);
    const res = await apiFetch(`/api/admin/playlists/${playlistId}`, { method: 'PATCH', body: JSON.stringify({ action: 'add-song', songId }) });
    const data = await res.json();
    if (res.ok) { showToast('✓ Song added'); setAddSongInput(''); setSongSearch([]); loadDetail(playlistId); load(); }
    else showToast('⚠ ' + (data.error || 'Failed'));
    setActionId(null);
  };

  const removeSong = async (playlistId, songId) => {
    setActionId(songId);
    await apiFetch(`/api/admin/playlists/${playlistId}`, { method: 'PATCH', body: JSON.stringify({ action: 'remove-song', songId }) });
    showToast('✓ Removed');
    loadDetail(playlistId);
    load();
    setActionId(null);
  };

  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, playlistId, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setPlaylistDetail(prev => {
      const songs = [...(prev[playlistId]?.songs || [])];
      const [moved] = songs.splice(dragIdx, 1);
      songs.splice(idx, 0, moved);
      setDragIdx(idx);
      return { ...prev, [playlistId]: { ...prev[playlistId], songs: songs.map((s, i) => ({ ...s, order: i })) } };
    });
  };
  const handleDragEnd = async (playlistId) => {
    setDragIdx(null);
    const songs = playlistDetail[playlistId]?.songs || [];
    await apiFetch(`/api/admin/playlists/${playlistId}`, { method: 'PATCH', body: JSON.stringify({ action: 'reorder', songs }) });
    showToast('✓ Order saved');
  };

  if (loading || !auth) return null;

  return (
    <>
      <Head><title>Playlists — Admin</title></Head>
      <style>{`
        body { background: var(--admin-bg); }
        .wrap { max-width: 900px; margin: 0 auto; padding: 2rem; }
        .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .topbar h1 { color: var(--admin-text); font-size: 1.3rem; font-weight: 600; }
        .back { color: var(--admin-muted); text-decoration: none; font-size: 0.85rem; }
        .create-btn { padding: 0.5rem 1rem; background: var(--admin-accent); color: #fff; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
        .create-form { display: flex; gap: 8px; margin-bottom: 1.5rem; }
        .create-form input { flex: 1; padding: 0.55rem 0.8rem; background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 8px; color: var(--admin-text); font-size: 0.88rem; outline: none; }
        .create-form input:focus { border-color: var(--admin-accent); }
        .cancel-btn { padding: 0.5rem 0.75rem; background: none; border: 1px solid var(--admin-border); color: var(--admin-muted); border-radius: 8px; font-size: 0.85rem; cursor: pointer; }
        .pl-card { background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 10px; margin-bottom: 12px; overflow: hidden; }
        .pl-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; cursor: pointer; }
        .pl-header:hover { background: rgba(255,255,255,0.03); }
        .pl-name { font-size: 1rem; font-weight: 600; color: var(--admin-text); }
        .pl-meta { font-size: 0.78rem; color: var(--admin-muted); margin-top: 2px; }
        .pl-actions { display: flex; gap: 8px; align-items: center; }
        .btn-sm { padding: 0.3rem 0.65rem; border-radius: 6px; font-size: 0.78rem; font-weight: 600; cursor: pointer; border: 1px solid; }
        .btn-del { background: transparent; color: var(--error); border-color: var(--error); }
        .chevron { color: var(--admin-muted); font-size: 0.8rem; transition: transform 0.15s; }
        .chevron.open { transform: rotate(180deg); }
        .pl-body { padding: 0 1.25rem 1.25rem; border-top: 1px solid var(--admin-border); }
        .search-box { display: flex; gap: 8px; margin: 1rem 0 0.5rem; }
        .search-input { flex: 1; padding: 0.5rem 0.8rem; background: rgba(255,255,255,0.05); border: 1px solid var(--admin-border); border-radius: 6px; color: var(--admin-text); font-size: 0.85rem; outline: none; }
        .search-input:focus { border-color: var(--admin-accent); }
        .search-results { background: rgba(0,0,0,0.4); border: 1px solid var(--admin-border); border-radius: 6px; margin-bottom: 0.75rem; }
        .search-result-item { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-bottom: 1px solid var(--admin-border); }
        .search-result-item:last-child { border-bottom: none; }
        .sr-name { font-size: 0.85rem; color: var(--admin-text); }
        .sr-movie { font-size: 0.72rem; color: var(--admin-muted); }
        .add-btn { font-size: 0.75rem; background: rgba(108,142,255,0.15); color: var(--admin-accent); border: 1px solid var(--admin-accent); border-radius: 4px; padding: 0.2rem 0.5rem; cursor: pointer; }
        .song-row { display: flex; align-items: center; gap: 10px; padding: 7px 8px; background: rgba(255,255,255,0.03); border: 1px solid var(--admin-border); border-radius: 6px; margin-bottom: 5px; cursor: grab; user-select: none; }
        .song-row.dragging { opacity: 0.35; }
        .drag-handle { color: var(--admin-muted); font-size: 0.85rem; }
        .song-num { font-size: 0.7rem; color: var(--admin-muted); width: 18px; text-align: right; flex-shrink: 0; }
        .song-info { flex: 1; min-width: 0; }
        .song-name-r { font-size: 0.85rem; color: var(--admin-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .song-movie-r { font-size: 0.7rem; color: var(--admin-muted); }
        .vote-pill { font-size: 0.7rem; color: var(--admin-accent); background: rgba(108,142,255,0.1); border-radius: 10px; padding: 1px 6px; flex-shrink: 0; }
        .rm-btn { background: none; border: none; color: var(--admin-muted); cursor: pointer; font-size: 0.9rem; flex-shrink: 0; line-height: 1; }
        .rm-btn:hover { color: var(--error); }
        .hint { font-size: 0.72rem; color: var(--admin-muted); margin-top: 0.5rem; }
        .empty { color: var(--admin-muted); text-align: center; padding: 3rem; }
        .loading-msg { color: var(--admin-muted); font-size: 0.82rem; padding: 0.5rem 0; }
        .toast { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); background: var(--admin-surface); color: var(--admin-text); border: 1px solid var(--admin-border); padding: 0.65rem 1.25rem; border-radius: 8px; font-size: 0.88rem; }
      `}</style>
      <div className="wrap">
        {toast && <div className="toast">{toast}</div>}
        <div className="topbar">
          <h1>🎶 Playlists</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/admin" className="back">← Dashboard</Link>
            <button className="create-btn" onClick={() => setShowCreate(v => !v)}>+ New</button>
          </div>
        </div>

        {showCreate && (
          <form className="create-form" onSubmit={createPlaylist}>
            <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Playlist name…" autoFocus />
            <button type="button" className="cancel-btn" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="create-btn" disabled={creating}>
              {creating ? <span className="spinner" /> : 'Create'}
            </button>
          </form>
        )}

        {fetching && <div className="empty">Loading…</div>}
        {!fetching && playlists.length === 0 && <div className="empty">No playlists yet.</div>}

        {playlists.map(pl => {
          const detail = playlistDetail[pl.id];
          const isOpen = expanded === pl.id;
          return (
            <div key={pl.id} className="pl-card">
              <div className="pl-header" onClick={() => toggleExpand(pl.id)}>
                <div>
                  <div className="pl-name">{pl.name}</div>
                  <div className="pl-meta">{(pl.songs || []).length} songs · {pl.createdAt?.slice(0, 10)}</div>
                </div>
                <div className="pl-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn-sm btn-del" onClick={() => deletePlaylist(pl.id)}>Delete</button>
                  <span className={`chevron${isOpen ? ' open' : ''}`}>▼</span>
                </div>
              </div>

              {isOpen && (
                <div className="pl-body">
                  {/* Search to add songs */}
                  <div className="search-box">
                    <input
                      className="search-input"
                      placeholder="Search songs to add…"
                      value={addSongInput}
                      onChange={e => { setAddSongInput(e.target.value); searchSongs(e.target.value); }}
                    />
                    {searching && <span className="loading-msg">Searching…</span>}
                  </div>
                  {songSearch.length > 0 && (
                    <div className="search-results">
                      {songSearch.map(s => (
                        <div key={s.id} className="search-result-item">
                          <div>
                            <div className="sr-name">{s.name}</div>
                            {s.movie && <div className="sr-movie">{s.movie}</div>}
                          </div>
                          <button className="add-btn" disabled={actionId === s.id} onClick={() => addSongToPlaylist(pl.id, s.id)}>
                            {actionId === s.id ? '…' : '+ Add'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Song list */}
                  {!detail && <div className="loading-msg">Loading songs…</div>}
                  {detail && detail.songs?.length === 0 && <div style={{ fontSize: '0.82rem', color: 'var(--admin-muted)', padding: '0.5rem 0' }}>No songs yet. Search above to add.</div>}
                  {detail?.songs?.map((song, idx) => (
                    <div
                      key={song.songId}
                      className={`song-row${dragIdx === idx ? ' dragging' : ''}`}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={e => handleDragOver(e, pl.id, idx)}
                      onDragEnd={() => handleDragEnd(pl.id)}
                    >
                      <span className="drag-handle">⠿</span>
                      <span className="song-num">{idx + 1}</span>
                      <div className="song-info">
                        <div className="song-name-r">{song.name}</div>
                        {song.movie && <div className="song-movie-r">{song.movie}</div>}
                      </div>
                      {song.votes > 0 && <span className="vote-pill">{song.votes}v</span>}
                      <button className="rm-btn" disabled={actionId === song.songId} onClick={() => removeSong(pl.id, song.songId)}>×</button>
                    </div>
                  ))}
                  {detail?.songs?.length > 0 && <p className="hint">Drag to reorder. Reorder is saved automatically on drop.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
