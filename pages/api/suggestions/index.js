// pages/api/suggestions/index.js
import { fdb } from '../../../lib/firebaseDb.js';
import { requireAdmin } from '../../../lib/firebaseAdmin.js';
import { scrapeBothLyricsOptimised } from '../../../lib/scraper.js';
import { fillMissingLyrics } from '../../../lib/transliterate.js';

const INBOX_ID = 'suggestions-inbox';
const INBOX_NAME = 'Suggestions Inbox';

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function ensureInboxPlaylist() {
  const doc = await fdb.collection('playlists').doc(INBOX_ID).get();
  if (!doc.exists) {
    await fdb.collection('playlists').doc(INBOX_ID).set({
      name: INBOX_NAME,
      songs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
    });
  }
}

export default async function handler(req, res) {
  try {
    // ── POST: public submission ────────────────────────────────────────────────
    if (req.method === 'POST') {
      const { songName, movie, reason, submittedBy } = req.body || {};
      if (!songName?.trim()) return res.status(400).json({ error: 'songName is required' });

      const name = songName.trim();
      const songId = slugify(name);

      // 1. Save suggestion record immediately (for log)
      const sugRef = await fdb.collection('suggestions').add({
        songName: name,
        movie: (movie || '').trim(),
        reason: (reason || '').trim(),
        submittedBy: (submittedBy || 'Anonymous').trim(),
        status: 'auto_added',
        createdAt: new Date().toISOString(),
        songId,
      });

      // 2. Fetch lyrics
      let tamilLyrics = '';
      let englishLyrics = '';
      try {
        const scraped = await scrapeBothLyricsOptimised(name);
        const filled = await fillMissingLyrics(name, scraped.tamil, scraped.english);
        tamilLyrics = filled.tamil || '';
        englishLyrics = filled.english || '';
      } catch (e) {
        console.warn('[suggestions] lyrics fetch failed for', name, e.message);
      }

      // 3. Save song to songs collection (upsert — don't overwrite if already exists)
      const existing = await fdb.collection('songs').doc(songId).get();
      if (!existing.exists) {
        await fdb.collection('songs').doc(songId).set({
          name,
          movie: (movie || '').trim(),
          tamilLyrics,
          englishLyrics,
          tamilStatus: tamilLyrics ? 'scraped' : 'not_found',
          englishStatus: englishLyrics ? 'scraped' : 'not_found',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          addedFromSuggestion: true,
        });
      }

      // 4. Ensure inbox playlist exists and add song
      await ensureInboxPlaylist();
      const playlistDoc = await fdb.collection('playlists').doc(INBOX_ID).get();
      const songs = playlistDoc.data()?.songs || [];
      if (!songs.some(s => (typeof s === 'string' ? s : s.songId) === songId)) {
        const entry = { songId, order: songs.length, votes: 0, addedAt: new Date().toISOString() };
        await fdb.collection('playlists').doc(INBOX_ID).update({
          songs: [...songs, entry],
          updatedAt: new Date().toISOString(),
        });
      }

      // 5. Update suggestion with lyrics status
      await fdb.collection('suggestions').doc(sugRef.id).update({
        tamilLyrics,
        englishLyrics,
        lyricsStatus: (tamilLyrics || englishLyrics) ? 'fetched' : 'not_found',
      });

      return res.status(201).json({ success: true, id: sugRef.id, songId, tamilFound: !!tamilLyrics, englishFound: !!englishLyrics });
    }

    // ── GET: admin log ─────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const user = await requireAdmin(req, res);
      if (!user) return;

      const docs = await fdb.collection('suggestions').getAll();
      const suggestions = docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

      return res.json({ suggestions });
    }

    res.status(405).end();
  } catch (err) {
    console.error('[/api/suggestions] error:', err);
    res.status(500).json({ error: err.message });
  }
}
