// pages/api/polls/index.js
import { fdb, db } from '../../../lib/firebaseDb.js';
import { requireAdmin } from '../../../lib/firebaseAdmin.js';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const user = await requireAdmin(req, res);
    if (!user) return;

    const { playlistId, title, description, expiresAt } = req.body || {};
    if (!playlistId) return res.status(400).json({ error: 'playlistId required' });

    const playlistDoc = await db.collection('playlists').doc(playlistId).get();
    if (!playlistDoc.exists) return res.status(404).json({ error: 'Playlist not found' });

    const songs = (playlistDoc.data().songs || []).map(s =>
      typeof s === 'string' ? { songId: s, order: 0 } : s
    );

    const pollId = await fdb.collection('polls').add({
      playlistId,
      title: title || playlistDoc.data().name || 'Poll',
      description: description || '',
      status: 'active',
      createdBy: user.email,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt || null,
      songs: songs.map(s => ({ songId: s.songId, votes: 0 })),
      totalVotes: 0,
    });

    return res.status(201).json({ success: true, pollId: pollId.id });
  }

  if (req.method === 'GET') {
    const user = await requireAdmin(req, res);
    if (!user) return;

    const docs = await fdb.collection('polls').getAll();
    const polls = docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    return res.json({ polls });
  }

  res.status(405).end();
}
