// lib/scraper.js
// Source: tamillyrics143.com — confirmed server-side fetchable, no Cloudflare
// URL pattern: tamillyrics143.com/lyrics/{song-slug}-song-lyrics/
// Also has Tamil script on many songs (confirmed via live test)

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Referer': 'https://tamillyrics143.com/',
};

function toSlug(name) {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');
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

// Fetch a page URL and return its HTML
async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch (err) {
    console.error('Fetch error:', url, err.message);
    return null;
  }
}

// Search tamillyrics143 for the song and get its URL
async function searchForSong(songName) {
  const query = encodeURIComponent(songName);
  const searchUrl = `https://tamillyrics143.com/?s=${query}`;
  const html = await fetchPage(searchUrl);
  if (!html) return null;

  // Extract first lyrics result link
  const match = html.match(/href="(https:\/\/tamillyrics143\.com\/lyrics\/[^"]+)"/i);
  return match ? match[1] : null;
}

// Extract both Tamil and English lyrics from a tamillyrics143 page
function extractLyrics(html) {
  if (!html) return { tamil: null, english: null };

  // Remove nav/header/footer/scripts
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '');

  // tamillyrics143 puts lyrics in .entry-content
  const contentMatch = clean.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]+)/i);
  if (!contentMatch) return { tamil: null, english: null };

  // Stop at sharing/comments section
  let content = contentMatch[1].split(/Share this Lyrics|Leave a Reply|class="sharedaddy/i)[0];

  const allText = cleanHtml(content);
  if (!allText || allText.length < 30) return { tamil: null, english: null };

  // Split lines into Tamil-script vs English-script
  const lines = allText.split('\n');
  const tamilLines = [];
  const englishLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      tamilLines.push('');
      englishLines.push('');
      continue;
    }
    if (/[\u0B80-\u0BFF]/.test(trimmed)) {
      tamilLines.push(trimmed);
    } else {
      // Skip "Song Details", "Starring:", "Music:", "Singers:", "Lyricist:" metadata lines
      if (/^(Song Details|Starring:|Music:|Singers?:|Lyricist:|Music Label:|Singer:|Composer:)/i.test(trimmed)) continue;
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

// Main: try direct URL first, fall back to search
export async function scrapeBothLyricsOptimised(songName) {
  // Attempt 1: direct slug URL
  const slug = toSlug(songName);
  const directUrl = `https://tamillyrics143.com/lyrics/${slug}-song-lyrics/`;
  let html = await fetchPage(directUrl);

  // Attempt 2: search if direct URL 404s or returns no content
  if (!html || html.length < 500) {
    console.log(`Direct URL failed for "${songName}", trying search...`);
    const foundUrl = await searchForSong(songName);
    if (foundUrl) {
      html = await fetchPage(foundUrl);
    }
  }

  return extractLyrics(html);
}

export async function scrapeTamilLyrics(songName) {
  const { tamil } = await scrapeBothLyricsOptimised(songName);
  return tamil;
}

export async function scrapeEnglishLyrics(songName) {
  const { english } = await scrapeBothLyricsOptimised(songName);
  return english;
}
