// pages/api/dev/preview-lyrics.js
// Scrapes lyrics and returns for review WITHOUT saving to Firestore
import { scrapeBothLyricsOptimised } from '../../../lib/scraper';
import { fillMissingLyrics } from '../../../lib/transliterate';

export default async function handler(req, res) {
  const apiKey = req.headers['x-api-key'] || req.query.key;
  if (apiKey !== process.env.DEV_API_KEY) return res.status(401).json({ error: 'Unauthorized' });

  const { song, movie } = req.method === 'POST' ? req.body : req.query;
  if (!song) return res.status(400).json({ error: 'Provide song name' });

  try {
    console.log(`[preview] Scraping: "${song}"`);
    const scraped = await scrapeBothLyricsOptimised(song);
    const filled = await fillMissingLyrics(song, scraped.tamil, scraped.english);

    return res.status(200).json({
      song,
      movie: movie || '',
      found: !!(filled.english || filled.tamil),
      tamilLyrics: filled.tamil || '',
      englishLyrics: filled.english || '',
      tamilSource: filled.tamilSource,
      englishSource: filled.englishSource,
    });
  } catch (err) {
    console.error('[preview] ERROR:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
