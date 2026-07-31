// pages/api/game.js
// Public endpoint — returns ONLY the current interlude URL (no song name revealed)
import { fdb } from '../../lib/firebaseDb.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const sessionDoc = await fdb.collection('gameSession').doc('session').get();
    if (!sessionDoc.exists) {
      return res.json({ status: 'idle', currentInterlude: null });
    }
    const session = sessionDoc.data();
    if (!session.currentId || session.status !== 'active') {
      return res.json({ status: session.status || 'idle', currentInterlude: null });
    }

    const interludeDoc = await fdb.collection('gameInterludes').doc(session.currentId).get();
    if (!interludeDoc.exists) {
      return res.json({ status: 'active', currentInterlude: null });
    }
    const d = interludeDoc.data();
    return res.json({
      status: 'active',
      currentInterlude: {
        id: session.currentId,
        url: d.interludeUrl,
        // deliberate: no songName or movieName — users must guess
      },
      played: session.played?.length || 0,
      total: (session.remaining?.length || 0) + (session.played?.length || 0),
      updatedAt: session.updatedAt,
    });
  } catch (err) {
    console.error('[game]', err);
    res.status(500).json({ error: err.message });
  }
}
