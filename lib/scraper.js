// lib/scraper.js
// Tamil lyrics from deeplyrics.in, English from tamil2lyrics.com
// Strategy: use DuckDuckGo search to find exact URL, then fetch the page

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

// Convert song name to URL slug: "Kannaana Kanney" -> "kannaana-kanney"
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

// Search DuckDuckGo to find the actual URL on a target site
async function findUrlViaDDG(query, siteDomain) {
  try {
    const searchQuery = encodeURIComponent(`site:${siteDomain} ${query}`);
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${searchQuery}`, {
      headers: { ...HEADERS, 'Referer': 'https://duckduckgo.com/' },
      signal: AbortSignal.timeout(7000),
    });
    const html = await res.text();

    // Extract first matching result URL for the target domain
    const regex = new RegExp(`https?://(?:www\\.)?${siteDomain.replace('.', '\\.')}[^"&\\s]+`, 'i');
    const match = html.match(regex);
    return match ? match[0].replace(/&amp;/g, '&') : null;
  } catch (err) {
    console.error('DDG search error:', err.message);
    return null;
  }
}

export async function scrapeTamilLyrics(songName) {
  try {
    // Try direct URL first using slug pattern: deeplyrics.in/song/ta/SLUG
    const slug = toSlug(songName);
    const directUrl = `https://www.deeplyrics.in/song/ta/${slug}`;

    let html = null;
    let usedUrl = directUrl;

    // Attempt 1: direct slug URL
    try {
      const res = await fetch(directUrl, {
        headers: HEADERS,
        signal: AbortSignal.timeout(7000),
      });
      if (res.ok) {
        html = await res.text();
      }
    } catch (_) {}

    // Attempt 2: search DuckDuckGo for the page
    if (!html || html.includes('404') || html.includes('not found')) {
      usedUrl = await findUrlViaDDG(`${songName} tamil lyrics`, 'deeplyrics.in');
      if (usedUrl) {
        try {
          const res = await fetch(usedUrl, {
            headers: HEADERS,
            signal: AbortSignal.timeout(7000),
          });
          if (res.ok) html = await res.text();
        } catch (_) {}
      }
    }

    if (!html) return null;

    // Extract lyrics — deeplyrics puts lyrics in .entry-content or .lyrics-content
    // The lyrics are in <p> tags inside the content div, after the song info
    const contentMatch = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i)
      || html.match(/<div[^>]*class="[^"]*lyrics[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
      || html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]+)/i);

    if (!contentMatch) return null;

    let content = contentMatch[1];

    // Remove script/style blocks
    content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
    content = content.replace(/<style[\s\S]*?<\/style>/gi, '');

    const lyrics = cleanHtml(content);
    // Must have reasonable length to be actual lyrics
    return lyrics.length > 50 ? lyrics : null;
  } catch (err) {
    console.error('Tamil scrape error:', err.message);
    return null;
  }
}

export async function scrapeEnglishLyrics(songName) {
  try {
    // tamil2lyrics.com URL pattern: /lyrics/SONG-NAME-song-lyrics/
    const slug = toSlug(songName);
    const directUrl = `https://www.tamil2lyrics.com/lyrics/${slug}-song-lyrics/`;

    let html = null;

    // Attempt 1: direct URL
    try {
      const res = await fetch(directUrl, {
        headers: HEADERS,
        signal: AbortSignal.timeout(7000),
      });
      if (res.ok) {
        html = await res.text();
      }
    } catch (_) {}

    // Attempt 2: try without -song-lyrics suffix
    if (!html || html.includes('404')) {
      try {
        const altUrl = `https://www.tamil2lyrics.com/lyrics/${slug}/`;
        const res = await fetch(altUrl, {
          headers: HEADERS,
          signal: AbortSignal.timeout(7000),
        });
        if (res.ok) html = await res.text();
      } catch (_) {}
    }

    // Attempt 3: DuckDuckGo search
    if (!html || html.includes('404') || html.includes('Page not found')) {
      const foundUrl = await findUrlViaDDG(`${songName} song lyrics`, 'tamil2lyrics.com');
      if (foundUrl) {
        try {
          const res = await fetch(foundUrl, {
            headers: HEADERS,
            signal: AbortSignal.timeout(7000),
          });
          if (res.ok) html = await res.text();
        } catch (_) {}
      }
    }

    if (!html) return null;

    // tamil2lyrics.com puts lyrics in .entry-content
    // Each line is wrapped in <p> tags with "Male :" / "Female :" prefixes
    const contentMatch = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i)
      || html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]+)/i);

    if (!contentMatch) return null;

    let content = contentMatch[1];
    content = content.replace(/<script[\s\S]*?<\/script>/gi, '');
    content = content.replace(/<style[\s\S]*?<\/style>/gi, '');

    // Clean up "Male :" and "Female :" prefixes for cleaner display
    const lyrics = cleanHtml(content)
      .replace(/^(Male|Female|Both)\s*:\s*/gim, '')
      .trim();

    return lyrics.length > 50 ? lyrics : null;
  } catch (err) {
    console.error('English scrape error:', err.message);
    return null;
  }
}
