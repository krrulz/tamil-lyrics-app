// pages/api/admin/playlists.js
import { db } from '../../../lib/firebaseDb.js';
import { requireAdmin } from '../../../lib/firebaseAdmin.js';

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export default async function handler(req, res) {
  const user = await requireAdmin(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const snap = await db.collection('playlists').get();
    const playlists = snap.docs.map(d => ({ id: d.id, ...d.data(), songs: d.data().songs || [] }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return res.json({ playlists });
  }

  if (req.method === 'POST') {
    const { name } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: 'name required' });
    const id = toSlug(name) + '-' + Date.now().toString(36);
    await db.collection('playlists').doc(id).set({
      name: name.trim(), songs: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: user.email,
    });
    return res.status(201).json({ id, name });
  }

  res.status(405).end();
}
