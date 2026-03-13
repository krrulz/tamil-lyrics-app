/* pages/topic/[topicId].js */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function TopicPage() {
  const router = useRouter();
  const { topicId } = router.query;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!topicId) return;
    fetch(`/api/topic-songs?topicId=${topicId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [topicId]);

  return (
    <>
      <Head>
        <title>{data?.topicName || 'Songs'} — Tamil Lyrics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Tamil:wght@400;600;700&family=Lora:ital,wght@0,600;1,400&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --cream: #FAF6EF; --deep: #1C1208; --gold: #C8922A;
          --gold-light: #E8B355; --rust: #8B3A1A;
          --card-bg: #FFF8EE; --border: #E8D5B0; --text-muted: #7A6645;
        }
        body { background: var(--cream); color: var(--deep); font-family: 'Inter', sans-serif; min-height: 100vh; }

        .topbar {
          background: var(--deep);
          padding: 1rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          border-bottom: 2px solid var(--gold);
        }
        .back-btn {
          color: var(--gold-light); text-decoration: none; font-size: 0.9rem;
          display: flex; align-items: center; gap: 0.4rem;
          opacity: 0.8; transition: opacity 0.15s;
        }
        .back-btn:hover { opacity: 1; }
        .topbar-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.3rem; color: #FFF8EE; font-weight: 700;
        }

        .container { max-width: 700px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
        .page-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(1.8rem, 5vw, 2.5rem);
          color: var(--deep); margin-bottom: 0.3rem;
        }
        .page-subtitle { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 2rem; letter-spacing: 0.05em; }

        .divider {
          border: none; border-top: 1px solid var(--border);
          margin-bottom: 1.5rem;
        }

        .songs-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .song-item {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 1rem 1.25rem;
          text-decoration: none;
          display: block;
          transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
          position: relative;
        }
        .song-item:hover { transform: translateX(4px); border-color: var(--gold); box-shadow: 0 4px 14px rgba(28,18,8,0.09); }
        .song-name {
          font-family: 'Playfair Display', serif;
          font-size: 1.1rem; color: var(--deep); font-weight: 600; margin-bottom: 0.25rem;
        }
        .song-movie { font-size: 0.8rem; color: var(--text-muted); }
        .song-badges { display: flex; gap: 0.4rem; margin-top: 0.5rem; flex-wrap: wrap; }
        .badge {
          font-size: 0.68rem; padding: 0.18rem 0.55rem; border-radius: 20px;
          font-weight: 500; letter-spacing: 0.04em;
        }
        .badge-ta { background: #FDF0D5; color: #8B5E0A; border: 1px solid #E8B355; }
        .badge-en { background: #E8F0FE; color: #1A4A8A; border: 1px solid #90B4F4; }
        .badge-na { background: #F5F5F5; color: #999; border: 1px solid #ddd; }
        .song-arrow {
          position: absolute; right: 1.25rem; top: 50%;
          transform: translateY(-50%);
          color: var(--gold); font-size: 1rem;
        }

        .loading { text-align: center; padding: 4rem 1rem; color: var(--text-muted); font-style: italic; }
        .empty { text-align: center; padding: 3rem 1rem; color: var(--text-muted); }

        @media (max-width: 480px) { .song-arrow { display: none; } }
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
            <h1 className="page-title">{data.topicName}</h1>
            <p className="page-subtitle">{data.songs.length} songs in this collection</p>
            <hr className="divider" />
            {data.songs.length === 0 && <div className="empty">No songs in this topic yet.</div>}
            <div className="songs-list">
              {data.songs.map(song => (
                <Link key={song.id} href={`/song/${song.id}`} className="song-item">
                  <div className="song-name">{song.name}</div>
                  {song.movie && <div className="song-movie">🎬 {song.movie}</div>}
                  <div className="song-badges">
                    {song.tamilAvailable
                      ? <span className="badge badge-ta">தமிழ் ✓</span>
                      : <span className="badge badge-na">தமிழ் —</span>}
                    {song.englishAvailable
                      ? <span className="badge badge-en">English ✓</span>
                      : <span className="badge badge-na">English —</span>}
                  </div>
                  <span className="song-arrow">→</span>
                </Link>
              ))}
            </div>
          </>
        )}
        {!loading && !data && <div className="empty">Topic not found.</div>}
      </main>
    </>
  );
}
