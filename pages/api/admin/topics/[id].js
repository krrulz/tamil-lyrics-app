// pages/api/admin/topics/[id].js
import { db } from '../../../../lib/firebaseDb.js';
import { requireAdmin } from '../../../../lib/firebaseAdmin.js';

export default async function handler(req, res) {
  const user = await requireAdmin(req, res);
  if (!user) return;

  const { id } = req.query;

  if (req.method === 'GET') {
    const doc = await db.collection('topics').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    const data = doc.data();
    const songs = await Promise.all(
      (data.songs || []).map(async (sid, idx) => {
        const songDoc = await db.collection('songs').doc(sid).get();
        return { songId: sid, order: idx, name: songDoc.exists ? songDoc.data().name : sid, movie: songDoc.exists ? songDoc.data().movie || '' : '' };
      })
    );
    return res.json({ id, ...data, songs });
  }

  if (req.method === 'PATCH') {
    const { songs, name } = req.body || {};
    const update = { updatedAt: new Date().toISOString() };
    if (songs) update.songs = songs;
    if (name) update.name = name;
    await db.collection('topics').doc(id).update(update);
    return res.json({ success: true });
  }

  if (req.method === 'DELETE') {
    await db.collection('topics').doc(id).delete();
    return res.json({ success: true });
  }

  res.status(405).end();
}
