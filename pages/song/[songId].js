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
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Tamil:wght@400;500;600;700&family=Lora:ital,wght@0,400;0,600;1,400;1,600&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
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
          color: var(--gold-light); text-decoration: none; font-size: 0.95rem;
          display: flex; align-items: center; gap: 0.4rem; opacity: 0.8; transition: opacity 0.15s;
        }
        .back-btn:hover { opacity: 1; }

        .container { max-width: 720px; margin: 0 auto; padding: 2.5rem 1.5rem 5rem; }

        /* Language chooser */
        .chooser { text-align: center; padding: 3rem 0 2rem; }
        .chooser-title {
          font-family: 'Lora', serif;
          font-size: clamp(1.7rem, 5vw, 2.4rem);
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--deep);
          letter-spacing: -0.01em;
        }
        .chooser-sub { color: var(--text-muted); font-size: 0.95rem; margin-bottom: 2.5rem; }
        .chooser-ornament { font-size: 1.1rem; color: var(--gold); letter-spacing: 0.5rem; margin-bottom: 2.5rem; }
        .lang-buttons { display: flex; gap: 1.25rem; justify-content: center; flex-wrap: wrap; }
        .lang-btn {
          padding: 1.4rem 2.8rem;
          border-radius: 12px;
          font-size: 1.05rem;
          font-weight: 500;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          border: 2px solid transparent;
          min-width: 170px;
          display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
        }
        .lang-btn:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(28,18,8,0.18); }
        .lang-btn-ta { background: var(--deep); color: var(--gold-light); border-color: var(--gold); }
        .lang-btn-en { background: var(--card-bg); color: var(--deep); border-color: var(--border); }
        .lang-btn-icon { font-size: 1.8rem; }
        .lang-btn-label { font-size: 0.78rem; opacity: 0.65; letter-spacing: 0.06em; text-transform: uppercase; }

        /* Lyrics header */
        .lyrics-header { margin-bottom: 1.75rem; }
        .lyrics-song-title {
          font-family: 'Lora', serif;
          font-size: clamp(1.7rem, 5vw, 2.4rem);
          font-weight: 600;
          color: var(--deep);
          margin-bottom: 0.4rem;
          letter-spacing: -0.01em;
          line-height: 1.2;
        }
        .lyrics-movie {
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          color: var(--text-muted);
          margin-bottom: 1rem;
          letter-spacing: 0.01em;
        }
        .lyrics-lang-bar { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .lang-toggle-btn {
          padding: 0.45rem 1.1rem; border-radius: 20px; font-size: 0.82rem;
          font-weight: 500; cursor: pointer; border: 1.5px solid; transition: all 0.15s;
          letter-spacing: 0.02em;
        }
        .lang-toggle-active { background: var(--deep); color: var(--gold-light); border-color: var(--gold); }
        .lang-toggle-inactive { background: var(--card-bg); color: var(--text-muted); border-color: var(--border); }
        .lang-toggle-inactive:hover { border-color: var(--gold); color: var(--deep); }

        .lyrics-divider { border: none; border-top: 1px solid var(--border); margin: 1.25rem 0 2rem; }

        /* Tamil lyrics */
        .lyrics-body {
          font-family: 'Noto Serif Tamil', serif;
          font-size: clamp(1.2rem, 3vw, 1.45rem);
          line-height: 2.2;
          color: var(--deep);
          white-space: pre-wrap;
          background: var(--card-bg);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 2.25rem 2rem;
          min-height: 200px;
          letter-spacing: 0.02em;
          word-spacing: 0.1em;
        }

        /* English transliteration */
        .lyrics-body.english {
          font-family: 'Lora', serif;
          font-size: clamp(1.1rem, 2.8vw, 1.3rem);
          font-style: italic;
          line-height: 2.15;
          letter-spacing: 0.01em;
          word-spacing: 0.05em;
        }

        .lyrics-loading {
          text-align: center; padding: 3rem; color: var(--text-muted);
          font-style: italic; font-size: 1rem;
        }
        .lyrics-source {
          display: inline-flex; align-items: center; gap: 0.3rem;
          font-size: 0.72rem; color: #A78BFA;
          background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.25);
          padding: 0.25rem 0.6rem; border-radius: 20px; margin-bottom: 1rem;
          letter-spacing: 0.04em;
        }
        .lyrics-na {
          font-style: italic; font-size: 1rem; color: var(--text-muted);
          padding: 2.5rem; text-align: center;
        }

        @media (max-width: 480px) {
          .container { padding: 1.75rem 1.1rem 4rem; }
          .lang-btn { min-width: 140px; padding: 1.1rem 1.75rem; }
          .lyrics-body { padding: 1.5rem 1.25rem; font-size: 1.15rem; line-height: 2.1; }
          .lyrics-body.english { font-size: 1.05rem; }
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
              <>
                {(lyrics.status === 'transliterated') && (
                  <div className="lyrics-source">✦ AI transliterated</div>
                )}
                {lyrics.lyrics && lyrics.lyrics !== 'Lyrics not available for this language.'
                  ? <pre className={`lyrics-body${selectedLang === 'english' ? ' english' : ''}`}>{lyrics.lyrics}</pre>
                  : <div className="lyrics-na">Lyrics not available in this language yet.</div>
              }</>
            )}
          </>
        )}
      </main>
    </>
  );
}
