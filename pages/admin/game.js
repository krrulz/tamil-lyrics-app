import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAdminAuth } from '../../lib/useAdmin.js';

const COLORS = [
  '#E05252','#E07A27','#D4A017','#5AA85A',
  '#3D9BE9','#8A5AE0','#D45294','#3DB8B8',
  '#E87070','#4CB8A8','#A050E8','#E8A050',
];

function truncate(str, max) {
  return str && str.length > max ? str.slice(0, max - 1) + '…' : (str || '');
}

export default function GameAdminPage() {
  const { auth, loading, apiFetch } = useAdminAuth();
  const router = useRouter();

  const [gameData, setGameData] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [pendingSong, setPendingSong] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState('');
  const [tab, setTab] = useState('wheel'); // 'wheel' | 'interludes'
  const [previewId, setPreviewId] = useState(null);

  const canvasRef = useRef(null);
  const angleRef = useRef(0);
  const rafRef = useRef(null);
  const songsRef = useRef([]);

  useEffect(() => { if (!loading && !auth) router.replace('/admin/login'); }, [auth, loading]);

  const drawWheel = useCallback((songs, angle) => {
    const canvas = canvasRef.current;
    if (!canvas || !songs || songs.length === 0) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const r = Math.min(cx, cy) - 20;
    const N = songs.length;
    const segAngle = (2 * Math.PI) / N;

    ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.fillStyle = '#111'; ctx.fill();
    ctx.restore();

    for (let i = 0; i < N; i++) {
      const startA = angle + i * segAngle - Math.PI / 2;
      const endA = angle + (i + 1) * segAngle - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, startA, endA); ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length]; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5; ctx.stroke();

      const midA = startA + segAngle / 2;
      const textR = r * (N > 8 ? 0.64 : 0.60);
      const maxChars = N > 12 ? 8 : N > 8 ? 11 : 14;
      ctx.save();
      ctx.translate(cx + Math.cos(midA) * textR, cy + Math.sin(midA) * textR);
      ctx.rotate(midA + Math.PI / 2);
      ctx.fillStyle = '#fff'; ctx.font = `bold ${N > 12 ? 9 : N > 8 ? 10 : 12}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 3;
      ctx.fillText(truncate(songs[i].name, maxChars), 0, 0);
      ctx.restore();
    }

    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = '#C8922A'; ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
    ctx.fillStyle = '#111'; ctx.fill(); ctx.strokeStyle = '#C8922A'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy - r + 4); ctx.lineTo(cx - 12, cy - r - 18); ctx.lineTo(cx + 12, cy - r - 18);
    ctx.closePath(); ctx.fillStyle = '#C8922A'; ctx.fill();
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.5; ctx.stroke();
  }, []);

  const load = useCallback(async () => {
    if (!auth) return;
    const res = await apiFetch('/api/admin/game');
    if (!res.ok) return;
    const data = await res.json();
    setGameData(data);

    // Build wheel song list from remaining IDs
    const remaining = data.session?.remaining || [];
    const songMap = Object.fromEntries((data.songs || []).map(s => [s.id, s]));
    const wheelSongs = remaining.map(id => songMap[id]).filter(Boolean).map(s => ({ id: s.id, name: s.songName, movie: s.movieName }));
    songsRef.current = wheelSongs;
  }, [auth, apiFetch]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const remaining = gameData?.session?.remaining || [];
    const songMap = Object.fromEntries((gameData?.songs || []).map(s => [s.id, s]));
    const wheelSongs = remaining.map(id => songMap[id]).filter(Boolean).map(s => ({ id: s.id, name: s.songName, movie: s.movieName }));
    if (wheelSongs.length && canvasRef.current) {
      drawWheel(wheelSongs, angleRef.current);
    }
  }, [gameData, drawWheel]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const startGame = async () => {
    if (!confirm('Start a new game? This will reset any existing session.')) return;
    const res = await apiFetch('/api/admin/game', { method: 'POST', body: JSON.stringify({ action: 'start' }) });
    const data = await res.json();
    if (res.ok) { showToast(`Game started with ${data.remaining} songs!`); angleRef.current = 0; await load(); }
    else showToast('⚠ ' + data.error);
  };

  const spin = () => {
    const songs = songsRef.current;
    if (spinning || !songs.length) return;
    const N = songs.length;
    const segAngle = (2 * Math.PI) / N;
    const winnerIdx = Math.floor(Math.random() * N);
    const startAngle = angleRef.current;
    const winnerCenter = (winnerIdx * segAngle + segAngle / 2 + startAngle) % (2 * Math.PI);
    const offset = (2 * Math.PI - winnerCenter) % (2 * Math.PI);
    const totalDelta = (5 + Math.floor(Math.random() * 3)) * 2 * Math.PI + offset;
    const endAngle = startAngle + totalDelta;

    setSpinning(true);
    setPendingSong(null);

    const duration = 3800 + Math.random() * 1000;
    const startTime = performance.now();
    const easeOut = (t) => 1 - Math.pow(1 - t, 4);
    const tick = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const angle = startAngle + totalDelta * easeOut(t);
      angleRef.current = angle;
      drawWheel(songs, angle);
      if (t < 1) { rafRef.current = requestAnimationFrame(tick); }
      else { angleRef.current = endAngle; drawWheel(songs, endAngle); setSpinning(false); setPendingSong(songs[winnerIdx]); }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const confirmSong = async () => {
    if (!pendingSong || confirming) return;
    setConfirming(true);
    const res = await apiFetch('/api/admin/game', { method: 'POST', body: JSON.stringify({ action: 'confirm', interludeId: pendingSong.id }) });
    const data = await res.json();
    if (res.ok) {
      setPendingSong(null);
      if (data.isComplete) showToast('🎉 All songs played! Game complete.');
      else showToast(`✓ "${pendingSong.name}" is now live on the game page!`);
      angleRef.current = 0;
      await load();
    } else showToast('⚠ ' + data.error);
    setConfirming(false);
  };

  const clearCurrent = async () => {
    const res = await apiFetch('/api/admin/game', { method: 'POST', body: JSON.stringify({ action: 'clearCurrent' }) });
    if (res.ok) { showToast('Audio cleared from public page.'); await load(); }
  };

  const resetGame = async () => {
    if (!confirm('Reset entire game session? History will be cleared.')) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setSpinning(false); setPendingSong(null);
    await apiFetch('/api/admin/game', { method: 'POST', body: JSON.stringify({ action: 'reset' }) });
    showToast('Game session reset.'); angleRef.current = 0; await load();
  };

  if (loading || !auth) return null;

  const session = gameData?.session || {};
  const allSongs = gameData?.songs || [];
  const remaining = session.remaining || [];
  const played = session.played || [];
  const currentId = session.currentId;
  const status = session.status || 'idle';
  const songMap = Object.fromEntries(allSongs.map(s => [s.id, s]));
  const currentSong = currentId ? songMap[currentId] : null;
  const wheelSongs = remaining.map(id => songMap[id]).filter(Boolean);
  const spunPct = allSongs.length > 0 ? (played.length / allSongs.length) * 100 : 0;

  return (
    <>
      <Head><title>🎵 Guess the Song — Game Admin</title></Head>
      <style suppressHydrationWarning>{`
        body { background: var(--admin-bg); }
        .wrap { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.75rem; flex-wrap: wrap; gap: 10px; }
        .topbar h1 { color: var(--admin-text); font-size: 1.25rem; font-weight: 700; }
        .back { color: var(--admin-muted); text-decoration: none; font-size: 0.85rem; border: 1px solid var(--admin-border); padding: 0.35rem 0.75rem; border-radius: 6px; }
        .top-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .tabs { display: flex; gap: 4px; background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 8px; padding: 4px; margin-bottom: 1.5rem; width: fit-content; }
        .tab { padding: 0.45rem 1.1rem; border: none; background: none; color: var(--admin-muted); border-radius: 6px; cursor: pointer; font-size: 0.88rem; font-weight: 500; transition: all 0.15s; }
        .tab.active { background: var(--admin-accent); color: #fff; }
        .status-bar { display: flex; align-items: center; gap: 10px; background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 10px; padding: 0.75rem 1.1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .status-chip { font-size: 0.78rem; font-weight: 600; padding: 0.2rem 0.65rem; border-radius: 20px; }
        .chip-idle { background: rgba(255,255,255,0.06); color: var(--admin-muted); }
        .chip-active { background: rgba(34,197,94,0.12); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
        .chip-complete { background: rgba(200,146,42,0.12); color: #C8922A; border: 1px solid rgba(200,146,42,0.3); }
        .status-progress { flex: 1; min-width: 120px; height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
        .status-fill { height: 100%; background: var(--admin-accent); border-radius: 3px; transition: width 0.4s; }
        .status-text { font-size: 0.8rem; color: var(--admin-muted); }
        .layout { display: grid; grid-template-columns: 1fr 280px; gap: 2rem; align-items: start; }
        .wheel-col { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
        canvas { display: block; width: 420px; height: 420px; max-width: 100%; }
        .spin-btn { padding: 0.85rem 2.5rem; background: var(--admin-accent); color: #fff; border: none; border-radius: 10px; font-size: 1.05rem; font-weight: 700; cursor: pointer; transition: opacity 0.15s, transform 0.1s; }
        .spin-btn:hover:not(:disabled) { opacity: 0.85; transform: scale(1.04); }
        .spin-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .result-banner { background: rgba(200,146,42,0.12); border: 2px solid var(--admin-accent); border-radius: 14px; padding: 1.25rem 1.5rem; text-align: center; width: 100%; max-width: 420px; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        .result-emoji { font-size: 2rem; margin-bottom: 0.4rem; }
        .result-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--admin-muted); margin-bottom: 0.5rem; }
        .result-song { font-size: 1.35rem; font-weight: 700; color: var(--admin-text); margin-bottom: 0.2rem; }
        .result-movie { font-size: 0.82rem; color: var(--admin-muted); margin-bottom: 1.1rem; }
        .result-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
        .accept-btn { padding: 0.65rem 1.5rem; background: #22c55e; color: #fff; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: opacity 0.15s; }
        .accept-btn:hover:not(:disabled) { opacity: 0.85; }
        .accept-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .again-btn { padding: 0.65rem 1.1rem; background: none; border: 1px solid var(--admin-border); color: var(--admin-muted); border-radius: 8px; font-size: 0.9rem; cursor: pointer; }
        .again-btn:hover { color: var(--admin-text); border-color: var(--admin-text); }
        .sidebar { display: flex; flex-direction: column; gap: 1rem; }
        .panel { background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 10px; padding: 1rem 1.1rem; }
        .panel-title { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--admin-muted); margin-bottom: 0.8rem; font-weight: 600; }
        .stat-row { display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--admin-text); margin-bottom: 5px; }
        .stat-val { color: var(--admin-muted); font-size: 0.82rem; }
        .progress-bar { height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-top: 10px; }
        .progress-fill { height: 100%; background: var(--admin-accent); border-radius: 3px; transition: width 0.4s; }
        .live-chip { background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.4); border-radius: 8px; padding: 0.55rem 0.8rem; margin-bottom: 0.75rem; }
        .live-lbl { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.08em; color: #22c55e; margin-bottom: 2px; }
        .live-name { font-size: 0.88rem; color: var(--admin-text); font-weight: 600; }
        .song-list { list-style: none; padding: 0; margin: 0; max-height: 200px; overflow-y: auto; }
        .song-list li { font-size: 0.78rem; color: var(--admin-muted); padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.04); display: flex; align-items: center; gap: 7px; line-height: 1.3; }
        .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .danger-btn { width: 100%; padding: 0.45rem; background: none; border: 1px solid var(--admin-border); color: var(--admin-muted); border-radius: 6px; font-size: 0.78rem; cursor: pointer; transition: color 0.15s, border-color 0.15s; }
        .danger-btn:hover { color: #ef4444; border-color: #ef4444; }
        .toast { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); background: var(--admin-surface); color: var(--admin-text); border: 1px solid var(--admin-border); padding: 0.65rem 1.25rem; border-radius: 8px; font-size: 0.88rem; z-index: 999; white-space: nowrap; box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
        .all-done { text-align: center; padding: 3rem 2rem; }
        .all-done p { color: var(--admin-muted); margin-bottom: 1.5rem; }
        .not-started { text-align: center; padding: 3rem; }
        .not-started p { color: var(--admin-muted); margin-bottom: 1.5rem; font-size: 0.95rem; }
        .start-btn { padding: 0.85rem 2.5rem; background: #22c55e; color: #fff; border: none; border-radius: 10px; font-size: 1.05rem; font-weight: 700; cursor: pointer; }
        .start-btn:hover { opacity: 0.85; }
        /* Interludes tab */
        .interludes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
        .interlude-card { background: var(--admin-surface); border: 1px solid var(--admin-border); border-radius: 10px; padding: 1rem; transition: border-color 0.15s; }
        .interlude-card.playing { border-color: var(--admin-accent); }
        .interlude-card.done { opacity: 0.5; }
        .interlude-title { font-size: 0.88rem; font-weight: 600; color: var(--admin-text); margin-bottom: 2px; }
        .interlude-movie { font-size: 0.72rem; color: var(--admin-muted); margin-bottom: 0.75rem; }
        .interlude-audio { width: 100%; margin-bottom: 0.5rem; }
        .interlude-meta { display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--admin-muted); }
        .interlude-status { display: inline-block; font-size: 0.65rem; font-weight: 600; padding: 0.1rem 0.4rem; border-radius: 10px; margin-left: 4px; }
        .s-active { background: rgba(34,197,94,0.12); color: #22c55e; }
        .s-played { background: rgba(255,255,255,0.06); color: var(--admin-muted); }
        .s-current { background: rgba(200,146,42,0.15); color: #C8922A; }
        .public-link { display: inline-flex; align-items: center; gap: 6px; font-size: 0.82rem; color: var(--admin-accent); text-decoration: none; border: 1px solid rgba(200,146,42,0.3); padding: 0.35rem 0.75rem; border-radius: 6px; }
        .public-link:hover { background: rgba(200,146,42,0.08); }
        @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } canvas { width: 360px; height: 360px; } }
        @media (max-width: 480px) { .wrap { padding: 1rem; } canvas { width: 300px; height: 300px; } .interludes-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div className="wrap">
        {toast && <div className="toast">{toast}</div>}

        <div className="topbar">
          <h1>🎵 Guess the Song — Game Control</h1>
          <div className="top-actions">
            <a href="/game" target="_blank" rel="noreferrer" className="public-link">🎮 Open Game Page ↗</a>
            <Link href="/admin" className="back">← Admin</Link>
          </div>
        </div>

        {/* Status bar */}
        <div className="status-bar">
          <span className={`status-chip ${status === 'active' ? 'chip-active' : status === 'complete' ? 'chip-complete' : 'chip-idle'}`}>
            {status === 'active' ? '🟢 Active' : status === 'complete' ? '🏆 Complete' : '⚪ Idle'}
          </span>
          {allSongs.length > 0 && (
            <>
              <div className="status-progress">
                <div className="status-fill" style={{ width: `${spunPct}%` }} />
              </div>
              <span className="status-text">{played.length} / {allSongs.length} played</span>
            </>
          )}
          {currentSong && (
            <span style={{ fontSize: '0.8rem', color: 'var(--admin-text)', marginLeft: 'auto' }}>
              🔴 Live: <strong>{currentSong.songName}</strong>
            </span>
          )}
        </div>

        <div className="tabs">
          <button className={`tab${tab === 'wheel' ? ' active' : ''}`} onClick={() => setTab('wheel')}>🎡 Spin Wheel</button>
          <button className={`tab${tab === 'interludes' ? ' active' : ''}`} onClick={() => setTab('interludes')}>🎵 All Interludes ({allSongs.length})</button>
        </div>

        {/* WHEEL TAB */}
        {tab === 'wheel' && (
          <>
            {status === 'idle' && (
              <div className="not-started">
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎮</div>
                <p>No game session active. Start one to load all {allSongs.length} interludes into the wheel.</p>
                <button className="start-btn" onClick={startGame}>▶ Start Game Session</button>
              </div>
            )}

            {status === 'complete' && (
              <div className="all-done">
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
                <p>All {allSongs.length} songs have been played! Great game.</p>
                <button className="start-btn" onClick={startGame}>↺ Play Again</button>
              </div>
            )}

            {status === 'active' && remaining.length === 0 && (
              <div className="all-done">
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                <p>All songs have been spun! The game is wrapping up.</p>
                <button className="start-btn" onClick={startGame}>↺ New Round</button>
              </div>
            )}

            {status === 'active' && remaining.length > 0 && (
              <div className="layout">
                <div className="wheel-col">
                  <canvas ref={canvasRef} width={420} height={420} />

                  {pendingSong ? (
                    <div className="result-banner">
                      <div className="result-emoji">🎵</div>
                      <div className="result-label">Selected interlude</div>
                      <div className="result-song">{pendingSong.name}</div>
                      {pendingSong.movie && <div className="result-movie">🎬 {pendingSong.movie}</div>}
                      <div className="result-actions">
                        <button className="accept-btn" disabled={confirming} onClick={confirmSong}>
                          {confirming ? 'Going live…' : '✓ Go Live'}
                        </button>
                        <button className="again-btn" onClick={() => setPendingSong(null)}>↺ Spin Again</button>
                      </div>
                    </div>
                  ) : (
                    <button className="spin-btn" disabled={spinning} onClick={spin}>
                      {spinning ? '…Spinning' : '🎡 Spin!'}
                    </button>
                  )}
                </div>

                <div className="sidebar">
                  <div className="panel">
                    <div className="panel-title">Status</div>
                    {currentSong && (
                      <div className="live-chip">
                        <div className="live-lbl">🔴 Now Live</div>
                        <div className="live-name">{currentSong.songName}</div>
                        {currentSong.movieName && <div style={{ fontSize: '0.72rem', color: 'var(--admin-muted)' }}>🎬 {currentSong.movieName}</div>}
                        <button onClick={clearCurrent} style={{ marginTop: '6px', fontSize: '0.7rem', background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--admin-muted)', borderRadius: '5px', padding: '2px 8px', cursor: 'pointer' }}>
                          Clear from public
                        </button>
                      </div>
                    )}
                    <div className="stat-row">Remaining <span className="stat-val">{remaining.length} / {allSongs.length}</span></div>
                    <div className="stat-row">Played <span className="stat-val">{played.length}</span></div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${spunPct}%` }} /></div>
                  </div>

                  <div className="panel">
                    <div className="panel-title">On the wheel ({remaining.length})</div>
                    <ul className="song-list">
                      {wheelSongs.map((s, i) => (
                        <li key={s.id}>
                          <span className="dot" style={{ background: COLORS[i % COLORS.length] }} />
                          {s.songName}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {played.length > 0 && (
                    <div className="panel">
                      <div className="panel-title">Played ({played.length})</div>
                      <ul className="song-list">
                        {[...played].reverse().map(id => (
                          <li key={id}>
                            <span className="dot" style={{ background: '#5A9A5A' }} />
                            {songMap[id]?.songName || id}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button className="danger-btn" onClick={resetGame}>↺ Reset Game</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* INTERLUDES TAB */}
        {tab === 'interludes' && (
          <div className="interludes-grid">
            {allSongs.map(song => {
              const isPlaying = song.id === previewId;
              const isPlayed = played.includes(song.id);
              const isCurrent = song.id === currentId;
              return (
                <div key={song.id} className={`interlude-card${isPlaying ? ' playing' : ''}${isPlayed && !isCurrent ? ' done' : ''}`}>
                  <div className="interlude-title">
                    {song.songName}
                    {isCurrent && <span className="interlude-status s-current">🔴 Live</span>}
                    {isPlayed && !isCurrent && <span className="interlude-status s-played">✓ Played</span>}
                    {!isPlayed && status === 'active' && <span className="interlude-status s-active">In wheel</span>}
                  </div>
                  {song.movieName && <div className="interlude-movie">🎬 {song.movieName}</div>}
                  {song.interludeUrl && (
                    <audio
                      className="interlude-audio"
                      controls
                      preload="none"
                      onPlay={() => setPreviewId(song.id)}
                      onPause={() => setPreviewId(p => p === song.id ? null : p)}
                      src={song.interludeUrl}
                    />
                  )}
                  <div className="interlude-meta">
                    <span>⏱ {song.startTime}s – {song.endTime}s</span>
                    <span>{song.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
