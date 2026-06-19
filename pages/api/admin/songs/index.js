// pages/api/admin/songs/index.js — list all songs with full data
import { fdb } from '../../../../lib/firebaseDb.js';
import { requireAdmin } from '../../../../lib/firebaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const user = await requireAdmin(req, res);
    if (!user) return;

    const docs = await fdb.collection('songs').getAll();
    const songs = docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    res.json({ songs });
  } catch (err) {
    console.error('[/api/admin/songs]', err);
    res.status(500).json({ error: err.message });
  }
}
