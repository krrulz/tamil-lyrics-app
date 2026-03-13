// pages/api/lyrics.js
import { db } from '../../lib/firebase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { songId, lang } = req.query;
  if (!songId || !lang) return res.status(400).json({ error: 'Missing songId or lang' });

  try {
    const doc = await db.collection('songs').doc(songId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Song not found' });

    const data = doc.data();
    const lyrics = lang === 'tamil' ? data.tamilLyrics : data.englishLyrics;

    res.status(200).json({
      song: data.name,
      movie: data.movie || '',
      lang,
      lyrics: lyrics || 'Lyrics not available for this language.',
      status: lang === 'tamil' ? data.tamilStatus : data.englishStatus,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch lyrics' });
  }
}
