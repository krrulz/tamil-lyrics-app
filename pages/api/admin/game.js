// pages/api/admin/game.js
// Admin game management: list interludes, control game session, spin wheel
import { fdb } from '../../../lib/firebaseDb.js';
import { requireAdmin } from '../../../lib/firebaseAdmin.js';

export default async function handler(req, res) {
  try {
    const user = await requireAdmin(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      const [interludes, sessionDoc] = await Promise.all([
        fdb.collection('gameInterludes').getAll(),
        fdb.collection('gameSession').doc('session').get(),
      ]);

      const songs = interludes
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.songName || '').localeCompare(b.songName || ''));

      const session = sessionDoc.exists ? sessionDoc.data() : { status: 'idle', currentId: null, remaining: [], played: [] };
      return res.json({ songs, session });
    }

    if (req.method === 'POST') {
      const { action, interludeId } = req.body || {};

      if (action === 'start') {
        const interludes = await fdb.collection('gameInterludes').getAll();
        const allIds = interludes.map(d => d.id).sort();
        await fdb.collection('gameSession').doc('session').set({
          status: 'active',
          currentId: null,
          remaining: allIds,
          played: [],
          updatedAt: new Date().toISOString(),
        });
        return res.json({ success: true, remaining: allIds.length });
      }

      if (action === 'confirm') {
        if (!interludeId) return res.status(400).json({ error: 'interludeId required' });
        const sessionDoc = await fdb.collection('gameSession').doc('session').get();
        if (!sessionDoc.exists) return res.status(400).json({ error: 'No active game session' });
        const s = sessionDoc.data();

        const remaining = (s.remaining || []).filter(id => id !== interludeId);
        const played = [...(s.played || []), interludeId];
        const isComplete = remaining.length === 0;

        await fdb.collection('gameSession').doc('session').set({
          status: isComplete ? 'complete' : 'active',
          currentId: isComplete ? null : interludeId,
          remaining: isComplete ? [] : remaining,
          played,
          updatedAt: new Date().toISOString(),
        });
        return res.json({ success: true, isComplete });
      }

      if (action === 'reset') {
        await fdb.collection('gameSession').doc('session').set({
          status: 'idle',
          currentId: null,
          remaining: [],
          played: [],
          updatedAt: new Date().toISOString(),
        });
        return res.json({ success: true });
      }

      if (action === 'clearCurrent') {
        const sessionDoc = await fdb.collection('gameSession').doc('session').get();
        if (!sessionDoc.exists) return res.status(400).json({ error: 'No session' });
        const s = sessionDoc.data();
        await fdb.collection('gameSession').doc('session').set({
          ...s,
          currentId: null,
          updatedAt: new Date().toISOString(),
        });
        return res.json({ success: true });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    res.status(405).end();
  } catch (err) {
    console.error('[admin/game]', err);
    res.status(500).json({ error: err.message });
  }
}
