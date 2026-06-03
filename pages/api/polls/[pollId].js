// pages/api/polls/[pollId].js
import { fdb } from '../../../lib/firebaseDb.js';
import { requireAdmin } from '../../../lib/firebaseAdmin.js';

export default async function handler(req, res) {
  try {
  const { pollId } = req.query;

  // ── GET: public — fetch poll + song names ──────────────────────────────────
  if (req.method === 'GET') {
    const pollDoc = await fdb.collection('polls').doc(pollId).get();
    if (!pollDoc.exists) return res.status(404).json({ error: 'Poll not found' });
    const poll = pollDoc.data();
    if (poll.status !== 'active') return res.status(410).json({ error: 'Poll is closed', status: poll.status });

    // Enrich songs with names from songs collection
    const enriched = await Promise.all(
      (poll.songs || []).map(async s => {
        const songDoc = await fdb.collection('songs').doc(s.songId).get();
        return {
          songId: s.songId,
          votes: s.votes || 0,
          name: songDoc.exists ? songDoc.data().name : s.songId,
          movie: songDoc.exists ? songDoc.data().movie || '' : '',
        };
      })
    );

    return res.json({
      id: pollId,
      title: poll.title,
      description: poll.description,
      status: poll.status,
      totalVotes: poll.totalVotes || 0,
      songs: enriched.sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    });
  }

  // ── PATCH: admin — close poll, push vote counts to playlist ───────────────
  if (req.method === 'PATCH') {
    const user = await requireAdmin(req, res);
    if (!user) return;

    const { action } = req.body || {};
    if (action !== 'close') return res.status(400).json({ error: 'action must be close' });

    const pollDoc = await fdb.collection('polls').doc(pollId).get();
    if (!pollDoc.exists) return res.status(404).json({ error: 'Poll not found' });
    const poll = pollDoc.data();

    // Push vote counts back to playlist songs array
    const playlistDoc = await fdb.collection('playlists').doc(poll.playlistId).get();
    if (playlistDoc.exists) {
      const existing = playlistDoc.data().songs || [];
      const voteMap = {};
      (poll.songs || []).forEach(s => { voteMap[s.songId] = s.votes || 0; });
      const updated = existing.map(s => {
        const sid = typeof s === 'string' ? s : s.songId;
        return { ...(typeof s === 'string' ? { songId: s, order: 0 } : s), votes: voteMap[sid] || 0 };
      });
      // Re-sort by votes descending
      updated.sort((a, b) => (b.votes || 0) - (a.votes || 0));
      updated.forEach((s, i) => { s.order = i; });
      await fdb.collection('playlists').doc(poll.playlistId).update({ songs: updated });
    }

    await fdb.collection('polls').doc(pollId).update({ status: 'closed', closedAt: new Date().toISOString() });
    return res.json({ success: true });
  }

  res.status(405).end();
  } catch (err) {
    console.error('[/api/polls/[pollId]]', err);
    res.status(500).json({ error: err.message });
  }
}
