// pages/api/suggestions/index.js
import { fdb } from '../../../lib/firebaseDb.js';
import { requireAdmin } from '../../../lib/firebaseAdmin.js';
import { scrapeBothLyricsOptimised } from '../../../lib/scraper.js';
import { fillMissingLyrics } from '../../../lib/transliterate.js';
export default async function handler(req, res) {
  try {
  // ── POST: public submission ────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { songName, movie, reason, submittedBy } = req.body || {};
    if (!songName?.trim()) return res.status(400).json({ error: 'songName is required' });

    const id = await fdb.collection('suggestions').add({
      songName: songName.trim(),
      movie: (movie || '').trim(),
      reason: (reason || '').trim(),
      submittedBy: (submittedBy || 'Anonymous').trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      tamilLyrics: '',
      englishLyrics: '',
      lyricsStatus: 'not_fetched',
    });

    return res.status(201).json({ success: true, id: id.id });
  }

  // ── GET: admin list ────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const user = await requireAdmin(req, res);
    if (!user) return;

    const { status } = req.query;
    let docs;
    if (status) {
      docs = await fdb.collection('suggestions').where('status', '==', status);
    } else {
      docs = await fdb.collection('suggestions').getAll();
    }

    const suggestions = docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    return res.json({ suggestions });
  }

  res.status(405).end();
  } catch (err) {
    console.error('[/api/suggestions] error:', err);
    res.status(500).json({ error: err.message, stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined });
  }
}
