// pages/api/admin/songs/[id].js — get, update, delete a single song
import { fdb } from '../../../../lib/firebaseDb.js';
import { requireAdmin } from '../../../../lib/firebaseAdmin.js';
import { scrapeBothLyricsOptimised } from '../../../../lib/scraper.js';
import { fillMissingLyrics } from '../../../../lib/transliterate.js';

export default async function handler(req, res) {
  try {
    const user = await requireAdmin(req, res);
    if (!user) return;

    const { id } = req.query;

    if (req.method === 'GET') {
      const doc = await fdb.collection('songs').doc(id).get();
      if (!doc.exists) return res.status(404).json({ error: 'Not found' });
      return res.json({ id, ...doc.data() });
    }

    if (req.method === 'PATCH') {
      const { action, name, movie, tamilLyrics, englishLyrics } = req.body || {};

      if (action === 'refetch') {
        const doc = await fdb.collection('songs').doc(id).get();
        if (!doc.exists) return res.status(404).json({ error: 'Song not found' });
        const songName = name || doc.data().name;
        const songMovie = movie || doc.data().movie || '';
        const searchTerm = songMovie ? `${songName} ${songMovie}` : songName;

        const scraped = await scrapeBothLyricsOptimised(searchTerm);
        const filled = await fillMissingLyrics(songName, scraped.tamil, scraped.english);

        const update = {
          updatedAt: new Date().toISOString(),
          tamilLyrics: filled.tamil || '',
          englishLyrics: filled.english || '',
          tamilStatus: filled.tamil ? (filled.tamilSource || 'scraped') : 'not_found',
          englishStatus: filled.english ? (filled.englishSource || 'scraped') : 'not_found',
        };
        await fdb.collection('songs').doc(id).update(update);
        return res.json({
          success: true,
          tamilFound: !!filled.tamil,
          englishFound: !!filled.english,
          tamilSource: filled.tamilSource,
          englishSource: filled.englishSource,
          tamilLyrics: filled.tamil || '',
          englishLyrics: filled.english || '',
        });
      }

      const update = { updatedAt: new Date().toISOString() };
      if (name !== undefined) update.name = name;
      if (movie !== undefined) update.movie = movie;
      if (tamilLyrics !== undefined) {
        update.tamilLyrics = tamilLyrics;
        update.tamilStatus = tamilLyrics ? 'manual' : 'not_found';
      }
      if (englishLyrics !== undefined) {
        update.englishLyrics = englishLyrics;
        update.englishStatus = englishLyrics ? 'manual' : 'not_found';
      }
      await fdb.collection('songs').doc(id).update(update);
      return res.json({ success: true });
    }

    if (req.method === 'DELETE') {
      await fdb.collection('songs').doc(id).delete();
      return res.json({ success: true });
    }

    res.status(405).end();
  } catch (err) {
    console.error('[/api/admin/songs/[id]]', err);
    res.status(500).json({ error: err.message });
  }
}
