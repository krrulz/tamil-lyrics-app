// pages/api/admin/analytics.js
import { fdb, db } from '../../../lib/firebaseDb.js';
import { requireAdmin } from '../../../lib/firebaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const user = await requireAdmin(req, res);
  if (!user) return;

  try {
    const [pollDocs, voteDocs, topicDocs, songDocs] = await Promise.all([
      fdb.collection('polls').getAll(),
      fdb.collection('votes').getAll(),
      db.collection('topics').get(),
      db.collection('songs').get(),
    ]);

    const polls = pollDocs.map(d => ({ id: d.id, ...d.data() }));
    const votes = voteDocs.map(d => ({ id: d.id, ...d.data() }));
    const topics = topicDocs.docs.map(d => ({ id: d.id, ...d.data() }));
    const songMap = {};
    songDocs.docs.forEach(d => { songMap[d.id] = d.data(); });

    // ── Global summary ────────────────────────────────────────────────────────
    const totalVotes = votes.length;
    const uniqueVoters = new Set(votes.map(v => v.fingerprint)).size;
    const totalPolls = polls.length;
    const activePolls = polls.filter(p => p.status === 'active').length;

    // Max songs voted by one voter
    const votesPerVoter = {};
    votes.forEach(v => {
      const fp = v.fingerprint;
      votesPerVoter[fp] = (votesPerVoter[fp] || 0) + (v.songCount || 0);
    });
    const maxVoterCount = Math.max(...Object.values(votesPerVoter), 0);

    // ── Per-poll breakdown ────────────────────────────────────────────────────
    const pollBreakdowns = polls.map(poll => {
      const pollVotes = votes.filter(v => v.pollId === poll.id);
      const songVotes = {};
      (poll.songs || []).forEach(s => { songVotes[s.songId] = s.votes || 0; });

      const topSongs = Object.entries(songVotes)
        .map(([songId, count]) => ({
          songId,
          votes: count,
          name: songMap[songId]?.name || songId,
          movie: songMap[songId]?.movie || '',
        }))
        .sort((a, b) => b.votes - a.votes)
        .slice(0, 10);

      return {
        id: poll.id,
        title: poll.title,
        playlistId: poll.playlistId,
        status: poll.status,
        totalVotes: poll.totalVotes || 0,
        uniqueVoters: new Set(pollVotes.map(v => v.fingerprint)).size,
        topSongs,
        createdAt: poll.createdAt,
      };
    }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    // ── Overall top songs across all polls ────────────────────────────────────
    const globalSongVotes = {};
    polls.forEach(poll => {
      (poll.songs || []).forEach(s => {
        globalSongVotes[s.songId] = (globalSongVotes[s.songId] || 0) + (s.votes || 0);
      });
    });
    const topSongsGlobal = Object.entries(globalSongVotes)
      .map(([songId, votes]) => ({
        songId, votes,
        name: songMap[songId]?.name || songId,
        movie: songMap[songId]?.movie || '',
      }))
      .sort((a, b) => b.votes - a.votes)
      .slice(0, 20);

    // ── Voter leaderboard (most songs voted across all polls) ─────────────────
    const voterNames = {};
    votes.forEach(v => {
      if (v.voterName && v.voterName !== 'Anonymous') {
        voterNames[v.fingerprint] = v.voterName;
      }
    });
    const voterLeaderboard = Object.entries(votesPerVoter)
      .map(([fp, count]) => ({ name: voterNames[fp] || 'Anonymous', count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return res.json({
      summary: { totalVotes, uniqueVoters, totalPolls, activePolls, maxVoterCount, totalTopics: topics.length },
      topSongsGlobal,
      pollBreakdowns,
      voterLeaderboard,
    });
  } catch (err) {
    console.error('[analytics]', err.message);
    res.status(500).json({ error: err.message });
  }
}
