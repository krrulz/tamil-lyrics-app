// pages/api/admin/add-song.js
import { fdb } from '../../../lib/firebaseDb.js';
import { requireAdmin } from '../../../lib/firebaseAdmin.js';

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const user = await requireAdmin(req, res);
  if (!user) return;

  try {
    const { name, movie, tamilLyrics, englishLyrics, playlistId } = req.body || {};

    if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
    if (!playlistId?.trim()) return res.status(400).json({ error: 'playlistId is required' });

    const songId = slugify(name.trim());

    await fdb.collection('songs').doc(songId).set({
      name: name.trim(),
      movie: movie || '',
      tamilLyrics: tamilLyrics || '',
      englishLyrics: englishLyrics || '',
      tamilStatus: tamilLyrics ? 'manual' : 'not_found',
      englishStatus: englishLyrics ? 'manual' : 'not_found',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      addedManually: true,
    });

    const playlistDoc = await fdb.collection('playlists').doc(playlistId).get();
    if (!playlistDoc.exists) return res.status(404).json({ error: 'Playlist not found' });

    const existing = playlistDoc.data()?.songs || [];
    const updated = [...existing, { songId, order: existing.length, votes: 0, addedAt: new Date().toISOString() }];
    await fdb.collection('playlists').doc(playlistId).update({ songs: updated, updatedAt: new Date().toISOString() });

    return res.status(201).json({ success: true, songId });
  } catch (err) {
    console.error('[/api/admin/add-song]', err);
    return res.status(500).json({ error: err.message });
  }
}
