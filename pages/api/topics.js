// pages/api/topics.js
import { db } from '../../lib/firebase';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const snapshot = await db.collection('topics').get();
    const topics = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        songs: doc.data().songs || [],
      }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    res.status(200).json({ topics });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
}
