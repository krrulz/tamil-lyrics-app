// lib/scraper.js
// Primary source: tamil2lyrics.com — has Male:/Female:/Chorus: labels + both Tamil & English tabs

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.google.com/',
};

const BASE_T2L  = 'https://www.tamil2lyrics.com/lyrics/';
const BASE_TL143 = 'https://tamillyrics143.com/lyrics/';

// Known slug overrides for tamillyrics143.com (fallback only)
const TL143_SLUGS = {
  'theradi-veedhiyil':            'theradi-veethiyil-song-lyrics',
  'poovukkellam-siragu':          'poovukellam-siragu-song-lyrics',
  'poi-solla-koodadhu':           'poi-solla-koodathu-song-lyrics',
  'malare-mounama':               'malare-mounama-song-lyrics',
  'kaadhal-pisaase':              'kadhal-pisase-song-lyrics',
  'poo-vaasam':                   'poo-vaasam-purappadum-song-lyrics',
  'thottu-thottu-pesum-sulthana': 'thottu-thottu-pesum-sultana-song-lyrics',
  'azhagooril-poothavale':        'azhagooril-poothavale-song-lyrics',
  'kadhal-vandhaal-solli-anuppu': 'kaadhal-vandhaal-song-lyrics',
  'thaamarai-poovukkum':          'thamarai-poovukum-song-lyrics',
  'aasai-aasai':                  'aasai-aasai-ippozhudhu-song-lyrics',
  'appadi-podu':                  'appadi-podu-song-lyrics',
  'kaatrin-mozhi':                'kaatrin-mozhi-song-lyrics',
  'then-then':                    'thaen-thaen-thaen-song-lyrics',
  'neeya-pesiyadhu':              'neeya-pesiyadhu-en-anbae-song-lyrics',
  'kokkara-kokkara-ko':           'kokkarakko-song-lyrics',
  'aararo-aariraro':              'aararo-aariraro-song-lyrics',
  'devuda-devuda':                'devuda-devuda-song-lyrics',
  'ding-dong-kovil-mani':         'ding-dong-kovil-mani-song-lyrics',
  'koduva-meesai':                'koduvaa-meesai-song-lyrics',
  'konja-neram':                  'konja-neram-song-lyrics',
  'thaalatum-kaatre-vaa':         'thalaattum-kaatre-vaa-song-lyrics',
  'yela-machi-machi':             'yela-machi-machi-song-lyrics',
};

function toKey(name) {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');
}

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > 1000 ? text : null;
  } catch (err) {
    console.error('fetchPage error:', url, err.message);
    return null;
  }
}

// ─── tamil2lyrics.com scraper ─────────────────────────────────────────────────
// Page structure: single .entry-content div with English lyrics first,
// then Tamil section marked by பாடகர்கள் : metadata line.
// Speaker labels are in <strong>Male :</strong>, <strong>Female :</strong> etc.
// Tamil speaker labels: <strong>ஆண் :</strong>, <strong>பெண் :</strong> etc.

function parseT2LPage(html) {
  const start = html.indexOf('class="entry-content');
  if (start === -1) return { english: null, tamil: null };
  const tagEnd = html.indexOf('>', start);
  const content = html.slice(tagEnd + 1);

  // Stop at related songs / comments
  const endMarkers = ['Other Songs from', 'sharedaddy', 'class="comments', 'id="comments', 'class="wps-player'];
  let endIdx = content.length;
  for (const m of endMarkers) {
    const i = content.indexOf(m);
    if (i !== -1 && i < endIdx) endIdx = i;
  }
  const body = content.slice(0, endIdx);

  // Mark up speaker labels and section boundaries before stripping HTML
  let processed = body
    // English speakers: <strong>Male :</strong> or <strong>Male:</strong>
    .replace(/<strong>\s*(Male|Female|Chorus|Man|Woman|Both|Duet|Solo|All|Hero|Heroine)\s*:?\s*<\/strong>\s*:?\s*/gi,
      (_, lbl) => `\n__SPK_ENG_${lbl.toUpperCase()}__\n`)
    // Tamil speakers: <strong>ஆண் :</strong> etc.
    .replace(/<strong>\s*(ஆண்|பெண்|இருவரும்|குழு)\s*:?\s*<\/strong>\s*:?\s*/g,
      (_, lbl) => `\n__SPK_TA_${lbl}__\n`)
    // Tamil metadata marks the start of the Tamil section
    .replace(/<strong>\s*(பாடகர்கள்|இசையமைப்பாளர்|பாடலாசிரியர்)[^<]*<\/strong>[^<]*/g, '\n__TAMILMETA__\n')
    // English metadata — skip
    .replace(/<strong>\s*(Singers?|Music\s*(by|Director)?|Lyricist|Penned by|Composer)[^<]*<\/strong>[^<]*/gi, '\n__ENGMETA__\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n').trim();

  const lines = processed.split('\n');
  const englishLines = [];
  const tamilLines = [];
  let inTamil = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (line === '__ENGMETA__') continue;
    if (line === '__TAMILMETA__') { inTamil = true; continue; }
    if (line === '') { (inTamil ? tamilLines : englishLines).push(''); continue; }

    if (line.startsWith('__SPK_ENG_')) {
      const lbl = line.replace('__SPK_ENG_', '').replace('__', '');
      const proper = lbl.charAt(0) + lbl.slice(1).toLowerCase();
      englishLines.push(`\n${proper} :`);
      continue;
    }
    if (line.startsWith('__SPK_TA_')) {
      const lbl = line.replace('__SPK_TA_', '').replace('__', '');
      tamilLines.push(`\n${lbl} :`);
      continue;
    }
    if (inTamil) tamilLines.push(line);
    else englishLines.push(line);
  }

  const clean = arr => arr.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const en = clean(englishLines);
  const ta = clean(tamilLines);
  return {
    english: en.length > 30 ? en : null,
    tamil:   ta.length > 30 ? ta : null,
  };
}

async function scrapeT2L(songName) {
  const key = toKey(songName);
  const slug = `${key}-song-lyrics`;
  const url = `${BASE_T2L}${slug}/`;
  console.log(`[scraper] tamil2lyrics: ${url}`);
  const html = await fetchPage(url);
  if (!html) return { english: null, tamil: null };
  const result = parseT2LPage(html);
  console.log(`[scraper] T2L parsed — en=${result.english?.length ?? 0}, ta=${result.tamil?.length ?? 0}`);
  return result;
}

// ─── tamillyrics143.com scraper (fallback) ────────────────────────────────────

function htmlToText(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractByTabDiv(html, tabId) {
  const start = html.indexOf(`id="${tabId}"`);
  if (start === -1) return null;
  const tagEnd = html.indexOf('>', start);
  if (tagEnd === -1) return null;
  const content = html.slice(tagEnd + 1);
  const stopPatterns = [`id="Tamil"`, `id="English"`, 'Share this Lyrics', 'SONG DETAILS', 'scriptlesssocialsharing'];
  let endIdx = content.length;
  for (const pat of stopPatterns) {
    const idx = content.indexOf(pat);
    if (idx !== -1 && idx < endIdx) endIdx = idx;
  }
  const text = htmlToText(content.slice(0, endIdx));
  return text.length > 30 ? text : null;
}

function extractPlainLyrics(html) {
  const start = html.indexOf('class="lyric-text');
  if (start === -1) return null;
  const tagEnd = html.indexOf('>', start);
  if (tagEnd === -1) return null;
  const content = html.slice(tagEnd + 1);
  const stopPatterns = ['Share this Lyrics', 'SONG DETAILS', 'scriptlesssocialsharing', 'perfmatters-lazy-youtube'];
  let endIdx = content.length;
  for (const pat of stopPatterns) {
    const idx = content.indexOf(pat);
    if (idx !== -1 && idx < endIdx) endIdx = idx;
  }
  let body = content.slice(0, endIdx);
  body = body.replace(/<div[^>]*id="ad-header"[\s\S]*?<\/div>/gi, '');
  body = body.replace(/<script[\s\S]*?<\/script>/gi, '');
  body = body.replace(/<ins[\s\S]*?<\/ins>/gi, '');
  const text = htmlToText(body);
  const lines = text.split('\n');
  const metaPattern = /^(Song Details|Starring|Music:|Singer|Lyricist|Music Label|Composer|Penned by|Sung by)/i;
  const filtered = [];
  let pastMeta = false;
  for (const line of lines) {
    const t = line.trim();
    if (!t) { if (pastMeta) filtered.push(''); continue; }
    if (!pastMeta && metaPattern.test(t)) continue;
    pastMeta = true;
    filtered.push(t);
  }
  const result = filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return result.length > 30 ? result : null;
}

async function scrapeTL143(songName) {
  const key = toKey(songName);
  const slug = TL143_SLUGS[key] || `${key}-song-lyrics`;
  const url = `${BASE_TL143}${slug}/`;
  console.log(`[scraper] tamillyrics143 fallback: ${url}`);
  const html = await fetchPage(url);
  if (!html) return { english: null, tamil: null };
  if (html.includes('id="English"')) {
    return {
      english: extractByTabDiv(html, 'English'),
      tamil:   extractByTabDiv(html, 'Tamil'),
    };
  }
  return { english: extractPlainLyrics(html), tamil: null };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function scrapeBothLyricsOptimised(songName) {
  // Try tamil2lyrics.com first (has Male:/Female: labels)
  const t2l = await scrapeT2L(songName);
  if (t2l.english || t2l.tamil) {
    console.log(`[scraper] Got from tamil2lyrics — en=${t2l.english?.length ?? 0}, ta=${t2l.tamil?.length ?? 0}`);
    return t2l;
  }

  // Fallback to tamillyrics143.com
  console.log(`[scraper] Falling back to tamillyrics143 for: ${songName}`);
  const tl = await scrapeTL143(songName);
  console.log(`[scraper] tamillyrics143 — en=${tl.english?.length ?? 0}, ta=${tl.tamil?.length ?? 0}`);
  return tl;
}
