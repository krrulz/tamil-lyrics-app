// lib/scraper.js
// Source: tamillyrics143.com
// Strategy:
//   1. Try direct URL with generated slug
//   2. If that fails, use DuckDuckGo HTML search to find the real URL
//   3. Extract lyrics from raw page body (NOT .entry-content - that class doesn't exist here)
//   4. Split Tamil script vs English transliteration by Unicode range

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
};

function toSlug(name) {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');
}

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    // Confirm it's actually a lyrics page and not a 404/search page
    if (text.includes('Song Lyrics') && text.length > 3000) return text;
    return null;
  } catch (err) {
    console.error('fetchPage error:', url, err.message);
    return null;
  }
}

// Use DuckDuckGo HTML search to find the tamillyrics143 page URL
async function findViaDuckDuckGo(songName) {
  try {
    const query = encodeURIComponent(`site:tamillyrics143.com ${songName} song lyrics`);
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${query}`;
    const res = await fetch(ddgUrl, {
      headers: {
        ...HEADERS,
        'Referer': 'https://duckduckgo.com/',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract the first tamillyrics143.com/lyrics/ URL from results
    const match = html.match(/https?:\/\/tamillyrics143\.com\/lyrics\/[a-z0-9-]+\/?/i);
    return match ? match[0] : null;
  } catch (err) {
    console.error('DDG search error:', err.message);
    return null;
  }
}

// Extract lyrics content from a fetched tamillyrics143 page
// Lyrics sit directly in the page body between the h1 title and "Share this Lyrics"
function extractLyrics(html) {
  if (!html) return { tamil: null, english: null };

  // Strip scripts, styles, nav, header, footer, sidebar
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '');

  // Find the area between the song title h1 and the Share section
  const afterH1 = clean.split(/<h1[^>]*>/i)[1];
  if (!afterH1) return { tamil: null, english: null };

  // Cut off at sharing section or "Other Songs" section
  const lyricsSection = afterH1
    .split(/Share this Lyrics|Other Songs from|class="sharedaddy|SONG DETAILS/i)[0];

  // Convert HTML to plain text
  const plainText = lyricsSection
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!plainText || plainText.length < 30) return { tamil: null, english: null };

  // Split lines into Tamil script vs English transliteration
  const lines = plainText.split('\n');
  const tamilLines = [];
  const englishLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      tamilLines.push('');
      englishLines.push('');
      continue;
    }
    // Skip metadata lines
    if (/^(Song Details|Starring:|Music:|Singers?:|Lyricist:|Music Label:|Singer:|Composer:|English$|தமிழ்$)/i.test(trimmed)) continue;

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

export async function scrapeBothLyricsOptimised(songName) {
  let html = null;

  // Attempt 1: direct slug URL
  const slug = toSlug(songName);
  const directUrl = `https://tamillyrics143.com/lyrics/${slug}-song-lyrics/`;
  console.log(`Trying direct URL: ${directUrl}`);
  html = await fetchPage(directUrl);

  // Attempt 2: DuckDuckGo search to find correct URL
  if (!html) {
    console.log(`Direct URL failed for "${songName}", searching via DuckDuckGo...`);
    const foundUrl = await findViaDuckDuckGo(songName);
    if (foundUrl) {
      console.log(`Found via DDG: ${foundUrl}`);
      html = await fetchPage(foundUrl);
    }
  }

  if (!html) {
    console.log(`No page found for: ${songName}`);
    return { tamil: null, english: null };
  }

  const result = extractLyrics(html);
  console.log(`"${songName}" → Tamil: ${result.tamil ? 'found' : 'not found'}, English: ${result.english ? 'found' : 'not found'}`);
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
