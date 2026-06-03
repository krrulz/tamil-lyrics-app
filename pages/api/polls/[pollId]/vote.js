// pages/api/polls/[pollId]/vote.js
import { fdb } from '../../../../lib/firebaseDb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { pollId } = req.query;
  const { songIds, voterName, fingerprint } = req.body || {};

  if (!fingerprint) return res.status(400).json({ error: 'fingerprint required' });
  if (!Array.isArray(songIds) || songIds.length === 0) return res.status(400).json({ error: 'songIds array required' });

  // Check poll exists and is active
  const pollDoc = await fdb.collection('polls').doc(pollId).get();
  if (!pollDoc.exists) return res.status(404).json({ error: 'Poll not found' });
  const poll = pollDoc.data();
  if (poll.status !== 'active') return res.status(410).json({ error: 'Poll is closed' });

  // Check already voted (fingerprint dedup)
  const voteId = `${pollId}_${fingerprint}`;
  const existingVote = await fdb.collection('votes').doc(voteId).get();
  if (existingVote.exists) return res.status(409).json({ error: 'already_voted', message: 'You have already voted in this poll.' });

  // Validate all songIds exist in poll
  const validSongIds = new Set((poll.songs || []).map(s => s.songId));
  const invalid = songIds.filter(id => !validSongIds.has(id));
  if (invalid.length > 0) return res.status(400).json({ error: `Invalid song IDs: ${invalid.join(', ')}` });

  // Update vote counts on poll songs
  const updatedSongs = (poll.songs || []).map(s => ({
    ...s,
    votes: (s.votes || 0) + (songIds.includes(s.songId) ? 1 : 0),
  }));

  await fdb.collection('polls').doc(pollId).update({
    songs: updatedSongs,
    totalVotes: (poll.totalVotes || 0) + 1,
  });

  // Record the vote for dedup + analytics
  await fdb.collection('votes').doc(voteId).set({
    pollId,
    fingerprint,
    voterName: (voterName || 'Anonymous').trim(),
    songIds,
    votedAt: new Date().toISOString(),
    songCount: songIds.length,
  });

  return res.json({ success: true, message: 'Vote recorded!' });
}
