// pages/api/songs.js
import { fdb } from '../../lib/firebaseDb.js';
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const { q, limit = 20 } = req.query;
    const docs = await fdb.collection('songs').getAll();
    let songs = docs.map(d => ({ id: d.id, name: d.data()?.name || '', movie: d.data()?.movie || '' }));

    if (q?.trim()) {
      const qLow = q.toLowerCase();
      songs = songs.filter(s => s.name.toLowerCase().includes(qLow) || s.movie.toLowerCase().includes(qLow));
    }

    songs = songs.slice(0, parseInt(limit) || 20);
    res.json({ songs });
  } catch (err) {
    console.error('[/api/songs]', err);
    res.status(500).json({ error: err.message });
  }
}
