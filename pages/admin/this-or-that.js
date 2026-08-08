import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAdminAuth } from '../../lib/useAdmin.js';

export default function ThisOrThatAdmin() {
  const { auth, loading, apiFetch } = useAdminAuth();
  const router = useRouter();
  const [pairs, setPairs] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [playingId, setPlayingId] = useState(null);

  useEffect(() => { if (!loading && !auth) router.replace('/admin/login'); }, [auth, loading]);

  useEffect(() => {
    if (!auth) return;
    apiFetch('/api/admin/this-or-that')
      .then(r => r.json())
      .then(d => { setPairs(d.pairs || []); setFetching(false); })
      .catch(() => setFetching(false));
  }, [auth]);

  if (loading || !auth) return null;

  return (
    <>
      <Head><title>This or That — Admin</title></Head>
      <style>{`
        body { background: var(--admin-bg); }
        .wrap { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.75rem; flex-wrap: wrap; gap: 10px; }
        .topbar h1 { color: var(--admin-text); font-size: 1.25rem; font-weight: 700; }
        .back { color: var(--admin-muted); text-decoration: none; font-size: 0.85rem; border: 1px solid var(--admin-border); padding: 0.35rem 0.75rem; border-radius: 6px; }
        .count-badge { font-size: 0.8rem; color: var(--admin-muted); background: var(--admin-surface); border: 1px solid var(--admin-border); padding: 0.25rem 0.65rem; border-radius: 20px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }
        .card { background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 12px; padding: 1.1rem 1.2rem; transition: border-color 0.15s; }
        .card.playing { border-color: var(--admin-accent); }
        .vs-row { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.85rem; }
        .song-name { flex: 1; font-size: 0.88rem; font-weight: 600; color: var(--admin-text); line-height: 1.3; }
        .vs-badge { font-size: 0.7rem; font-weight: 700; color: #fff; background: var(--admin-accent); padding: 0.15rem 0.4rem; border-radius: 6px; flex-shrink: 0; }
        .song-name.b { text-align: right; }
        audio { width: 100%; }
        .meta { font-size: 0.7rem; color: var(--admin-muted); margin-top: 0.6rem; }
        .empty { text-align: center; padding: 4rem 2rem; color: var(--admin-muted); }
        .empty-icon { font-size: 3rem; margin-bottom: 1rem; }
        .loading { text-align: center; padding: 3rem; color: var(--admin-muted); font-style: italic; }
        @media (max-width: 600px) { .wrap { padding: 1rem; } .grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="wrap">
        <div className="topbar">
          <h1>🎵 This or That Game</h1>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {!fetching && <span className="count-badge">{pairs.length} pairs</span>}
            <Link href="/admin" className="back">← Admin</Link>
          </div>
        </div>

        {fetching && <div className="loading">Loading pairs…</div>}

        {!fetching && pairs.length === 0 && (
          <div className="empty">
            <div className="empty-icon">🎵</div>
            <p style={{ marginBottom: '0.5rem' }}>No pairs yet.</p>
            <p style={{ fontSize: '0.82rem' }}>Run <code>node scripts/generate-this-or-that.js</code> to generate the audio clips.</p>
          </div>
        )}

        {!fetching && pairs.length > 0 && (
          <div className="grid">
            {pairs.map(pair => (
              <div key={pair.id} className={`card${playingId === pair.id ? ' playing' : ''}`}>
                <div className="vs-row">
                  <span className="song-name">{pair.song1}</span>
                  <span className="vs-badge">VS</span>
                  <span className="song-name b">{pair.song2}</span>
                </div>
                {pair.audioUrl ? (
                  <audio
                    controls
                    preload="none"
                    src={pair.audioUrl}
                    onPlay={() => setPlayingId(pair.id)}
                    onPause={() => setPlayingId(p => p === pair.id ? null : p)}
                    onEnded={() => setPlayingId(p => p === pair.id ? null : p)}
                  />
                ) : (
                  <div style={{ fontSize: '0.78rem', color: 'var(--error)', padding: '0.5rem 0' }}>⚠ No audio uploaded yet</div>
                )}
                <div className="meta">⏱ {pair.clipStart ?? 20}s – {pair.clipEnd ?? 35}s · {pair.id}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
