import { scrapeBothLyricsOptimised } from '../../../lib/scraper';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.DEV_API_KEY) return res.status(401).end();

  const { song } = req.body;
  if (!song) return res.status(400).json({ error: 'song required' });

  try {
    const result = await scrapeBothLyricsOptimised(song);
    const found = !!(result.tamil || result.english);
    return res.status(200).json({
      found,
      tamilLyrics: result.tamil || '',
      englishLyrics: result.english || '',
      tamilSource: result.tamil ? 'scraped' : null,
      englishSource: result.english ? 'scraped' : null,
    });
  } catch (err) {
    console.error('[preview-lyrics]', err.message);
    return res.status(200).json({ found: false, tamilLyrics: '', englishLyrics: '' });
  }
}
