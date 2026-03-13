/* pages/song/[songId].js */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

export default function SongPage() {
  const router = useRouter();
  const { songId } = router.query;
  const [selectedLang, setSelectedLang] = useState(null); // null = chooser screen
  const [lyrics, setLyrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [songName, setSongName] = useState('');

  // Fetch song metadata first (no lang)
  useEffect(() => {
    if (!songId) return;
    fetch(`/api/lyrics?songId=${songId}&lang=tamil`)
      .then(r => r.json())
      .then(d => { if (d.song) setSongName(d.song); })
      .catch(() => {});
  }, [songId]);

  const chooseLang = async (lang) => {
    setSelectedLang(lang);
    setLoading(true);
    try {
      const res = await fetch(`/api/lyrics?songId=${songId}&lang=${lang}`);
      const data = await res.json();
      setLyrics(data);
    } catch (e) {
      setLyrics({ lyrics: 'Failed to load lyrics. Please try again.' });
    }
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>{songName || 'Song'} — Tamil Lyrics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Tamil:wght@400;500;700&family=Playfair+Display:ital,wght@0,700;1,400&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --cream: #FAF6EF; --deep: #1C1208; --gold: #C8922A;
          --gold-light: #E8B355; --card-bg: #FFF8EE;
          --border: #E8D5B0; --text-muted: #7A6645;
        }
        body { background: var(--cream); color: var(--deep); font-family: 'Inter', sans-serif; min-height: 100vh; }

        .topbar {
          background: var(--deep); padding: 1rem 1.5rem;
          display: flex; align-items: center; gap: 1rem;
          border-bottom: 2px solid var(--gold);
        }
        .back-btn {
          color: var(--gold-light); text-decoration: none; font-size: 0.9rem;
          display: flex; align-items: center; gap: 0.4rem; opacity: 0.8; transition: opacity 0.15s;
        }
        .back-btn:hover { opacity: 1; }

        .container { max-width: 680px; margin: 0 auto; padding: 2rem 1.25rem 4rem; }

        /* Language chooser */
        .chooser {
          text-align: center;
          padding: 2rem 0;
        }
        .chooser-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(1.5rem, 5vw, 2.2rem);
          margin-bottom: 0.4rem;
          color: var(--deep);
        }
        .chooser-sub { color: var(--text-muted); font-size: 0.85rem; margin-bottom: 2.5rem; }
        .chooser-ornament { font-size: 1.2rem; color: var(--gold); letter-spacing: 0.4rem; margin-bottom: 2rem; }
        .lang-buttons { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
        .lang-btn {
          padding: 1.2rem 2.5rem;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          border: 2px solid transparent;
          min-width: 160px;
          display: flex; flex-direction: column; align-items: center; gap: 0.35rem;
        }
        .lang-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(28,18,8,0.15); }
        .lang-btn-ta {
          background: var(--deep); color: var(--gold-light); border-color: var(--gold);
        }
        .lang-btn-en {
          background: var(--card-bg); color: var(--deep); border-color: var(--border);
        }
        .lang-btn-icon { font-size: 1.5rem; }
        .lang-btn-label { font-size: 0.75rem; opacity: 0.7; letter-spacing: 0.05em; }

        /* Lyrics display */
        .lyrics-header { margin-bottom: 1.5rem; }
        .lyrics-song-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(1.6rem, 5vw, 2.2rem);
          color: var(--deep); margin-bottom: 0.3rem;
        }
        .lyrics-movie { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.6rem; }
        .lyrics-lang-bar {
          display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;
        }
        .lang-toggle-btn {
          padding: 0.35rem 0.9rem; border-radius: 20px; font-size: 0.78rem;
          font-weight: 500; cursor: pointer; border: 1px solid; transition: all 0.15s;
        }
        .lang-toggle-active { background: var(--deep); color: var(--gold-light); border-color: var(--gold); }
        .lang-toggle-inactive { background: var(--card-bg); color: var(--text-muted); border-color: var(--border); }
        .lang-toggle-inactive:hover { border-color: var(--gold); color: var(--deep); }

        .lyrics-divider { border: none; border-top: 1px solid var(--border); margin: 1rem 0 1.5rem; }

        .lyrics-body {
          font-family: 'Noto Serif Tamil', serif;
          font-size: clamp(1rem, 2.5vw, 1.15rem);
          line-height: 1.95;
          color: var(--deep);
          white-space: pre-wrap;
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.75rem 1.5rem;
          min-height: 200px;
        }
        .lyrics-body.english {
          font-family: 'Playfair Display', serif;
          font-size: clamp(0.95rem, 2.5vw, 1.1rem);
          font-style: italic;
        }
        .lyrics-loading {
          text-align: center; padding: 3rem; color: var(--text-muted); font-style: italic;
        }
        .lyrics-na {
          text-align: center; padding: 2rem; color: var(--text-muted);
          font-style: italic; font-size: 0.9rem;
        }

        @media (max-width: 400px) {
          .lang-btn { min-width: 130px; padding: 1rem 1.5rem; }
        }
      `}</style>

      <div className="topbar">
        <Link href="/" className="back-btn">← Home</Link>
      </div>

      <main className="container">
        {/* Language Chooser */}
        {!selectedLang && (
          <div className="chooser">
            <h1 className="chooser-title">{songName || '...'}</h1>
            <p className="chooser-sub">Choose a language to view lyrics</p>
            <div className="chooser-ornament">✦ ✦ ✦</div>
            <div className="lang-buttons">
              <button className="lang-btn lang-btn-ta" onClick={() => chooseLang('tamil')}>
                <span className="lang-btn-icon">அ</span>
                <span>தமிழ்</span>
                <span className="lang-btn-label">Tamil Script</span>
              </button>
              <button className="lang-btn lang-btn-en" onClick={() => chooseLang('english')}>
                <span className="lang-btn-icon">A</span>
                <span>English</span>
                <span className="lang-btn-label">Transliteration</span>
              </button>
            </div>
          </div>
        )}

        {/* Lyrics View */}
        {selectedLang && (
          <>
            <div className="lyrics-header">
              <h1 className="lyrics-song-title">{lyrics?.song || songName}</h1>
              {lyrics?.movie && <p className="lyrics-movie">🎬 {lyrics.movie}</p>}
              <div className="lyrics-lang-bar">
                <button
                  className={`lang-toggle-btn ${selectedLang === 'tamil' ? 'lang-toggle-active' : 'lang-toggle-inactive'}`}
                  onClick={() => chooseLang('tamil')}
                >தமிழ்</button>
                <button
                  className={`lang-toggle-btn ${selectedLang === 'english' ? 'lang-toggle-active' : 'lang-toggle-inactive'}`}
                  onClick={() => chooseLang('english')}
                >English</button>
              </div>
            </div>
            <hr className="lyrics-divider" />

            {loading && <div className="lyrics-loading">Loading lyrics…</div>}
            {!loading && lyrics && (
              lyrics.lyrics && lyrics.lyrics !== 'Lyrics not available for this language.'
                ? <pre className={`lyrics-body${selectedLang === 'english' ? ' english' : ''}`}>{lyrics.lyrics}</pre>
                : <div className="lyrics-na">Lyrics not available in this language yet.</div>
            )}
          </>
        )}
      </main>
    </>
  );
}
