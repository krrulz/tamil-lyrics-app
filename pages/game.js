import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const POLL_MS = 6000;

export default function GamePage() {
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef(null);
  const prevIdRef = useRef(null);

  async function fetchState() {
    try {
      const r = await fetch('/api/game');
      const data = await r.json();
      setGameState(data);

      // Auto-load new audio when song changes
      const newId = data?.currentInterlude?.id;
      if (newId && newId !== prevIdRef.current) {
        prevIdRef.current = newId;
        if (audioRef.current) {
          audioRef.current.load();
        }
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    fetchState();
    const iv = setInterval(fetchState, POLL_MS);
    return () => clearInterval(iv);
  }, []);

  const status = gameState?.status;
  const interlude = gameState?.currentInterlude;

  return (
    <>
      <Head>
        <title>Guess the Song — Tamil Lyrics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.logo}>🎵</div>
            <h1 style={styles.title}>Guess the Song</h1>
            <p style={styles.subtitle}>Listen to the interlude and name the Tamil song!</p>
          </div>

          {loading && (
            <div style={styles.statusBox}>
              <div style={styles.pulse}>Loading…</div>
            </div>
          )}

          {!loading && status === 'idle' && (
            <div style={styles.statusBox}>
              <div style={styles.idleIcon}>🎸</div>
              <p style={styles.statusText}>The game hasn't started yet.</p>
              <p style={styles.statusSub}>Hang tight — your host will kick things off shortly!</p>
            </div>
          )}

          {!loading && status === 'complete' && (
            <div style={styles.statusBox}>
              <div style={styles.idleIcon}>🏆</div>
              <p style={styles.statusText}>All songs played!</p>
              <p style={styles.statusSub}>Great game, everyone.</p>
            </div>
          )}

          {!loading && status === 'active' && !interlude && (
            <div style={styles.statusBox}>
              <div style={styles.pulsingDot} />
              <p style={styles.statusText}>Game is live — next song coming soon!</p>
              <p style={styles.statusSub}>Your host is picking the next interlude…</p>
            </div>
          )}

          {!loading && status === 'active' && interlude && (
            <div style={styles.playerSection}>
              <div style={styles.playerLabel}>
                <span style={styles.liveDot} />
                Now Playing — What song is this?
              </div>

              <div style={styles.playerWrap}>
                <audio
                  ref={audioRef}
                  controls
                  autoPlay
                  style={styles.audio}
                  key={interlude.id}
                >
                  <source src={interlude.url} type="audio/mpeg" />
                </audio>
              </div>

              <div style={styles.guessPrompt}>
                🤔 Listen carefully and shout your guess!
              </div>

              {gameState.total > 0 && (
                <div style={styles.progress}>
                  Song {gameState.played} of {gameState.total}
                  <div style={styles.progressBar}>
                    <div style={{ ...styles.progressFill, width: `${(gameState.played / gameState.total) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={styles.footer}>
            <span style={styles.footerDot} title="Auto-refreshing every 6 seconds" />
            Live · updates automatically
          </div>
        </div>

        <div style={styles.homeLink}>
          <Link href="/" style={styles.link}>← Tamil Lyrics</Link>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes pulseDot { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.5; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a12; }
        audio::-webkit-media-controls-panel { background: #1a1a2e; }
      `}</style>
    </>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0a0a12 0%, #141428 100%)',
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: '20px',
  },
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    padding: '40px',
    width: '100%',
    maxWidth: '520px',
    backdropFilter: 'blur(20px)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  logo: {
    fontSize: '56px',
    marginBottom: '12px',
    display: 'block',
  },
  title: {
    color: '#fff',
    fontSize: '28px',
    fontWeight: 700,
    marginBottom: '8px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
  },
  statusBox: {
    textAlign: 'center',
    padding: '32px 0',
  },
  idleIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  statusText: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  statusSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '14px',
  },
  pulse: {
    color: 'rgba(255,255,255,0.4)',
    animation: 'pulse 1.4s ease-in-out infinite',
  },
  pulsingDot: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: '#C8922A',
    margin: '0 auto 20px',
    animation: 'pulseDot 1.2s ease-in-out infinite',
  },
  playerSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  playerLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '13px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  liveDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#4CAF50',
    animation: 'pulseDot 1.2s ease-in-out infinite',
  },
  playerWrap: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '20px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  audio: {
    width: '100%',
    borderRadius: '8px',
  },
  guessPrompt: {
    textAlign: 'center',
    color: '#C8922A',
    fontWeight: 600,
    fontSize: '16px',
    padding: '12px',
    background: 'rgba(200,146,42,0.08)',
    borderRadius: '10px',
    border: '1px solid rgba(200,146,42,0.2)',
  },
  progress: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '12px',
    textAlign: 'center',
  },
  progressBar: {
    height: '4px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '2px',
    marginTop: '8px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#C8922A',
    borderRadius: '2px',
    transition: 'width 0.4s ease',
  },
  footer: {
    marginTop: '28px',
    textAlign: 'center',
    color: 'rgba(255,255,255,0.2)',
    fontSize: '11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  footerDot: {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#4CAF50',
    animation: 'pulseDot 2s ease-in-out infinite',
  },
  homeLink: {
    marginTop: '20px',
  },
  link: {
    color: 'rgba(255,255,255,0.3)',
    textDecoration: 'none',
    fontSize: '13px',
  },
};
