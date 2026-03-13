// lib/scraper.js
// Scrapes Tamil lyrics from deeplyrics.in and English from tamil2lyrics.com

export async function scrapeTamilLyrics(songName) {
  try {
    const query = encodeURIComponent(songName + ' lyrics');
    const searchUrl = `https://www.deeplyrics.in/?s=${query}`;
    
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LyricsBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();

    // Find first result link
    const linkMatch = html.match(/href="(https:\/\/www\.deeplyrics\.in\/[^"]+)"/);
    if (!linkMatch) return null;

    const songPage = await fetch(linkMatch[1], {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LyricsBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    const songHtml = await songPage.text();

    // Extract lyrics from the lyrics div
    const lyricsMatch = songHtml.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (!lyricsMatch) return null;

    // Clean HTML tags
    const rawLyrics = lyricsMatch[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#\d+;/g, '')
      .trim();

    return rawLyrics || null;
  } catch (err) {
    console.error('Tamil scrape error:', err.message);
    return null;
  }
}

export async function scrapeEnglishLyrics(songName) {
  try {
    const query = encodeURIComponent(songName);
    const searchUrl = `https://www.tamil2lyrics.com/?s=${query}`;

    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LyricsBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();

    const linkMatch = html.match(/href="(https:\/\/www\.tamil2lyrics\.com\/[^"]+lyrics[^"]+)"/i);
    if (!linkMatch) return null;

    const songPage = await fetch(linkMatch[1], {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LyricsBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    const songHtml = await songPage.text();

    const lyricsMatch = songHtml.match(/<div[^>]*class="[^"]*lyrics[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
      || songHtml.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (!lyricsMatch) return null;

    const rawLyrics = lyricsMatch[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#\d+;/g, '')
      .trim();

    return rawLyrics || null;
  } catch (err) {
    console.error('English scrape error:', err.message);
    return null;
  }
}
