// pages/api/songs.js
import { db } from '../../lib/firebase.js';
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { q, limit = 20 } = req.query;
  const snap = await db.collection('songs').get();
  let songs = snap.docs.map(d => ({ id: d.id, name: d.data().name || '', movie: d.data().movie || '' }));

  if (q?.trim()) {
    const qLow = q.toLowerCase();
    songs = songs.filter(s => s.name.toLowerCase().includes(qLow) || s.movie.toLowerCase().includes(qLow));
  }

  songs = songs.slice(0, parseInt(limit) || 20);
  res.json({ songs });
}
