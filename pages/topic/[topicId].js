/* pages/topic/[topicId].js */
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function TopicPage() {
  const router = useRouter();
  const { topicId } = router.query;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [songFilter, setSongFilter] = useState('');
  const pollRef = useRef(null);

  const fetchData = (id) =>
    fetch(`/api/topic-songs?topicId=${id}`)
      .then(r => r.json())
      .catch(() => null);

  useEffect(() => {
    if (!topicId) return;
    fetchData(topicId).then(d => { setData(d); setLoading(false); });

    // Poll every 8 seconds so the page updates when admin confirms a wheel spin
    pollRef.current = setInterval(async () => {
      const d = await fetchData(topicId);
      if (d) setData(d);
    }, 8000);

    return () => clearInterval(pollRef.current);
  }, [topicId]);

  const wheelActive = data?.wheelActive && data?.songs?.length === 1;

  return (
    <>
      <Head>
        <title>{data?.topicName || 'Songs'} — Tamil Lyrics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --cream: #FAF6EF; --deep: #1C1208; --gold: #C8922A;
          --gold-light: #E8B355; --card-bg: #FFF8EE; --border: #E8D5B0; --text-muted: #7A6645;
        }
        body { background: var(--cream); color: var(--deep); font-family: 'Inter', sans-serif; min-height: 100vh; }

        .topbar { background: var(--deep); padding: 1rem 1.5rem; display: flex; align-items: center; gap: 1rem; border-bottom: 2px solid var(--gold); }
        .back-btn { color: var(--gold-light); text-decoration: none; font-size: 0.9rem; display: flex; align-items: center; gap: 0.4rem; opacity: 0.8; transition: opacity 0.15s; }
        .back-btn:hover { opacity: 1; }
        .topbar-title { font-family: 'Inter', sans-serif; font-size: 1.1rem; color: #FFF8EE; font-weight: 600; }

        .container { max-width: 700px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 0.3rem; }
        .page-title { font-family: 'Inter', sans-serif; font-size: clamp(1.7rem, 5vw, 2.3rem); font-weight: 700; color: var(--deep); letter-spacing: -0.02em; }
        .page-subtitle { font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.75rem; }

        .divider { border: none; border-top: 1px solid var(--border); margin-bottom: 1.5rem; }

        .songs-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .song-item {
          background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px;
          padding: 1rem 1.25rem; text-decoration: none; display: block;
          transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s; position: relative;
        }
        .song-item:hover { transform: translateX(4px); border-color: var(--gold); box-shadow: 0 4px 14px rgba(28,18,8,0.09); }
        .song-name { font-family: 'Inter', sans-serif; font-size: 1.05rem; color: var(--deep); font-weight: 600; margin-bottom: 0.25rem; }
        .song-movie { font-size: 0.8rem; color: var(--text-muted); }
        .song-badges { display: flex; gap: 0.4rem; margin-top: 0.5rem; flex-wrap: wrap; }
        .badge { font-size: 0.68rem; padding: 0.18rem 0.55rem; border-radius: 20px; font-weight: 500; letter-spacing: 0.04em; }
        .badge-ta { background: #FDF0D5; color: #8B5E0A; border: 1px solid #E8B355; }
        .badge-en { background: #E8F0FE; color: #1A4A8A; border: 1px solid #90B4F4; }
        .badge-na { background: #F5F5F5; color: #999; border: 1px solid #ddd; }
        .song-arrow { position: absolute; right: 1.25rem; top: 50%; transform: translateY(-50%); color: var(--gold); font-size: 1rem; }

        /* Wheel spotlight card */
        .wheel-song {
          background: linear-gradient(135deg, #FFF8EE 0%, #FDF0D0 100%);
          border: 2px solid var(--gold);
          border-radius: 14px;
          padding: 1.5rem 1.5rem 1.25rem;
          text-decoration: none;
          display: block;
          position: relative;
          box-shadow: 0 6px 24px rgba(200,146,42,0.18);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .wheel-song:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(200,146,42,0.25); }
        .wheel-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 0.72rem; font-weight: 600; color: var(--gold); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.75rem; }
        .wheel-song .song-name { font-size: 1.25rem; margin-bottom: 0.3rem; }
        .wheel-pulse { display: inline-block; width: 7px; height: 7px; background: var(--gold); border-radius: 50%; animation: pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.7)} }
        .wheel-note { font-size: 0.78rem; color: var(--text-muted); margin-top: 0.75rem; font-style: italic; }

        .loading { text-align: center; padding: 4rem 1rem; color: var(--text-muted); font-style: italic; }
        .empty { text-align: center; padding: 3rem 1rem; color: var(--text-muted); }
        @media (max-width: 768px) {
          .container { padding: 1.5rem 1rem 2.5rem; }
          .song-item { padding: 0.85rem 1rem; }
          .wheel-song { padding: 1.25rem 1.1rem; }
        }
        @media (max-width: 480px) {
          .song-arrow { display: none; }
          .page-title { font-size: 1.5rem; }
          .song-item { padding: 0.75rem 0.9rem; }
        }
        .filter-wrap { position: relative; margin-bottom: 1.25rem; }
        .filter-input { width: 100%; padding: 0.55rem 2.2rem 0.55rem 0.9rem; border-radius: 8px; border: 1px solid var(--border); background: var(--card-bg); color: var(--deep); font-size: 0.88rem; outline: none; font-family: inherit; transition: border-color 0.15s; }
        .filter-input:focus { border-color: var(--gold); }
        .filter-clear { position: absolute; right: 0.7rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 1rem; line-height: 1; padding: 0; }
        .filter-count { font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.75rem; }
      `}</style>

      <div className="topbar">
        <Link href="/" className="back-btn">← Back</Link>
        <span style={{color:'#4A3018',fontSize:'1rem'}}>|</span>
        <span className="topbar-title">Tamil Lyrics</span>
      </div>

      <main className="container">
        {loading && <div className="loading">Loading songs…</div>}
        {!loading && data && (
          <>
            <div className="page-header">
              <h1 className="page-title">{data.topicName}</h1>
            </div>

            {wheelActive ? (
              <>
                <p className="page-subtitle">Now singing</p>
                <hr className="divider" />
                {data.songs.map(song => (
                  <Link key={song.id} href={`/song/${song.id}`} className="wheel-song">
                    <div className="wheel-badge">
                      <span className="wheel-pulse" />
                      Now Singing
                    </div>
                    <div className="song-name">{song.name}</div>
                    {song.movie && <div className="song-movie">🎬 {song.movie}</div>}
                    <div className="song-badges">
                      {song.tamilAvailable ? <span className="badge badge-ta">தமிழ் ✓</span> : <span className="badge badge-na">தமிழ் —</span>}
                      {song.englishAvailable ? <span className="badge badge-en">English ✓</span> : <span className="badge badge-na">English —</span>}
                    </div>
                    <div className="wheel-note">Tap to view lyrics →</div>
                  </Link>
                ))}
              </>
            ) : (
              <>
                <p className="page-subtitle">{data.songs.length} song{data.songs.length !== 1 ? 's' : ''} in this collection</p>

                <div className="filter-wrap">
                  <input
                    className="filter-input"
                    type="text"
                    placeholder="Search in this collection…"
                    value={songFilter}
                    onChange={e => setSongFilter(e.target.value)}
                  />
                  {songFilter && (
                    <button className="filter-clear" onClick={() => setSongFilter('')} aria-label="Clear search">×</button>
                  )}
                </div>

                {(() => {
                  const filtered = songFilter.trim()
                    ? data.songs.filter(s =>
                        s.name.toLowerCase().includes(songFilter.toLowerCase()) ||
                        (s.movie || '').toLowerCase().includes(songFilter.toLowerCase())
                      )
                    : data.songs;
                  return (
                    <>
                      {songFilter.trim() && (
                        <p className="filter-count">{filtered.length} of {data.songs.length} songs match</p>
                      )}
                      <hr className="divider" />
                      {filtered.length === 0 && <div className="empty">No songs match your search.</div>}
                      <div className="songs-list">
                        {filtered.map(song => (
                          <Link key={song.id} href={`/song/${song.id}`} className="song-item">
                            <div className="song-name">{song.name}</div>
                            {song.movie && <div className="song-movie">🎬 {song.movie}</div>}
                            <div className="song-badges">
                              {song.tamilAvailable ? <span className="badge badge-ta">தமிழ் ✓</span> : <span className="badge badge-na">தமிழ் —</span>}
                              {song.englishAvailable ? <span className="badge badge-en">English ✓</span> : <span className="badge badge-na">English —</span>}
                            </div>
                            <span className="song-arrow">→</span>
                          </Link>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </>
        )}
        {!loading && !data && <div className="empty">Topic not found.</div>}
      </main>
    </>
  );
}
