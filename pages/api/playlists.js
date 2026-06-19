// pages/api/playlists.js — public endpoint, returns playlist names + songIds
import { fdb } from '../../lib/firebaseDb.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const docs = await fdb.collection('playlists').getAll();
    const playlists = docs
      .map(d => ({
        id: d.id,
        name: d.data()?.name || '',
        songIds: (d.data()?.songs || []).map(s => typeof s === 'string' ? s : s.songId),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json({ playlists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
