import { fdb } from '../../../lib/firebaseDb.js';
import { requireAdmin } from '../../../lib/firebaseAdmin.js';

export default async function handler(req, res) {
  try {
    const user = await requireAdmin(req, res);
    if (!user) return;

    if (req.method === 'GET') {
      const docs = await fdb.collection('thisOrThatPairs').getAll();
      const pairs = docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.song1 || '').localeCompare(b.song1 || ''));
      return res.json({ pairs });
    }

    res.status(405).end();
  } catch (err) {
    console.error('[admin/this-or-that]', err);
    res.status(500).json({ error: err.message });
  }
}
