// pages/api/admin/topics.js
import { db } from '../../../lib/firebaseDb.js';
import { requireAdmin } from '../../../lib/firebaseAdmin.js';
function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export default async function handler(req, res) {
  try {
  const user = await requireAdmin(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const snap = await db.collection('topics').get();
    const topics = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return res.json({ topics });
  }

  // Create topic from top N songs of a playlist
  if (req.method === 'POST') {
    const { name, playlistId, limit = 25, songs: manualSongs } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: 'name required' });

    let songIds = [];

    if (manualSongs) {
      // Manual song list provided (from topic builder drag-reorder)
      songIds = manualSongs;
    } else if (playlistId) {
      // Auto-populate from top N by votes
      const pDoc = await db.collection('playlists').doc(playlistId).get();
      if (!pDoc.exists) return res.status(404).json({ error: 'Playlist not found' });
      const songs = (pDoc.data().songs || [])
        .map(s => typeof s === 'string' ? { songId: s, votes: 0, order: 0 } : s)
        .sort((a, b) => (b.votes || 0) - (a.votes || 0) || (a.order || 0) - (b.order || 0));
      songIds = songs.slice(0, Math.min(limit, 50)).map(s => s.songId);
    }

    const topicId = toSlug(name);
    await db.collection('topics').doc(topicId).set({
      name: name.trim(),
      songs: songIds,
      playlistId: playlistId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.email,
    });

    return res.status(201).json({ id: topicId, name, songCount: songIds.length });
  }

  res.status(405).end();
  } catch (err) {
    console.error('[/api/admin/topics]', err);
    res.status(500).json({ error: err.message });
  }
}
