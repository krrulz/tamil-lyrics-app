// pages/api/topic-songs.js
import { db } from '../../lib/firebase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { topicId } = req.query;
  if (!topicId) return res.status(400).json({ error: 'topicId required' });

  try {
    const topicDoc = await db.collection('topics').doc(topicId).get();
    if (!topicDoc.exists) return res.status(404).json({ error: 'Topic not found' });

    const { name, songs: songIds } = topicDoc.data();

    const songDocs = await Promise.all(
      (songIds || []).map(id => db.collection('songs').doc(id).get())
    );

    const songs = songDocs
      .filter(d => d.exists)
      .map(d => ({
        id: d.id,
        name: d.data().name,
        movie: d.data().movie || '',
        tamilAvailable: d.data().tamilStatus === 'found',
        englishAvailable: d.data().englishStatus === 'found',
      }));

    res.status(200).json({ topicName: name, songs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch songs' });
  }
}
