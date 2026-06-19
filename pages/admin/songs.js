// pages/admin/songs.js
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAdminAuth } from '../../lib/useAdmin.js';

export default function AdminSongs() {
  const { auth, loading, apiFetch } = useAdminAuth();
  const router = useRouter();
  const [songs, setSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [filter, setFilter] = useState('');
  const [playlistFilter, setPlaylistFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState('');
  const filterTimer = useRef(null);

  useEffect(() => { if (!loading && !auth) router.replace('/admin/login'); }, [auth, loading]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    if (!auth) return;
    setFetching(true);
    try {
      const [songsRes, plRes] = await Promise.all([
        apiFetch('/api/admin/songs'),
        apiFetch('/api/admin/playlists'),
      ]);
      const [songsData, plData] = await Promise.all([songsRes.json(), plRes.json()]);
      setSongs(songsData.songs || []);
      setPlaylists(plData.playlists || []);
    } catch (err) {
      showToast('⚠ Failed to load: ' + err.message);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { load(); }, [auth]);

  const openEdit = async (song) => {
    // Song list has partial data; fetch full doc to get lyrics
    try {
      const res = await apiFetch(`/api/admin/songs/${song.id}`);
      const data = await res.json();
      setEditing({ ...data, id: song.id });
    } catch {
      setEditing({ ...song }); // fallback to list data
    }
  };

  const saveSong = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/admin/songs/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editing.name,
          movie: editing.movie,
          tamilLyrics: editing.tamilLyrics,
          englishLyrics: editing.englishLyrics,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('✓ Song updated');
        setSongs(prev => prev.map(s => s.id === editing.id ? { ...s, name: editing.name, movie: editing.movie } : s));
        setEditing(null);
      } else {
        showToast('⚠ ' + (data.error || 'Save failed'));
      }
    } catch (err) {
      showToast('⚠ ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteSong = async (id, name) => {
    if (!confirm(`Delete "${name}"? This removes it from the database permanently.`)) return;
    setDeleting(id);
    try {
      const res = await apiFetch(`/api/admin/songs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('✓ Song deleted');
        setSongs(prev => prev.filter(s => s.id !== id));
        if (editing?.id === id) setEditing(null);
      } else {
        const data = await res.json();
        showToast('⚠ ' + (data.error || 'Delete failed'));
      }
    } catch (err) {
      showToast('⚠ ' + err.message);
    } finally {
      setDeleting(null);
    }
  };

  const activePl = playlists.find(p => p.id === playlistFilter);
  const plSongIds = activePl
    ? new Set((activePl.songs || []).map(s => typeof s === 'string' ? s : s.songId))
    : null;

  const q = filter.trim().toLowerCase();
  const filtered = songs.filter(s => {
    if (plSongIds && !plSongIds.has(s.id)) return false;
    if (q && !s.name?.toLowerCase().includes(q) && !(s.movie || '').toLowerCase().includes(q)) return false;
    return true;
  });

  if (loading || !auth) return null;

  return (
    <>
      <Head><title>Songs — Admin</title></Head>
      <style>{`
        body { background: var(--admin-bg); }
        .layout { display: flex; height: 100vh; overflow: hidden; }
        /* Left panel — song list */
        .list-panel { width: 340px; flex-shrink: 0; border-right: 1px solid var(--admin-border); display: flex; flex-direction: column; overflow: hidden; }
        .list-header { padding: 1.25rem 1.25rem 0; flex-shrink: 0; }
        .list-header h1 { color: var(--admin-text); font-size: 1.2rem; font-weight: 600; margin-bottom: 0.75rem; }
        .list-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
        .back { color: var(--admin-muted); text-decoration: none; font-size: 0.82rem; }
        .count-chip { font-size: 0.72rem; background: rgba(108,142,255,0.15); color: var(--admin-accent); padding: 0.15rem 0.55rem; border-radius: 10px; }
        .search-wrap { position: relative; margin-bottom: 0.75rem; }
        .search-input { width: 100%; padding: 0.5rem 0.8rem 0.5rem 2rem; background: rgba(255,255,255,0.05); border: 1px solid var(--admin-border); border-radius: 6px; color: var(--admin-text); font-size: 0.85rem; outline: none; }
        .search-input:focus { border-color: var(--admin-accent); }
        .search-icon { position: absolute; left: 0.65rem; top: 50%; transform: translateY(-50%); color: var(--admin-muted); font-size: 0.85rem; pointer-events: none; }
        .pl-select { width: 100%; padding: 0.45rem 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid var(--admin-border); border-radius: 6px; color: var(--admin-text); font-size: 0.82rem; outline: none; margin-bottom: 0.5rem; cursor: pointer; }
        .pl-select:focus { border-color: var(--admin-accent); }
        .song-list { flex: 1; overflow-y: auto; padding: 0 0.5rem 1rem; }
        .song-row { display: flex; align-items: center; gap: 8px; padding: 0.65rem 0.75rem; border-radius: 7px; cursor: pointer; transition: background 0.12s; margin-bottom: 2px; }
        .song-row:hover { background: rgba(255,255,255,0.05); }
        .song-row.active { background: rgba(108,142,255,0.15); }
        .song-row-info { flex: 1; min-width: 0; }
        .song-row-name { font-size: 0.88rem; color: var(--admin-text); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .song-row-movie { font-size: 0.72rem; color: var(--admin-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lyrics-dots { display: flex; gap: 3px; flex-shrink: 0; }
        .dot { width: 6px; height: 6px; border-radius: 50%; }
        .dot-ta { background: #C8922A; }
        .dot-en { background: #6C8EFF; }
        .dot-na { background: var(--admin-border); }
        .del-btn-sm { background: none; border: none; color: var(--admin-muted); cursor: pointer; font-size: 0.9rem; flex-shrink: 0; opacity: 0; transition: opacity 0.12s; padding: 2px 4px; border-radius: 4px; }
        .song-row:hover .del-btn-sm { opacity: 1; }
        .del-btn-sm:hover { color: var(--error); background: rgba(252,129,129,0.1); }
        .empty-list { color: var(--admin-muted); text-align: center; padding: 2rem 1rem; font-size: 0.85rem; }
        /* Right panel — editor */
        .edit-panel { flex: 1; overflow-y: auto; padding: 2rem; }
        .edit-placeholder { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--admin-muted); gap: 0.75rem; }
        .edit-placeholder-icon { font-size: 3rem; opacity: 0.3; }
        .edit-placeholder-text { font-size: 0.9rem; }
        .edit-title { font-size: 1.1rem; font-weight: 600; color: var(--admin-text); margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .field-group { margin-bottom: 1.1rem; }
        .field-label { font-size: 0.72rem; color: var(--admin-muted); text-transform: uppercase; letter-spacing: 0.07em; font-weight: 600; margin-bottom: 0.35rem; display: block; }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 1.1rem; }
        .field-input { width: 100%; padding: 0.55rem 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid var(--admin-border); border-radius: 6px; color: var(--admin-text); font-size: 0.88rem; outline: none; font-family: inherit; }
        .field-input:focus { border-color: var(--admin-accent); }
        .field-textarea { width: 100%; padding: 0.65rem 0.75rem; background: rgba(255,255,255,0.05); border: 1px solid var(--admin-border); border-radius: 6px; color: var(--admin-text); font-size: 0.85rem; outline: none; font-family: 'Noto Sans Tamil', 'Inter', sans-serif; resize: vertical; min-height: 220px; line-height: 1.7; }
        .field-textarea:focus { border-color: var(--admin-accent); }
        .lyrics-tabs { display: flex; gap: 6px; margin-bottom: 0.6rem; }
        .lyrics-tab { font-size: 0.78rem; padding: 0.25rem 0.75rem; border-radius: 12px; border: 1px solid var(--admin-border); background: none; color: var(--admin-muted); cursor: pointer; font-weight: 500; }
        .lyrics-tab.active { background: var(--admin-accent); color: #fff; border-color: var(--admin-accent); }
        .action-row { display: flex; gap: 8px; margin-top: 1.25rem; flex-wrap: wrap; }
        .btn-save { padding: 0.55rem 1.5rem; background: var(--admin-accent); color: #fff; border: none; border-radius: 7px; font-size: 0.88rem; font-weight: 600; cursor: pointer; }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-cancel { padding: 0.55rem 1rem; background: none; border: 1px solid var(--admin-border); color: var(--admin-muted); border-radius: 7px; font-size: 0.88rem; cursor: pointer; }
        .btn-delete { padding: 0.55rem 1rem; background: rgba(252,129,129,0.1); color: var(--error); border: 1px solid var(--error); border-radius: 7px; font-size: 0.88rem; cursor: pointer; margin-left: auto; }
        .btn-delete:disabled { opacity: 0.5; cursor: not-allowed; }
        .song-id-chip { font-size: 0.68rem; color: var(--admin-muted); background: rgba(255,255,255,0.05); padding: 0.15rem 0.5rem; border-radius: 4px; font-family: monospace; }
        .toast { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); background: var(--admin-surface); color: var(--admin-text); border: 1px solid var(--admin-border); padding: 0.65rem 1.25rem; border-radius: 8px; font-size: 0.88rem; z-index: 999; white-space: nowrap; }
        /* Responsive */
        @media (max-width: 768px) {
          .layout { flex-direction: column; height: auto; overflow: visible; }
          .list-panel { width: 100%; border-right: none; border-bottom: 1px solid var(--admin-border); max-height: 45vh; }
          .edit-panel { padding: 1.25rem; }
          .field-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 480px) {
          .list-header { padding: 1rem 1rem 0; }
          .edit-panel { padding: 1rem; }
          .field-textarea { min-height: 160px; }
        }
      `}</style>

      {toast && <div className="toast">{toast}</div>}

      <div className="layout" suppressHydrationWarning>
        {/* ── Left: song list ── */}
        <div className="list-panel">
          <div className="list-header">
            <div className="list-topbar">
              <h1>🎵 Songs</h1>
              <Link href="/admin" className="back">← Dashboard</Link>
            </div>
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                className="search-input"
                placeholder="Search name or movie…"
                value={filter}
                onChange={e => setFilter(e.target.value)}
              />
            </div>
            {playlists.length > 0 && (
              <select
                className="pl-select"
                value={playlistFilter}
                onChange={e => { setPlaylistFilter(e.target.value); setEditing(null); }}
              >
                <option value="">All playlists</option>
                {playlists.map(p => {
                  const cnt = (p.songs || []).length;
                  return <option key={p.id} value={p.id}>{p.name} ({cnt})</option>;
                })}
              </select>
            )}
            <div style={{ fontSize: '0.72rem', color: 'var(--admin-muted)', marginBottom: '0.5rem', paddingLeft: '0.25rem' }}>
              {fetching ? 'Loading…' : <><span className="count-chip">{filtered.length}</span>{playlistFilter || q ? ` of ${songs.length}` : ''} songs</>}
            </div>
          </div>

          <div className="song-list">
            {!fetching && filtered.length === 0 && <div className="empty-list">No songs found.</div>}
            {filtered.map(song => (
              <div
                key={song.id}
                className={`song-row${editing?.id === song.id ? ' active' : ''}`}
                onClick={() => openEdit(song)}
              >
                <div className="song-row-info">
                  <div className="song-row-name">{song.name || song.id}</div>
                  {song.movie && <div className="song-row-movie">🎬 {song.movie}</div>}
                </div>
                <div className="lyrics-dots" title={`Tamil: ${song.tamilLyrics ? '✓' : '—'}  English: ${song.englishLyrics ? '✓' : '—'}`}>
                  <span className={`dot ${song.tamilLyrics ? 'dot-ta' : 'dot-na'}`} />
                  <span className={`dot ${song.englishLyrics ? 'dot-en' : 'dot-na'}`} />
                </div>
                <button
                  className="del-btn-sm"
                  title="Delete song"
                  disabled={deleting === song.id}
                  onClick={e => { e.stopPropagation(); deleteSong(song.id, song.name); }}
                >×</button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: editor ── */}
        <div className="edit-panel">
          {!editing ? (
            <div className="edit-placeholder">
              <div className="edit-placeholder-icon">🎵</div>
              <div className="edit-placeholder-text">Select a song to edit its details and lyrics</div>
            </div>
          ) : (
            <>
              <div className="edit-title">
                <span>Edit Song <span className="song-id-chip">{editing.id}</span></span>
              </div>

              <div className="field-row">
                <div className="field-group">
                  <label className="field-label">Song Name *</label>
                  <input
                    className="field-input"
                    value={editing.name || ''}
                    onChange={e => setEditing(p => ({ ...p, name: e.target.value }))}
                    placeholder="Song name"
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Movie / Album</label>
                  <input
                    className="field-input"
                    value={editing.movie || ''}
                    onChange={e => setEditing(p => ({ ...p, movie: e.target.value }))}
                    placeholder="Movie or album"
                  />
                </div>
              </div>

              <div className="field-group">
                <div className="lyrics-tabs">
                  <span style={{ fontSize: '0.72rem', color: 'var(--admin-muted)', alignSelf: 'center', marginRight: 4 }}>Lyrics:</span>
                  <span style={{ fontSize: '0.75rem', color: editing.tamilLyrics ? '#C8922A' : 'var(--admin-muted)' }}>
                    தமிழ் {editing.tamilLyrics ? '✓' : '—'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: editing.englishLyrics ? 'var(--admin-accent)' : 'var(--admin-muted)' }}>
                    English {editing.englishLyrics ? '✓' : '—'}
                  </span>
                </div>
              </div>

              <div className="field-group">
                <label className="field-label">Tamil Lyrics</label>
                <textarea
                  className="field-textarea"
                  value={editing.tamilLyrics || ''}
                  onChange={e => setEditing(p => ({ ...p, tamilLyrics: e.target.value }))}
                  placeholder="Tamil lyrics…"
                />
              </div>

              <div className="field-group">
                <label className="field-label">English Lyrics (transliteration)</label>
                <textarea
                  className="field-textarea"
                  value={editing.englishLyrics || ''}
                  onChange={e => setEditing(p => ({ ...p, englishLyrics: e.target.value }))}
                  placeholder="English transliteration…"
                />
              </div>

              <div className="action-row">
                <button className="btn-save" disabled={saving} onClick={saveSong}>
                  {saving ? 'Saving…' : '✓ Save changes'}
                </button>
                <button className="btn-cancel" onClick={() => setEditing(null)}>Cancel</button>
                <button
                  className="btn-delete"
                  disabled={deleting === editing.id}
                  onClick={() => deleteSong(editing.id, editing.name)}
                >
                  {deleting === editing.id ? 'Deleting…' : '🗑 Delete song'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
