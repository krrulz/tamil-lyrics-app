/* pages/index.js - End User Portal */
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/topics')
      .then(r => r.json())
      .then(d => { setTopics(d.topics || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <Head>
        <title>Tamil Lyrics — கவிதை தொகுப்பு</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Tamil:wght@400;600;700&family=Lora:ital,wght@0,600;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --cream: #FAF6EF;
          --deep: #1C1208;
          --gold: #C8922A;
          --gold-light: #E8B355;
          --rust: #8B3A1A;
          --card-bg: #FFF8EE;
          --border: #E8D5B0;
          --text-muted: #7A6645;
        }
        body { background: var(--cream); color: var(--deep); font-family: 'Inter', sans-serif; min-height: 100vh; }

        /* Header */
        .header {
          background: var(--deep);
          padding: 2.5rem 1.5rem 2rem;
          text-align: center;
          border-bottom: 3px solid var(--gold);
          position: relative;
          overflow: hidden;
        }
        .header::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 50% 0%, rgba(200,146,42,0.15) 0%, transparent 70%);
        }
        .header-kavi {
          font-family: 'Noto Serif Tamil', serif;
          font-size: clamp(1rem, 3vw, 1.3rem);
          color: var(--gold-light);
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
          position: relative;
        }
        .header-title {
          font-family: 'Lora', serif;
          font-size: clamp(2.2rem, 7vw, 4rem);
          color: #FFF8EE;
          line-height: 1.1;
          font-weight: 600;
          position: relative;
        }
        .header-title em {
          color: var(--gold);
          font-style: italic;
        }
        .header-sub {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-top: 0.75rem;
          font-weight: 300;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          position: relative;
        }

        /* Ornament */
        .ornament {
          text-align: center;
          font-size: 1.5rem;
          color: var(--gold);
          padding: 1.5rem 0 0.5rem;
          letter-spacing: 0.5rem;
        }

        /* Grid */
        .container { max-width: 900px; margin: 0 auto; padding: 0 1.25rem 3rem; }
        .section-label {
          font-size: 0.72rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: var(--text-muted);
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .topics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1.25rem;
        }
        .topic-card {
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem 1.25rem;
          text-decoration: none;
          display: block;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          position: relative;
          overflow: hidden;
        }
        .topic-card::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--gold), var(--gold-light));
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.22s ease;
        }
        .topic-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(28,18,8,0.12); border-color: var(--gold); }
        .topic-card:hover::after { transform: scaleX(1); }

        .card-icon { font-size: 2rem; margin-bottom: 0.75rem; }
        .card-name {
          font-family: 'Lora', serif;
          font-size: 1.2rem;
          color: var(--deep);
          font-weight: 600;
          margin-bottom: 0.3rem;
          line-height: 1.3;
        }
        .card-count {
          font-size: 0.78rem;
          color: var(--text-muted);
          font-weight: 400;
        }
        .card-arrow {
          position: absolute;
          right: 1.25rem; top: 50%;
          transform: translateY(-50%);
          font-size: 1.2rem;
          color: var(--gold);
          opacity: 0;
          transition: opacity 0.18s, right 0.18s;
        }
        .topic-card:hover .card-arrow { opacity: 1; right: 1rem; }

        /* Empty */
        .empty {
          text-align: center;
          padding: 4rem 1rem;
          color: var(--text-muted);
        }
        .empty-icon { font-size: 3rem; margin-bottom: 1rem; }

        /* Loading */
        .loading {
          text-align: center; padding: 4rem 1rem;
          color: var(--text-muted);
          font-style: italic;
        }

        /* Footer */
        footer {
          text-align: center;
          padding: 1.5rem;
          font-size: 0.75rem;
          color: var(--text-muted);
          border-top: 1px solid var(--border);
        }

        @media (max-width: 480px) {
          .topics-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <header className="header">
        <p className="header-kavi">கவிதை தொகுப்பு</p>
        <h1 className="header-title">Tamil <em>Lyrics</em></h1>
        <p className="header-sub">Songs of Cinema · தமிழ் பாடல்கள்</p>
      </header>

      <main className="container">
        <div className="ornament">✦ ✦ ✦</div>
        <p className="section-label">Browse by Topic</p>

        {loading && <div className="loading">Loading collections…</div>}

        {!loading && topics.length === 0 && (
          <div className="empty">
            <div className="empty-icon">🎵</div>
            <p>No topics yet. Check back soon!</p>
          </div>
        )}

        {!loading && topics.length > 0 && (
          <div className="topics-grid">
            {topics.map((topic, i) => {
              const icons = ['🌸', '🎶', '🌙', '🔥', '💫', '🌊', '🕊️', '🌿'];
              return (
                <Link key={topic.id} href={`/topic/${topic.id}`} className="topic-card">
                  <div className="card-icon">{icons[i % icons.length]}</div>
                  <div className="card-name">{topic.name}</div>
                  <div className="card-count">{(topic.songs || []).length} songs</div>
                  <span className="card-arrow">→</span>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <footer>
        <p>Tamil Lyrics Archive · தமிழ் பாடல் தொகுப்பு</p>
      </footer>
    </>
  );
}
