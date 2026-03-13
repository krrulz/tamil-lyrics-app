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
  'poovukkellam-siragu':          'poovukkellam-siragu-song-lyrics',
  'poi-solla-koodadhu':           'poi-solla-koodathu-song-lyrics',
  'malare-mounama':               'malare-mounama-song-lyrics',
  'kaadhal-pisaase':              'kadhal-pisase-song-lyrics',
  'poo-vaasam':                   'poo-vaasam-song-lyrics',
  'thottu-thottu-pesum-sulthana': 'thottu-thottu-pesum-sulthana-song-lyrics',
  'azhagooril-poothavale':        'azhagooril-poothavale-song-lyrics',
  'kadhal-vandhaal-solli-anuppu': 'kadhal-vandhal-solli-anuppu-song-lyrics',
  'thaamarai-poovukkum':          'thaamarai-poovukkum-song-lyrics',
  'aasai-aasai':                  'aasai-aasai-ippozhudhu-song-lyrics',
  'appadi-podu':                  'appadi-podu-song-lyrics',
  'kaatrin-mozhi':                'kaatrin-mozhi-song-lyrics',
  'then-then':                    'then-then-song-lyrics',
  'neeya-pesiyadhu':              'neeya-pesiyadhu-song-lyrics',
  'kokkara-kokkara-ko':           'kokkara-kokkara-ko-song-lyrics',
  'aararo-aariraro':              'aararo-aariraro-song-lyrics',
  'devuda-devuda':                'devuda-devuda-song-lyrics',
  'ding-dong-kovil-mani':         'ding-dong-kovil-mani-song-lyrics',
  'koduva-meesai':                'koduva-meesai-song-lyrics',
  'konja-neram':                  'konja-neram-song-lyrics',
  'thaalatum-kaatre-vaa':         'thaalatum-kaatre-vaa-song-lyrics',
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

function extractTabContent(html, tabId) {
  // Matches <div id="English" class="tabcontent"> ... </div>
  // The closing </div> for these tabs appears before the next <div id= or before SONG DETAILS
  const pattern = new RegExp(
    `<div\\s[^>]*id=["']${tabId}["'][^>]*>([\\s\\S]*?)(?=<div\\s[^>]*id=["']|SONG DETAILS|<strong>"?${tabId.toUpperCase()})`,
    'i'
  );
  const match = html.match(pattern);
  if (!match) return null;
  const text = htmlToText(match[1]);
  return text.length > 30 ? text : null;
}

function extractPlainLyrics(html) {
  // Fallback: no tab system — lyrics are bare <p> tags in .lyric-text
  const sectionMatch = html.match(/<div[^>]*class="lyric-text[^"]*"[^>]*>([\s\S]*?)(?=<div class="scriptlesssocialsharing|Share this Lyrics|SONG DETAILS)/i);
  if (!sectionMatch) return null;

  let body = sectionMatch[1];

  // Remove ads and meta info blocks
  body = body
    .replace(/<div[^>]*id="ad-header"[\s\S]*?<\/div>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<ins[\s\S]*?<\/ins>/gi, '');

  // Skip metadata lines at the top (Song Details, Starring, Music, Singers etc.)
  const text = htmlToText(body);
  const lines = text.split('\n');
  const metaPattern = /^(Song Details|Starring:|Music:|Singer[s]?:|Lyricist:|Music Label:|Composer:|Penned by|Sung by)/i;

  const filtered = [];
  let pastMeta = false;
  for (const line of lines) {
    const t = line.trim();
    if (!t) { if (pastMeta) filtered.push(''); continue; }
    if (metaPattern.test(t)) continue;
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

  // Layout 1: tab system with <div id="English"> and <div id="Tamil">
  const hasTabs = /id=["']English["']/i.test(html);

  if (hasTabs) {
    const english = extractTabContent(html, 'English');
    const tamil   = extractTabContent(html, 'Tamil');
    console.log(`[scraper] tabs — english=${english ? english.length + ' chars' : 'null'}, tamil=${tamil ? tamil.length + ' chars' : 'null'}`);
    return { english, tamil };
  }

  // Layout 2: plain <p> tags, English only
  const english = extractPlainLyrics(html);
  console.log(`[scraper] plain — english=${english ? english.length + ' chars' : 'null'}`);
  return { english, tamil: null };
}
