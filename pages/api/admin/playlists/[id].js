// pages/api/admin/playlists/[id].js
import { fdb } from '../../../../lib/firebaseDb.js';
import { requireAdmin } from '../../../../lib/firebaseAdmin.js';

export default async function handler(req, res) {
  try {
  const user = await requireAdmin(req, res);
  if (!user) return;

  const { id } = req.query;

  if (req.method === 'GET') {
    const doc = await fdb.collection('playlists').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    const data = doc.data();
    // Enrich songs with names
    const songs = await Promise.all(
      (data.songs || []).map(async (s) => {
        const sid = typeof s === 'string' ? s : s.songId;
        const songDoc = await fdb.collection('songs').doc(sid).get();
        return {
          songId: sid,
          order: typeof s === 'string' ? 0 : (s.order || 0),
          votes: typeof s === 'string' ? 0 : (s.votes || 0),
          name: songDoc.exists ? songDoc.data().name : sid,
          movie: songDoc.exists ? songDoc.data().movie || '' : '',
        };
      })
    );
    songs.sort((a, b) => a.order - b.order);
    return res.json({ id, ...data, songs });
  }

  if (req.method === 'PATCH') {
    const { name, songs, action } = req.body || {};

    if (action === 'reorder' && Array.isArray(songs)) {
      // songs = [{ songId, order, votes }]
      await fdb.collection('playlists').doc(id).update({ songs, updatedAt: new Date().toISOString() });
      return res.json({ success: true });
    }

    if (action === 'add-song') {
      const { songId } = req.body;
      if (!songId) return res.status(400).json({ error: 'songId required' });
      const doc = await fdb.collection('playlists').doc(id).get();
      const existing = doc.data()?.songs || [];
      if (existing.some(s => (typeof s === 'string' ? s : s.songId) === songId)) {
        return res.status(409).json({ error: 'Song already in playlist' });
      }
      const updated = [...existing, { songId, order: existing.length, votes: 0 }];
      await fdb.collection('playlists').doc(id).update({ songs: updated, updatedAt: new Date().toISOString() });
      return res.json({ success: true });
    }

    if (action === 'remove-song') {
      const { songId } = req.body;
      const doc = await fdb.collection('playlists').doc(id).get();
      const existing = doc.data()?.songs || [];
      const filtered = existing
        .filter(s => (typeof s === 'string' ? s : s.songId) !== songId)
        .map((s, i) => ({ ...(typeof s === 'string' ? { songId: s, votes: 0 } : s), order: i }));
      await fdb.collection('playlists').doc(id).update({ songs: filtered, updatedAt: new Date().toISOString() });
      return res.json({ success: true });
    }

    if (name) {
      await fdb.collection('playlists').doc(id).update({ name, updatedAt: new Date().toISOString() });
      return res.json({ success: true });
    }

    return res.status(400).json({ error: 'No valid update provided' });
  }

  if (req.method === 'DELETE') {
    await fdb.collection('playlists').doc(id).delete();
    return res.json({ success: true });
  }

  res.status(405).end();
  } catch (err) {
    console.error('[/api/admin/playlists/[id]]', err);
    res.status(500).json({ error: err.message });
  }
}
