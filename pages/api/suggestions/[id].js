// pages/api/suggestions/[id].js
import { fdb, db } from '../../../lib/firebaseDb.js';
import { requireAdmin } from '../../../lib/firebaseAdmin.js';
import { scrapeBothLyricsOptimised } from '../../../lib/scraper.js';
import { fillMissingLyrics } from '../../../lib/transliterate.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).end();
  const user = await requireAdmin(req, res);
  if (!user) return;

  const { id } = req.query;
  const { action, playlistId } = req.body || {};

  const snap = await fdb.collection('suggestions').doc(id).get();
  if (!snap.exists) return res.status(404).json({ error: 'Not found' });
  const sug = snap.data();

  // ── Reject ─────────────────────────────────────────────────────────────────
  if (action === 'reject') {
    await fdb.collection('suggestions').doc(id).update({ status: 'rejected', reviewedAt: new Date().toISOString() });
    return res.json({ success: true });
  }

  // ── Fetch lyrics only ──────────────────────────────────────────────────────
  if (action === 'fetch-lyrics') {
    console.log(`[suggestions] Fetching lyrics for: ${sug.songName}`);
    const scraped = await scrapeBothLyricsOptimised(sug.songName);
    const filled = await fillMissingLyrics(sug.songName, scraped.tamil, scraped.english);
    await fdb.collection('suggestions').doc(id).update({
      tamilLyrics: filled.tamil || '',
      englishLyrics: filled.english || '',
      tamilStatus: filled.tamilSource || 'not_found',
      englishStatus: filled.englishSource || 'not_found',
      lyricsStatus: (filled.tamil || filled.english) ? 'fetched' : 'not_found',
    });
    return res.json({ success: true, tamilFound: !!filled.tamil, englishFound: !!filled.english, tamilSource: filled.tamilSource, englishSource: filled.englishSource });
  }

  // ── Approve ────────────────────────────────────────────────────────────────
  if (action === 'approve') {
    if (!playlistId) return res.status(400).json({ error: 'playlistId required to approve' });

    // 1. Scrape lyrics if not already fetched
    let tamilLyrics = sug.tamilLyrics || '';
    let englishLyrics = sug.englishLyrics || '';

    if (!tamilLyrics && !englishLyrics) {
      console.log(`[suggestions] Auto-scraping on approve: ${sug.songName}`);
      const scraped = await scrapeBothLyricsOptimised(sug.songName);
      const filled = await fillMissingLyrics(sug.songName, scraped.tamil, scraped.english);
      tamilLyrics = filled.tamil || '';
      englishLyrics = filled.english || '';
    }

    // 2. Create/update song in songs collection
    const songId = sug.songName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    await db.collection('songs').doc(songId).set({
      name: sug.songName,
      movie: sug.movie || '',
      tamilLyrics,
      englishLyrics,
      tamilStatus: tamilLyrics ? 'scraped' : 'not_found',
      englishStatus: englishLyrics ? 'scraped' : 'not_found',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      addedFromSuggestion: true,
    });

    // 3. Add song to playlist
    const playlistDoc = await db.collection('playlists').doc(playlistId).get();
    if (!playlistDoc.exists) return res.status(404).json({ error: 'Playlist not found' });
    const existing = playlistDoc.data().songs || [];
    if (!existing.some(s => (typeof s === 'string' ? s : s.songId) === songId)) {
      const newEntry = { songId, order: existing.length, votes: 0, addedAt: new Date().toISOString() };
      await db.collection('playlists').doc(playlistId).update({ songs: [...existing, newEntry] });
    }

    // 4. Mark suggestion as approved
    await fdb.collection('suggestions').doc(id).update({
      status: 'approved',
      songId,
      playlistId,
      tamilLyrics,
      englishLyrics,
      lyricsStatus: (tamilLyrics || englishLyrics) ? 'fetched' : 'not_found',
      reviewedAt: new Date().toISOString(),
    });

    return res.json({ success: true, songId, tamilFound: !!tamilLyrics, englishFound: !!englishLyrics });
  }

  return res.status(400).json({ error: 'action must be approve, reject, or fetch-lyrics' });
}
