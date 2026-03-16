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
// Page has two tabs: English (default) and தமிழ்
// Speaker labels are in <strong>Male :</strong>, <strong>Female :</strong> etc.

function htmlToText_T2L(html) {
  return html
    // Convert bold speaker labels: <strong>Male :</strong> → "Male : "
    .replace(/<strong>\s*(Male|Female|Chorus|Man|Woman|Both|Duet|Solo|All|Hero|Heroine)\s*[:\-–]?\s*<\/strong>\s*[:\-–]?\s*/gi,
      (_, label) => `\n${label} : `)
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

function extractT2LTab(html, tabId) {
  // Tab divs: <div id="English" ...> or <div id="Tamil" ...>
  const marker = `id="${tabId}"`;
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const tagEnd = html.indexOf('>', start);
  if (tagEnd === -1) return null;

  const content = html.slice(tagEnd + 1);
  const stopPatterns = ['id="Tamil"', 'id="English"', 'class="wps-player', 'Share this Lyrics', 'sharedaddy'];
  let endIdx = content.length;
  for (const pat of stopPatterns) {
    const idx = content.indexOf(pat);
    if (idx !== -1 && idx < endIdx) endIdx = idx;
  }

  const text = htmlToText_T2L(content.slice(0, endIdx));
  // Strip metadata lines
  const lines = text.split('\n');
  const metaPattern = /^(Singers?\s*:|Music\s*(by|Director)\s*:|Lyricist\s*:|Music Label|Starring|Penned by|Sung by|Composer)/i;
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

async function scrapeT2L(songName) {
  const key = toKey(songName);
  const slug = `${key}-song-lyrics`;
  const url = `${BASE_T2L}${slug}/`;
  console.log(`[scraper] tamil2lyrics: ${url}`);

  const html = await fetchPage(url);
  if (!html) return { english: null, tamil: null };

  // Check if page has Tamil/English tabs
  const hasEnglishTab = html.includes('id="English"');
  const hasTamilTab   = html.includes('id="Tamil"');

  if (hasEnglishTab || hasTamilTab) {
    const english = hasEnglishTab ? extractT2LTab(html, 'English') : null;
    const tamil   = hasTamilTab   ? extractT2LTab(html, 'Tamil')   : null;
    console.log(`[scraper] T2L tabs — en=${english?.length ?? 0}, ta=${tamil?.length ?? 0}`);
    return { english, tamil };
  }

  // No tabs — extract full lyrics section (English only)
  const lyricsStart = html.indexOf('class="entry-content');
  if (lyricsStart === -1) return { english: null, tamil: null };
  const tagEnd = html.indexOf('>', lyricsStart);
  const content = html.slice(tagEnd + 1);
  const stopIdx = Math.min(
    ...[['sharedaddy','wps-player','post-tags'].map(p => { const i = content.indexOf(p); return i === -1 ? Infinity : i; })].flat()
  );
  const english = htmlToText_T2L(content.slice(0, stopIdx === Infinity ? 8000 : stopIdx));
  console.log(`[scraper] T2L no-tab — en=${english?.length ?? 0}`);
  return { english: english?.length > 30 ? english : null, tamil: null };
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
