// pages/api/topic-songs.js
import { fdb } from '../../lib/firebaseDb.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { topicId } = req.query;
  if (!topicId) return res.status(400).json({ error: 'topicId required' });

  try {
    const topicDoc = await fdb.collection('topics').doc(topicId).get();
    if (!topicDoc.exists) return res.status(404).json({ error: 'Topic not found' });
    const data = topicDoc.data();
    const { name, songs: songIds = [] } = data;

    // Wheel state
    const wheelActive = !!data.currentSong;
    const currentSongId = data.currentSong || null;

    // If wheel is active, fetch only the current song for public display
    if (wheelActive && currentSongId) {
      const doc = await fdb.collection('songs').doc(currentSongId).get();
      const song = doc.exists
        ? { id: doc.id, name: doc.data().name, movie: doc.data().movie || '', tamilAvailable: !!doc.data().tamilLyrics, englishAvailable: !!doc.data().englishLyrics }
        : null;
      return res.status(200).json({ topicName: name, songs: song ? [song] : [], wheelActive: true });
    }

    // Normal mode: show all songs
    const songDocs = await Promise.all(songIds.map(id => fdb.collection('songs').doc(id).get()));
    const songs = songDocs
      .filter(d => d.exists)
      .map(d => ({
        id: d.id,
        name: d.data().name,
        movie: d.data().movie || '',
        tamilAvailable: !!d.data().tamilLyrics,
        englishAvailable: !!d.data().englishLyrics,
      }));

    res.status(200).json({ topicName: name, songs, wheelActive: false });
  } catch (err) {
    console.error('[topic-songs]', err);
    res.status(500).json({ error: 'Failed to fetch songs' });
  }
}
