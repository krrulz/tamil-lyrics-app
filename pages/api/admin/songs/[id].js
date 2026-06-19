// pages/api/admin/songs/[id].js — get, update, delete a single song
import { fdb } from '../../../../lib/firebaseDb.js';
import { requireAdmin } from '../../../../lib/firebaseAdmin.js';

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
      const { name, movie, tamilLyrics, englishLyrics } = req.body || {};
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
