// pages/api/dev/add-topic.js
// Protected by DEV_API_KEY env variable
import { db } from '../../../lib/firebase';
import { scrapeTamilLyrics, scrapeEnglishLyrics } from '../../../lib/scraper';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Auth check
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.DEV_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { topicName, songs } = req.body;
  // songs = [{ name: "Kannaana Kanney", movie: "Viswasam" }, ...]

  if (!topicName || !Array.isArray(songs) || songs.length === 0) {
    return res.status(400).json({ error: 'topicName and songs[] required' });
  }

  try {
    const songIds = [];
    const results = [];

    for (const song of songs) {
      const songName = song.name;
      const songId = songName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

      // Check if already exists
      const existing = await db.collection('songs').doc(songId).get();

      if (!existing.exists) {
        // Scrape lyrics
        console.log(`Scraping: ${songName}`);
        const [tamilLyrics, englishLyrics] = await Promise.allSettled([
          scrapeTamilLyrics(songName),
          scrapeEnglishLyrics(songName),
        ]);

        const tamilText = tamilLyrics.status === 'fulfilled' ? tamilLyrics.value : null;
        const englishText = englishLyrics.status === 'fulfilled' ? englishLyrics.value : null;

        await db.collection('songs').doc(songId).set({
          name: songName,
          movie: song.movie || '',
          tamilLyrics: tamilText || '',
          englishLyrics: englishText || '',
          tamilStatus: tamilText ? 'found' : 'not_found',
          englishStatus: englishText ? 'found' : 'not_found',
          createdAt: new Date().toISOString(),
        });

        results.push({
          song: songName,
          tamilFound: !!tamilText,
          englishFound: !!englishText,
          new: true,
        });
      } else {
        results.push({ song: songName, new: false, message: 'Already exists' });
      }

      songIds.push(songId);
    }

    // Create or update the topic
    const topicId = topicName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const topicRef = db.collection('topics').doc(topicId);
    const topicDoc = await topicRef.get();

    if (topicDoc.exists) {
      // Merge song IDs
      const existing = topicDoc.data().songs || [];
      const merged = [...new Set([...existing, ...songIds])];
      await topicRef.update({ songs: merged, updatedAt: new Date().toISOString() });
    } else {
      await topicRef.set({
        name: topicName,
        songs: songIds,
        createdAt: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      topic: topicId,
      results,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
