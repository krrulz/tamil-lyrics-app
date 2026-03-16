import { scrapeBothLyricsOptimised } from '../../../lib/scraper';

export default async function handler(req, res) {
  const apiKey = req.headers['x-api-key'] || req.query.key;
  if (apiKey !== process.env.DEV_API_KEY) return res.status(401).end();

  // Mode 1: ?slug=xxx — raw HTML preview (original)
  if (req.query.slug) {
    const slug = req.query.slug;
    const url = `https://tamillyrics143.com/lyrics/${slug}/`;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Referer': 'https://www.google.com/',
        },
        signal: AbortSignal.timeout(8000),
      });
      const body = await response.text();
      const start = body.indexOf('class="lyric-text');
      const end = body.indexOf('scriptlesssocialsharing', start);
      const lyricSection = start !== -1 ? body.slice(start, end !== -1 ? end : start + 3000) : 'NOT FOUND';
      return res.status(200).json({
        url, http_status: response.status, body_length: body.length,
        has_english_div: body.includes('id="English"'),
        lyric_section_preview: lyricSection.slice(0, 2000),
      });
    } catch (err) {
      return res.status(200).json({ error: err.message });
    }
  }

  // Mode 2: ?song=xxx — run the real scraper and show exactly what gets stored
  if (req.query.song) {
    try {
      const result = await scrapeBothLyricsOptimised(req.query.song);
      return res.status(200).json({
        song: req.query.song,
        tamil_length: result.tamil?.length ?? 0,
        english_length: result.english?.length ?? 0,
        // Show first 800 chars so we can see if Male: labels are present
        tamil_preview: result.tamil?.slice(0, 800) ?? null,
        english_preview: result.english?.slice(0, 800) ?? null,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: 'Provide ?slug=xxx or ?song=xxx' });
}
