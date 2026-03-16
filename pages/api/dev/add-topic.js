// pages/api/dev/add-topic.js
import { db } from '../../../lib/firebase';
import { scrapeBothLyricsOptimised } from '../../../lib/scraper';
import { fillMissingLyrics } from '../../../lib/transliterate';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.DEV_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { topicName, song, forceRescrape } = req.body;
  if (!topicName || !song || !song.name) {
    return res.status(400).json({ error: 'topicName and song { name, movie } required' });
  }

  try {
    const songId = song.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    console.log(`[add-topic] Processing: "${song.name}" (id: ${songId})`);

    const existing = await db.collection('songs').doc(songId).get();
    const existingData = existing.exists ? existing.data() : null;

    // Re-scrape if: no doc, empty lyrics, or forceRescrape flag set
    const hasLyrics = existingData && (existingData.tamilLyrics || existingData.englishLyrics);
    let result;

    if (!hasLyrics || forceRescrape) {
      let tamilText = song.tamilLyrics || null;
      let englishText = song.englishLyrics || null;

      if (!tamilText && !englishText) {
        console.log(`[add-topic] Scraping: "${song.name}"`);
        const scraped = await scrapeBothLyricsOptimised(song.name);
        tamilText = scraped.tamil;
        englishText = scraped.english;
        console.log(`[add-topic] Scrape done — tamil=${tamilText ? tamilText.length + ' chars' : 'null'}, english=${englishText ? englishText.length + ' chars' : 'null'}`);
      }

      console.log(`[add-topic] Calling fillMissingLyrics`);
      const filled = await fillMissingLyrics(song.name, tamilText, englishText);
      tamilText = filled.tamil;
      englishText = filled.english;
      console.log(`[add-topic] After fill — tamilSource=${filled.tamilSource}, englishSource=${filled.englishSource}`);

      await db.collection('songs').doc(songId).set({
        name: song.name,
        movie: song.movie || existingData?.movie || '',
        tamilLyrics: tamilText || '',
        englishLyrics: englishText || '',
        tamilStatus: filled.tamilSource || (tamilText ? 'found' : 'not_found'),
        englishStatus: filled.englishSource || (englishText ? 'found' : 'not_found'),
        createdAt: existingData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log(`[add-topic] Saved to Firestore: ${songId}`);

      result = {
        song: song.name,
        new: !existing.exists,
        tamilFound: !!tamilText,
        englishFound: !!englishText,
        tamilSource: filled.tamilSource,
        englishSource: filled.englishSource,
        rescrape: !!forceRescrape,
      };
    } else {
      console.log(`[add-topic] Already has lyrics, skipping: ${songId}`);
      result = { song: song.name, new: false, message: 'Already has lyrics' };
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

    console.log(`[add-topic] Done: topic=${topicId}, result=${JSON.stringify(result)}`);
    res.status(200).json({ success: true, topic: topicId, result });
  } catch (err) {
    console.error(`[add-topic] ERROR: ${err.message}`, err.stack);
    res.status(500).json({ error: err.message });
  }
}
