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

function extractTabContent(html, tabId) {
  // Match <div id="English"> or <div id="Tamil"> and grab content until closing </div>
  const pattern = new RegExp(`<div\\s+id=["']${tabId}["'][^>]*>([\\s\\S]*?)</div>\\s*(?=<div|<p><strong>|<script|$)`, 'i');
  const match = html.match(pattern);
  if (!match) return null;

  const raw = match[1]
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

  return raw.length > 30 ? raw : null;
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

  const english = extractTabContent(html, 'English');
  const tamil   = extractTabContent(html, 'Tamil');

  console.log(`[scraper] english=${english ? english.length + ' chars' : 'null'}, tamil=${tamil ? tamil.length + ' chars' : 'null'}`);
  return { tamil, english };
}
