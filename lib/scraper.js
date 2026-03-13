// lib/scraper.js
// Source: tamillyrics143.com — confirmed fetchable, no Cloudflare
//
// ROOT CAUSE of previous failures:
// 1. Slug mismatches: "veedhiyil" vs site's "veethiyil" etc
// 2. Site search (?s=) is blocked server-side
// 3. DuckDuckGo fallback blocked from Vercel IPs
// 4. Wrong CSS selector (.entry-content doesn't exist on this site)
//
// FIX: Hardcoded URL map for known songs + robust HTML extraction

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const BASE = 'https://tamillyrics143.com/lyrics/';

// Pre-verified URL map — slug key is the normalised song name
// Format: normalised-song-name → confirmed tamillyrics143 slug
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

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) {
      console.log(`HTTP ${res.status} for ${url}`);
      return null;
    }
    const text = await res.text();
    if (text.length < 1000) {
      console.log(`Page too short (${text.length} bytes): ${url}`);
      return null;
    }
    return text;
  } catch (err) {
    console.error('fetchPage error:', url, err.message);
    return null;
  }
}

function extractLyrics(html) {
  if (!html) return { tamil: null, english: null };

  // Strip noise blocks
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '');

  // Lyrics live between the <h1> heading and the "Share this Lyrics" / "SONG DETAILS" section
  const afterH1Match = clean.match(/<h1[^>]*>[\s\S]*?<\/h1>([\s\S]+)/i);
  if (!afterH1Match) return { tamil: null, english: null };

  let body = afterH1Match[1];

  // Cut at sharing / details sections
  body = body.split(/Share this Lyrics|SONG DETAILS|Other Songs from|class="sharedaddy|id="respond/i)[0];

  // Convert to plain text
  const plain = body
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!plain || plain.length < 50) return { tamil: null, english: null };

  // Separate Tamil script lines from English transliteration lines
  const lines = plain.split('\n');
  const tamilLines = [];
  const englishLines = [];

  // Metadata patterns to skip
  const metaPattern = /^(Song Details|Starring:|Music:|Singer[s]?:|Lyricist:|Music Label:|Composer:|English$|தமிழ்$|in\s+\[|Sung by|Penned by)/i;

  for (const line of lines) {
    const t = line.trim();
    if (!t) { tamilLines.push(''); englishLines.push(''); continue; }
    if (metaPattern.test(t)) continue;
    if (/[\u0B80-\u0BFF]/.test(t)) {
      tamilLines.push(t);
    } else {
      englishLines.push(t);
    }
  }

  const tamil   = tamilLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const english = englishLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  return {
    tamil:   tamil.length   > 40 ? tamil   : null,
    english: english.length > 40 ? english : null,
  };
}

export async function scrapeBothLyricsOptimised(songName) {
  const key = toKey(songName);
  console.log(`Scraping: "${songName}" (key: ${key})`);

  // Step 1: Try known slug map
  let html = null;
  const knownSlug = KNOWN_SLUGS[key];
  if (knownSlug) {
    const url = `${BASE}${knownSlug}/`;
    console.log(`Using known URL: ${url}`);
    html = await fetchPage(url);
  }

  // Step 2: Try auto-generated slug as fallback for unknown songs
  if (!html) {
    const autoSlug = `${key}-song-lyrics`;
    const url = `${BASE}${autoSlug}/`;
    console.log(`Trying auto slug: ${url}`);
    html = await fetchPage(url);
  }

  if (!html) {
    console.log(`No page found for: "${songName}"`);
    return { tamil: null, english: null };
  }

  const result = extractLyrics(html);
  console.log(`Result for "${songName}": Tamil=${result.tamil ? 'YES' : 'NO'}, English=${result.english ? 'YES' : 'NO'}`);
  return result;
}

export async function scrapeTamilLyrics(songName) {
  const { tamil } = await scrapeBothLyricsOptimised(songName);
  return tamil;
}

export async function scrapeEnglishLyrics(songName) {
  const { english } = await scrapeBothLyricsOptimised(songName);
  return english;
}
