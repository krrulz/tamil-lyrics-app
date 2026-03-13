// lib/scraper.js
// Primary source: lyricsing.com — confirmed server-side fetchable, no Cloudflare blocking
// URL pattern: lyricsing.com/{movie-slug}/{song-slug}-song-lyrics.html
// Search: lyricsing.com/?s={query}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Referer': 'https://lyricsing.com/',
};

function toSlug(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
}

function cleanHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Step 1: Search lyricsing.com for the song URL
async function findLyricsingUrl(songName) {
  try {
    const query = encodeURIComponent(songName + ' tamil');
    const searchUrl = `https://lyricsing.com/?s=${query}`;
    const res = await fetch(searchUrl, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract first song result link
    const match = html.match(/href="(https:\/\/lyricsing\.com\/[^"]+song-lyrics[^"]+)"/i);
    return match ? match[1] : null;
  } catch (err) {
    console.error('lyricsing search error:', err.message);
    return null;
  }
}

// Step 2: Fetch the song page and extract lyrics by language
async function fetchLyricsingPage(url) {
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (err) {
    console.error('lyricsing fetch error:', err.message);
    return null;
  }
}

function extractLyricsFromPage(html) {
  if (!html) return { tamil: null, english: null };

  // Remove script/style/nav blocks first
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '');

  // lyricsing.com puts lyrics directly in .entry-content
  // The page has both English (transliteration) and Tamil script in the same block
  const contentMatch = clean.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]+?)<\/div>\s*(?:<div|<aside|<section)/i)
    || clean.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]+)/i);

  if (!contentMatch) return { tamil: null, english: null };

  const content = contentMatch[1];

  // Split into paragraphs/lines
  const lyricsRaw = cleanHtml(content);

  // Detect Tamil script characters (Unicode range \u0B80-\u0BFF)
  const lines = lyricsRaw.split('\n');
  const tamilLines = [];
  const englishLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { tamilLines.push(''); englishLines.push(''); continue; }
    // Check if line contains Tamil unicode characters
    if (/[\u0B80-\u0BFF]/.test(trimmed)) {
      tamilLines.push(trimmed);
    } else {
      englishLines.push(trimmed);
    }
  }

  const tamil = tamilLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const english = englishLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  return {
    tamil: tamil.length > 30 ? tamil : null,
    english: english.length > 30 ? english : null,
  };
}

// Main exported functions — both share a single fetch, split by language
async function scrapeBothLyrics(songName) {
  const url = await findLyricsingUrl(songName);
  if (!url) return { tamil: null, english: null };

  const html = await fetchLyricsingPage(url);
  return extractLyricsFromPage(html);
}

export async function scrapeTamilLyrics(songName) {
  const { tamil } = await scrapeBothLyrics(songName);
  return tamil;
}

export async function scrapeEnglishLyrics(songName) {
  const { english } = await scrapeBothLyrics(songName);
  return english;
}

// Optimised version: scrape both at once to save API calls (used in add-topic)
export async function scrapeBothLyricsOptimised(songName) {
  return await scrapeBothLyrics(songName);
}
