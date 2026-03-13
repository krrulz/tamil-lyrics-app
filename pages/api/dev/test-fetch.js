import { scrapeBothLyricsOptimised } from '../../../lib/scraper';

export default async function handler(req, res) {
  const apiKey = req.headers['x-api-key'] || req.query.key;
  if (apiKey !== process.env.DEV_API_KEY) return res.status(401).end();

  const song = req.query.song || 'Devuda Devuda';

  try {
    const result = await scrapeBothLyricsOptimised(song);
    return res.status(200).json({
      song,
      tamil_length: result.tamil ? result.tamil.length : 0,
      english_length: result.english ? result.english.length : 0,
      tamil_preview: result.tamil ? result.tamil.slice(0, 300) : null,
      english_preview: result.english ? result.english.slice(0, 300) : null,
    });
  } catch (err) {
    return res.status(200).json({ error: err.message, stack: err.stack });
  }
}
