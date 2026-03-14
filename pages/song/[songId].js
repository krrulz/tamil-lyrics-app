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

  // Parse lyrics into segments with speaker labels
  // Handles formats from tamillyrics143.com:
  //   "Male : some line"  "Female : line"  "· Male :"  "ஆண் :"  "Chorus :"
  const parseLyrics = (text) => {
    if (!text) return [];
    const lines = text.split('\n');
    const segments = [];
    let currentSpeaker = null;
    let currentLines = [];

    // Matches speaker label at START of line, with optional bullet/bracket prefix
    // e.g.  "Male :"  "· Female :"  "[Chorus]"  "ஆண் :"  "Hero :"
    const SPEAKER_RE = /^[\s·•\-–]*\[?\s*(Male|Female|Chorus|Man|Woman|Both|Duet|Solo|All|Hero|Heroine|ஆண்|பெண்|இருவரும்|குழு)\s*[:\]–\-]?\s*$/i;
    // Also matches "Male : actual lyric text on same line"
    const SPEAKER_INLINE_RE = /^[\s·•\-–]*\[?\s*(Male|Female|Chorus|Man|Woman|Both|Duet|Solo|All|Hero|Heroine|ஆண்|பெண்|இருவரும்|குழு)\s*[:\]–\-]+\s+(.+)/i;

    const flush = () => {
      if (currentLines.length > 0) {
        segments.push({ speaker: currentSpeaker, lines: [...currentLines] });
        currentLines = [];
      }
    };

    for (const line of lines) {
      // Check for standalone label line (e.g. "Male :" alone)
      const standAlone = line.match(SPEAKER_RE);
      if (standAlone) {
        flush();
        currentSpeaker = standAlone[1].toLowerCase();
        continue;
      }
      // Check for inline label (e.g. "Male : Pon Ondru Kanden")
      const inline = line.match(SPEAKER_INLINE_RE);
      if (inline) {
        flush();
        currentSpeaker = inline[1].toLowerCase();
        currentLines.push(inline[2].trim());
        continue;
      }
      // Regular lyric line
      currentLines.push(line);
    }
    flush();
    return segments;
  };

  const getSpeakerStyle = (speaker) => {
    if (!speaker) return 'none';
    const s = speaker.toLowerCase();
    if (['male','man','ஆண்','hero'].includes(s)) return 'male';
    if (['female','woman','பெண்','heroine'].includes(s)) return 'female';
    if (['chorus','both','duet','all','இருவரும்','குழு','solo'].includes(s)) return 'chorus';
    return 'none';
  };

  const renderLyrics = (text, lang) => {
    const segments = parseLyrics(text);
    const hasSpeakers = segments.some(s => s.speaker !== null);

    if (!hasSpeakers) {
      return <pre className={`lyrics-body${lang === 'english' ? ' english' : ''}`}>{text}</pre>;
    }

    return (
      <div className={`lyrics-body parsed${lang === 'english' ? ' english' : ''}`}>
        {segments.map((seg, i) => {
          const style = getSpeakerStyle(seg.speaker);
          return (
            <div key={i} className={`lyric-segment seg-${style}`}>
              {seg.speaker && (
                <span className={`speaker-label lbl-${style}`}>
                  {style === 'male' ? '♂ Male' : style === 'female' ? '♀ Female' : style === 'chorus' ? '♪ Chorus' : seg.speaker}
                </span>
              )}
              <div className="seg-lines">
                {seg.lines.map((line, j) => (
                  <div key={j} className="lyric-line">{line || '\u00A0'}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>{songName || 'Song'} — Tamil Lyrics</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --cream: #FAF6EF; --deep: #1C1208; --gold: #C8922A;
          --gold-light: #E8B355; --card-bg: #FFF8EE;
          --border: #E8D5B0; --text-muted: #7A6645;
          /* Singer colours */
          --male-bg: #EEF4FF; --male-border: #93B4F8; --male-label: #1E4DB7;
          --female-bg: #FFF0F6; --female-border: #F4A0C0; --female-label: #B72160;
          --chorus-bg: #F3FFF0; --chorus-border: #7EC87A; --chorus-label: #276024;
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

        .container { max-width: 760px; margin: 0 auto; padding: 2.5rem 1.5rem 5rem; }

        /* Language chooser */
        .chooser { text-align: center; padding: 3rem 0 2rem; }
        .chooser-title {
          font-family: 'Inter', sans-serif; font-size: clamp(1.7rem, 5vw, 2.4rem);
          font-weight: 700; margin-bottom: 0.5rem; color: var(--deep); letter-spacing: -0.02em;
        }
        .chooser-sub { color: var(--text-muted); font-size: 0.95rem; margin-bottom: 2.5rem; }
        .chooser-ornament { font-size: 1.1rem; color: var(--gold); letter-spacing: 0.5rem; margin-bottom: 2.5rem; }
        .lang-buttons { display: flex; gap: 1.25rem; justify-content: center; flex-wrap: wrap; }
        .lang-btn {
          padding: 1.4rem 2.8rem; border-radius: 12px; font-size: 1.1rem; font-weight: 600;
          cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;
          border: 2px solid transparent; min-width: 170px;
          display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
        }
        .lang-btn:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(28,18,8,0.18); }
        .lang-btn-ta { background: var(--deep); color: var(--gold-light); border-color: var(--gold); }
        .lang-btn-en { background: var(--card-bg); color: var(--deep); border-color: var(--border); }
        .lang-btn-icon { font-size: 1.8rem; }
        .lang-btn-label { font-size: 0.75rem; opacity: 0.65; letter-spacing: 0.06em; text-transform: uppercase; font-weight: 400; }

        /* Lyrics header */
        .lyrics-header { margin-bottom: 1.5rem; }
        .lyrics-song-title {
          font-family: 'Inter', sans-serif; font-size: clamp(1.5rem, 4vw, 2rem);
          font-weight: 700; color: var(--deep); margin-bottom: 0.35rem;
          letter-spacing: -0.02em; line-height: 1.2;
        }
        .lyrics-movie { font-size: 0.88rem; color: var(--text-muted); margin-bottom: 1rem; }
        .lyrics-lang-bar { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 0.75rem; }
        .lang-toggle-btn {
          padding: 0.5rem 1.2rem; border-radius: 20px; font-size: 0.85rem;
          font-weight: 600; cursor: pointer; border: 1.5px solid; transition: all 0.15s;
        }
        .lang-toggle-active { background: var(--deep); color: var(--gold-light); border-color: var(--gold); }
        .lang-toggle-inactive { background: var(--card-bg); color: var(--text-muted); border-color: var(--border); }
        .lang-toggle-inactive:hover { border-color: var(--gold); color: var(--deep); }

        /* Colour legend */
        .legend { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 1rem; }
        .legend-item {
          display: flex; align-items: center; gap: 0.35rem;
          font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.7rem;
          border-radius: 20px; border: 1.5px solid;
        }
        .legend-male  { background: var(--male-bg);   color: var(--male-label);   border-color: var(--male-border); }
        .legend-female{ background: var(--female-bg); color: var(--female-label); border-color: var(--female-border); }
        .legend-chorus{ background: var(--chorus-bg); color: var(--chorus-label); border-color: var(--chorus-border); }

        .lyrics-divider { border: none; border-top: 1px solid var(--border); margin: 1rem 0 1.75rem; }

        /* Plain (no speaker labels) */
        .lyrics-body {
          font-family: 'Noto Sans Tamil', sans-serif;
          font-size: clamp(1.35rem, 3.2vw, 1.65rem); font-weight: 500;
          line-height: 2.4; color: #140E04; white-space: pre-wrap;
          background: #FFFDF7; border: 1.5px solid var(--border);
          border-radius: 14px; padding: 2rem 2rem; min-height: 200px;
          letter-spacing: 0.03em; word-spacing: 0.15em;
        }
        .lyrics-body.english {
          font-family: 'Inter', sans-serif;
          font-size: clamp(1.25rem, 3vw, 1.5rem); font-weight: 500;
          font-style: normal; line-height: 2.35;
        }

        /* Parsed with speaker segments */
        .lyrics-body.parsed {
          white-space: normal; display: flex; flex-direction: column; gap: 1.25rem;
        }
        .lyric-segment { border-radius: 10px; overflow: hidden; }
        .lyric-segment.seg-none { background: transparent; }

        .speaker-label {
          display: inline-block; font-size: 0.72rem; font-weight: 700;
          letter-spacing: 0.07em; text-transform: uppercase;
          padding: 0.2rem 0.7rem; border-radius: 4px 4px 0 0; margin-bottom: 0;
        }
        .lbl-male   { background: var(--male-border);   color: #fff; }
        .lbl-female { background: var(--female-border); color: #fff; }
        .lbl-chorus { background: var(--chorus-border); color: #fff; }

        .seg-lines { padding: 0.75rem 1.1rem 0.9rem; }
        .seg-male   .seg-lines { background: var(--male-bg);   border: 1.5px solid var(--male-border);   border-top: none; border-radius: 0 8px 8px 8px; }
        .seg-female .seg-lines { background: var(--female-bg); border: 1.5px solid var(--female-border); border-top: none; border-radius: 0 8px 8px 8px; }
        .seg-chorus .seg-lines { background: var(--chorus-bg); border: 1.5px solid var(--chorus-border); border-top: none; border-radius: 0 8px 8px 8px; }
        .seg-none   .seg-lines { background: #FFFDF7; border: 1.5px solid var(--border); border-radius: 8px; }

        .lyric-line {
          font-family: 'Noto Sans Tamil', sans-serif;
          font-size: clamp(1.3rem, 3vw, 1.6rem); font-weight: 500;
          line-height: 2.3; letter-spacing: 0.03em; word-spacing: 0.12em;
        }
        .lyrics-body.english .lyric-line {
          font-family: 'Inter', sans-serif;
          font-size: clamp(1.2rem, 2.8vw, 1.45rem); font-weight: 500; letter-spacing: 0.01em;
        }

        .lyrics-loading { text-align: center; padding: 3rem; color: var(--text-muted); font-size: 1rem; }
        .lyrics-source {
          display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.72rem;
          color: #A78BFA; background: rgba(167,139,250,0.1); border: 1px solid rgba(167,139,250,0.25);
          padding: 0.25rem 0.6rem; border-radius: 20px; margin-bottom: 1rem;
        }
        .lyrics-na { font-size: 1rem; color: var(--text-muted); padding: 2.5rem; text-align: center; }

        @media (max-width: 480px) {
          .container { padding: 1.5rem 1rem 4rem; }
          .lang-btn { min-width: 140px; padding: 1.1rem 1.5rem; }
          .lyric-line { font-size: 1.2rem; line-height: 2.2; }
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
                <button className={`lang-toggle-btn ${selectedLang==='tamil'?'lang-toggle-active':'lang-toggle-inactive'}`} onClick={() => chooseLang('tamil')}>தமிழ்</button>
                <button className={`lang-toggle-btn ${selectedLang==='english'?'lang-toggle-active':'lang-toggle-inactive'}`} onClick={() => chooseLang('english')}>English</button>
              </div>
              {lyrics?.lyrics && parseLyrics(lyrics.lyrics).some(s => s.speaker !== null) && (
                <div className="legend">
                  <span className="legend-item legend-male">♂ Male</span>
                  <span className="legend-item legend-female">♀ Female</span>
                  <span className="legend-item legend-chorus">♪ Chorus</span>
                </div>
              )}
            </div>
            <hr className="lyrics-divider" />

            {loading && <div className="lyrics-loading">Loading lyrics…</div>}
            {!loading && lyrics && (
              <>
                {lyrics.status === 'transliterated' && <div className="lyrics-source">✦ AI transliterated</div>}
                {lyrics.lyrics && lyrics.lyrics !== 'Lyrics not available for this language.'
                  ? renderLyrics(lyrics.lyrics, selectedLang)
                  : <div className="lyrics-na">Lyrics not available in this language yet.</div>
                }
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
