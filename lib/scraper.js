// lib/scraper.js
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.google.com/',
};

const BASE = 'https://tamillyrics143.com/lyrics/';

const KNOWN_SLUGS = {
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
  // e.g. <div id="English" class="tabcontent">...</div>
  const start = html.indexOf(`id="${tabId}"`);
  if (start === -1) return null;

  // Find the opening tag's end
  const tagEnd = html.indexOf('>', start);
  if (tagEnd === -1) return null;

  // Find the closing </div> — look for next sibling div with id= or share section
  const content = html.slice(tagEnd + 1);
  const stopPatterns = [
    `id="Tamil"`, `id="English"`,
    'Share this Lyrics', 'SONG DETAILS',
    'scriptlesssocialsharing',
  ];

  let endIdx = content.length;
  for (const pat of stopPatterns) {
    const idx = content.indexOf(pat);
    if (idx !== -1 && idx < endIdx) endIdx = idx;
  }

  const text = htmlToText(content.slice(0, endIdx));
  return text.length > 30 ? text : null;
}

function extractPlainLyrics(html) {
  // Find lyric-text div start
  const start = html.indexOf('class="lyric-text');
  if (start === -1) return null;

  // Get everything after the lyric-text opening tag
  const tagEnd = html.indexOf('>', start);
  if (tagEnd === -1) return null;

  const content = html.slice(tagEnd + 1);

  // Cut at share/details section
  const stopPatterns = [
    'Share this Lyrics', 'SONG DETAILS',
    'scriptlesssocialsharing', 'perfmatters-lazy-youtube',
  ];

  let endIdx = content.length;
  for (const pat of stopPatterns) {
    const idx = content.indexOf(pat);
    if (idx !== -1 && idx < endIdx) endIdx = idx;
  }

  let body = content.slice(0, endIdx);

  // Remove ad blocks
  body = body.replace(/<div[^>]*id="ad-header"[\s\S]*?<\/div>/gi, '');
  body = body.replace(/<script[\s\S]*?<\/script>/gi, '');
  body = body.replace(/<ins[\s\S]*?<\/ins>/gi, '');

  const text = htmlToText(body);
  const lines = text.split('\n');

  // Skip metadata lines at the top
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

export async function scrapeBothLyricsOptimised(songName) {
  const key = toKey(songName);
  const slug = KNOWN_SLUGS[key] || `${key}-song-lyrics`;
  const url = `${BASE}${slug}/`;

  console.log(`[scraper] Fetching: ${url}`);
  const html = await fetchPage(url);

  if (!html) {
    console.log(`[scraper] No HTML for: ${songName}`);
    return { tamil: null, english: null };
  }

  // Layout 1: has <div id="English"> tab
  if (html.includes('id="English"')) {
    const english = extractByTabDiv(html, 'English');
    const tamil   = extractByTabDiv(html, 'Tamil');
    console.log(`[scraper] tab layout — english=${english?.length ?? 0}, tamil=${tamil?.length ?? 0}`);
    return { english, tamil };
  }

  // Layout 2: plain <p> tags only
  const english = extractPlainLyrics(html);
  console.log(`[scraper] plain layout — english=${english?.length ?? 0}`);
  return { english, tamil: null };
}
