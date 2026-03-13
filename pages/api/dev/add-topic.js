// pages/api/dev/add-topic.js
// Processes ONE song per call to stay within Vercel's 10s function limit.
// The developer portal calls this endpoint once per song in sequence.
import { db } from '../../../lib/firebase';
import { scrapeTamilLyrics, scrapeEnglishLyrics } from '../../../lib/scraper';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.DEV_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { topicName, song } = req.body;
  // song = { name: "Kannaana Kanney", movie: "Viswasam" }

  if (!topicName || !song || !song.name) {
    return res.status(400).json({ error: 'topicName and song { name, movie } required' });
  }

  try {
    const songId = song.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    // Check if already exists
    const existing = await db.collection('songs').doc(songId).get();
    let result;

    if (!existing.exists) {
      const [tamilResult, englishResult] = await Promise.allSettled([
        scrapeTamilLyrics(song.name),
        scrapeEnglishLyrics(song.name),
      ]);

      const tamilText = tamilResult.status === 'fulfilled' ? tamilResult.value : null;
      const englishText = englishResult.status === 'fulfilled' ? englishResult.value : null;

      await db.collection('songs').doc(songId).set({
        name: song.name,
        movie: song.movie || '',
        tamilLyrics: tamilText || '',
        englishLyrics: englishText || '',
        tamilStatus: tamilText ? 'found' : 'not_found',
        englishStatus: englishText ? 'found' : 'not_found',
        createdAt: new Date().toISOString(),
      });

      result = { song: song.name, tamilFound: !!tamilText, englishFound: !!englishText, new: true };
    } else {
      result = { song: song.name, new: false, message: 'Already exists' };
    }

    // Create or update the topic
    const topicId = topicName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const topicRef = db.collection('topics').doc(topicId);
    const topicDoc = await topicRef.get();

    if (topicDoc.exists) {
      const existingSongs = topicDoc.data().songs || [];
      if (!existingSongs.includes(songId)) {
        await topicRef.update({
          songs: [...existingSongs, songId],
          updatedAt: new Date().toISOString(),
        });
      }
    } else {
      await topicRef.set({
        name: topicName,
        songs: [songId],
        createdAt: new Date().toISOString(),
      });
    }

    res.status(200).json({ success: true, topic: topicId, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
