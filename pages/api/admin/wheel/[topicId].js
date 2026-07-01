// pages/api/admin/wheel/[topicId].js
import { fdb } from '../../../../lib/firebaseDb.js';
import { requireAdmin } from '../../../../lib/firebaseAdmin.js';

async function enrichSongs(ids) {
  if (!ids.length) return [];
  const docs = await Promise.all(ids.map(id => fdb.collection('songs').doc(id).get()));
  return docs.map(d => ({ id: d.id, name: d.exists ? d.data().name : d.id, movie: d.exists ? d.data().movie || '' : '' }));
}

export default async function handler(req, res) {
  try {
    const user = await requireAdmin(req, res);
    if (!user) return;
    const { topicId } = req.query;

    const topicDoc = await fdb.collection('topics').doc(topicId).get();
    if (!topicDoc.exists) return res.status(404).json({ error: 'Topic not found' });
    const data = topicDoc.data();
    const allIds = data.songs || [];

    if (req.method === 'GET') {
      const remaining = data.wheelRemaining ?? allIds;
      const spun = data.spunSongs || [];
      const curId = data.currentSong || null;

      const [wheelSongs, spunSongs, currentSong] = await Promise.all([
        enrichSongs(remaining),
        enrichSongs(spun),
        curId ? fdb.collection('songs').doc(curId).get().then(d => d.exists ? { id: d.id, name: d.data().name, movie: d.data().movie || '' } : null) : null,
      ]);

      return res.json({ topicName: data.name, wheelSongs, spunSongs, currentSong, totalSongs: allIds.length });
    }

    if (req.method === 'POST') {
      const { action, songId } = req.body || {};

      if (action === 'confirm') {
        if (!songId) return res.status(400).json({ error: 'songId required' });
        const remaining = (data.wheelRemaining ?? allIds).filter(id => id !== songId);
        const spun = [...(data.spunSongs || []), songId];
        const isComplete = remaining.length === 0;

        await fdb.collection('topics').doc(topicId).update({
          wheelRemaining: isComplete ? allIds : remaining,  // auto-reset pool
          spunSongs: isComplete ? [] : spun,
          currentSong: isComplete ? null : songId,          // null = show all songs
          wheelUpdatedAt: new Date().toISOString(),
        });
        return res.json({ success: true, isComplete });
      }

      if (action === 'reset') {
        await fdb.collection('topics').doc(topicId).update({
          wheelRemaining: allIds,
          spunSongs: [],
          currentSong: null,
          wheelUpdatedAt: new Date().toISOString(),
        });
        return res.json({ success: true });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    res.status(405).end();
  } catch (err) {
    console.error('[wheel]', err);
    res.status(500).json({ error: err.message });
  }
}
