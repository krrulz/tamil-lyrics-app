// pages/admin/wheel/[topicId].js
import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAdminAuth } from '../../../lib/useAdmin.js';

const COLORS = [
  '#E05252','#E07A27','#D4A017','#5AA85A',
  '#3D9BE9','#8A5AE0','#D45294','#3DB8B8',
  '#E87070','#4CB8A8','#A050E8','#E8A050',
];

function truncate(str, max) {
  return str && str.length > max ? str.slice(0, max - 1) + '…' : (str || '');
}

export default function WheelPage() {
  const { auth, loading, apiFetch } = useAdminAuth();
  const router = useRouter();
  const { topicId } = router.query;

  const [wheelState, setWheelState] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [pendingSong, setPendingSong] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState('');

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

    // Wheel shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fillStyle = '#111';
    ctx.fill();
    ctx.restore();

    // Segments
    for (let i = 0; i < N; i++) {
      const startA = angle + i * segAngle - Math.PI / 2;
      const endA = angle + (i + 1) * segAngle - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startA, endA);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      const midA = startA + segAngle / 2;
      const textR = r * (N > 8 ? 0.64 : 0.60);
      const maxChars = N > 12 ? 8 : N > 8 ? 11 : 14;
      ctx.save();
      ctx.translate(cx + Math.cos(midA) * textR, cy + Math.sin(midA) * textR);
      ctx.rotate(midA + Math.PI / 2);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${N > 12 ? 9 : N > 8 ? 10 : 12}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = 3;
      ctx.fillText(truncate(songs[i].name, maxChars), 0, 0);
      ctx.restore();
    }

    // Outer gold ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = '#C8922A';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Center hub
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
    ctx.fillStyle = '#111';
    ctx.fill();
    ctx.strokeStyle = '#C8922A';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Pointer (triangle pointing down into wheel from top)
    ctx.beginPath();
    ctx.moveTo(cx, cy - r + 4);
    ctx.lineTo(cx - 12, cy - r - 18);
    ctx.lineTo(cx + 12, cy - r - 18);
    ctx.closePath();
    ctx.fillStyle = '#C8922A';
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, []);

  const load = useCallback(async () => {
    if (!auth || !topicId) return;
    const res = await apiFetch(`/api/admin/wheel/${topicId}`);
    if (!res.ok) return;
    const data = await res.json();
    setWheelState(data);
    songsRef.current = data.wheelSongs || [];
  }, [auth, topicId, apiFetch]);

  useEffect(() => { load(); }, [load]);

  // Redraw on state change (after canvas is in DOM)
  useEffect(() => {
    if (wheelState?.wheelSongs?.length) {
      drawWheel(wheelState.wheelSongs, angleRef.current);
    }
  }, [wheelState, drawWheel]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const spin = () => {
    const songs = songsRef.current;
    if (spinning || !songs.length) return;
    const N = songs.length;
    const segAngle = (2 * Math.PI) / N;

    // Pre-determine winner
    const winnerIdx = Math.floor(Math.random() * N);

    // Calculate rotation to land on winnerIdx at top (angle=0 from north)
    // Segment i center is at angle: currentAngle + i*segAngle + segAngle/2 (CCW from top)
    // We want: (startAngle + delta + winnerIdx*segAngle + segAngle/2) % 2PI = 0
    const startAngle = angleRef.current;
    const winnerCenter = (winnerIdx * segAngle + segAngle / 2 + startAngle) % (2 * Math.PI);
    const offset = (2 * Math.PI - winnerCenter) % (2 * Math.PI);
    const numSpins = 5 + Math.floor(Math.random() * 3);
    const totalDelta = numSpins * 2 * Math.PI + offset;
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
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        angleRef.current = endAngle;
        drawWheel(songs, endAngle);
        setSpinning(false);
        setPendingSong(songs[winnerIdx]);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const confirmSong = async () => {
    if (!pendingSong || confirming) return;
    setConfirming(true);
    const res = await apiFetch(`/api/admin/wheel/${topicId}`, {
      method: 'POST',
      body: JSON.stringify({ action: 'confirm', songId: pendingSong.id }),
    });
    const data = await res.json();
    if (res.ok) {
      setPendingSong(null);
      if (data.isComplete) {
        showToast('🎉 All songs spun! Wheel restarted. Public page now shows all songs.');
      } else {
        showToast(`✓ "${pendingSong.name}" is now live for the public!`);
      }
      angleRef.current = 0;
      await load();
    } else {
      showToast('⚠ ' + data.error);
    }
    setConfirming(false);
  };

  const resetWheel = async () => {
    if (!confirm('Reset wheel? This clears spin history and starts fresh.')) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setSpinning(false);
    setPendingSong(null);
    await apiFetch(`/api/admin/wheel/${topicId}`, {
      method: 'POST',
      body: JSON.stringify({ action: 'reset' }),
    });
    showToast('Wheel reset — starting fresh round');
    angleRef.current = 0;
    await load();
  };

  if (loading || !auth) return null;

  const songs = wheelState?.wheelSongs || [];
  const remaining = songs.length;
  const total = wheelState?.totalSongs || 0;
  const spun = wheelState?.spunSongs || [];
  const currentSong = wheelState?.currentSong;
  const spunPct = total > 0 ? (spun.length / total) * 100 : 0;

  return (
    <>
      <Head><title>{wheelState?.topicName ? `🎡 ${wheelState.topicName}` : 'Spin Wheel'} — Admin</title></Head>
      <style suppressHydrationWarning>{`
        body { background: var(--admin-bg); }
        .wrap { max-width: 1100px; margin: 0 auto; padding: 2rem; }
        .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.75rem; flex-wrap: wrap; gap: 10px; }
        .topbar h1 { color: var(--admin-text); font-size: 1.25rem; font-weight: 700; }
        .back { color: var(--admin-muted); text-decoration: none; font-size: 0.85rem; border: 1px solid var(--admin-border); padding: 0.35rem 0.75rem; border-radius: 6px; }
        .layout { display: grid; grid-template-columns: 1fr 280px; gap: 2rem; align-items: start; }
        .wheel-col { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
        canvas { display: block; width: 420px; height: 420px; max-width: 100%; }
        .spin-btn { padding: 0.85rem 2.5rem; background: var(--admin-accent); color: #fff; border: none; border-radius: 10px; font-size: 1.05rem; font-weight: 700; cursor: pointer; letter-spacing: 0.02em; transition: opacity 0.15s, transform 0.1s; }
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
        .reset-btn { width: 100%; padding: 0.45rem; background: none; border: 1px solid var(--admin-border); color: var(--admin-muted); border-radius: 6px; font-size: 0.78rem; cursor: pointer; transition: color 0.15s, border-color 0.15s; }
        .reset-btn:hover { color: #ef4444; border-color: #ef4444; }
        .toast { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); background: var(--admin-surface); color: var(--admin-text); border: 1px solid var(--admin-border); padding: 0.65rem 1.25rem; border-radius: 8px; font-size: 0.88rem; z-index: 999; white-space: nowrap; box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
        .all-done { text-align: center; padding: 3rem 2rem; }
        .all-done p { color: var(--admin-muted); margin-bottom: 1.5rem; font-size: 0.95rem; }
        .all-done-icon { font-size: 3rem; margin-bottom: 1rem; }
        @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } canvas { width: 360px; height: 360px; } }
        @media (max-width: 480px) { .wrap { padding: 1rem; } canvas { width: 300px; height: 300px; } .spin-btn { padding: 0.75rem 1.75rem; font-size: 0.95rem; } }
      `}</style>

      <div className="wrap">
        {toast && <div className="toast">{toast}</div>}
        <div className="topbar">
          <h1>🎡 {wheelState?.topicName || 'Spin Wheel'}</h1>
          <Link href="/admin/topics" className="back">← Back to Topics</Link>
        </div>

        {!wheelState && <div style={{ color: 'var(--admin-muted)', padding: '3rem', textAlign: 'center' }}>Loading…</div>}

        {wheelState && remaining === 0 && (
          <div className="all-done">
            <div className="all-done-icon">🎉</div>
            <p>All {total} songs have been spun! The public page is now showing all songs again.</p>
            <button className="spin-btn" onClick={resetWheel}>↺ Start a New Round</button>
          </div>
        )}

        {wheelState && remaining > 0 && (
          <div className="layout">
            <div className="wheel-col">
              <canvas ref={canvasRef} width={420} height={420} />

              {pendingSong ? (
                <div className="result-banner">
                  <div className="result-emoji">🎵</div>
                  <div className="result-label">Selected song</div>
                  <div className="result-song">{pendingSong.name}</div>
                  {pendingSong.movie && <div className="result-movie">🎬 {pendingSong.movie}</div>}
                  <div className="result-actions">
                    <button className="accept-btn" disabled={confirming} onClick={confirmSong}>
                      {confirming ? 'Going live…' : '✓ Accept — Go Live'}
                    </button>
                    <button className="again-btn" onClick={() => { setPendingSong(null); }}>
                      ↺ Spin Again
                    </button>
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
                    <div className="live-name">{currentSong.name}</div>
                    {currentSong.movie && <div style={{ fontSize: '0.72rem', color: 'var(--admin-muted)' }}>🎬 {currentSong.movie}</div>}
                  </div>
                )}
                <div className="stat-row">Remaining <span className="stat-val">{remaining} / {total}</span></div>
                <div className="stat-row">Spun <span className="stat-val">{spun.length}</span></div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${spunPct}%` }} />
                </div>
              </div>

              <div className="panel">
                <div className="panel-title">On the wheel ({remaining})</div>
                <ul className="song-list">
                  {songs.map((s, i) => (
                    <li key={s.id || i}>
                      <span className="dot" style={{ background: COLORS[i % COLORS.length] }} />
                      {s.name}
                    </li>
                  ))}
                </ul>
              </div>

              {spun.length > 0 && (
                <div className="panel">
                  <div className="panel-title">Already spun ({spun.length})</div>
                  <ul className="song-list">
                    {[...spun].reverse().map((s, i) => (
                      <li key={s.id || i}>
                        <span className="dot" style={{ background: '#5A9A5A' }} />
                        {s.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button className="reset-btn" onClick={resetWheel}>↺ Reset Wheel</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
