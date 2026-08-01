'use strict';
// analyze-interludes.js
// Downloads full songs, scores candidate windows by vocal-band energy,
// re-trims and re-uploads each interlude to the best instrumental position.
// Run: node scripts/analyze-interludes.js

const { spawnSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

// ── Paths ────────────────────────────────────────────────────────────────────
const FFMPEG     = 'C:\\Users\\mailt\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin\\ffmpeg.exe';
const FFMPEG_BIN = 'C:\\Users\\mailt\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin';
const NODE_EXE   = 'C:\\Program Files\\nodejs\\node.exe';
const YT_DLP     = path.join(__dirname, 'yt-dlp.exe');
const OUT_DIR    = path.join(__dirname, 'interludes');   // trimmed 30s clips
const FULL_DIR   = path.join(__dirname, 'full-songs');   // full downloads (cached)
const PROJECT    = 'tamil-lyrics-app';
const TENANT     = 'group2';
const COLLECTION = `${TENANT}_gameInterludes`;

const CLIP_DURATION = 15; // seconds per clip
// Candidate start positions (seconds) — spans a typical 5-min song's structure
const TEST_STARTS = [60, 90, 120, 150, 180, 210, 240, 270, 300];

// ── Utilities ────────────────────────────────────────────────────────────────
function loadEnv() {
  const env = {};
  fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8').split('\n').forEach(line => {
    const i = line.indexOf('=');
    if (i > 0 && !line.trimStart().startsWith('#')) {
      let v = line.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      env[line.slice(0, i).trim()] = v;
    }
  });
  return env;
}

function generateJWT(sa) {
  const now = Math.floor(Date.now() / 1000);
  const h = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })).toString('base64url');
  const sig = crypto.createSign('RSA-SHA256').update(`${h}.${p}`).sign(sa.private_key, 'base64url');
  return `${h}.${p}.${sig}`;
}

function request(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const buf = body ? (Buffer.isBuffer(body) ? body : Buffer.from(body)) : null;
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method, headers: { ...headers, ...(buf ? { 'Content-Length': buf.length } : {}) } }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        if (res.status >= 400 || (res.statusCode >= 400)) return reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 300)}`));
        try { resolve(JSON.parse(text)); } catch { resolve(text); }
      });
    });
    req.on('error', reject);
    if (buf) req.write(buf);
    req.end();
  });
}

function parseMeanVolume(stderr) {
  const m = (stderr || '').match(/mean_volume:\s*(-?\d+\.?\d*)\s*dB/);
  return m ? parseFloat(m[1]) : null;
}

// ── Audio analysis ────────────────────────────────────────────────────────────
// Scores a window using two frequency bands:
//   highBand   : energy above 4kHz  — cymbals, string harmonics, flute peaks.
//                Human voice NEVER produces content here.
//   narrowVocal: energy in 1kHz–3kHz — the "presence" band where singing is
//                most distinct. Also active in instrumentals but lower.
//
// score = highBand - narrowVocal
//   → More positive / less negative  = high-freq content is prominent relative
//     to vocal-presence band = full orchestration playing = INSTRUMENTAL ✓
//   → Very negative = vocal-presence dominates over high-freq = VOCAL ✗
//
// Sort DESCENDING → highest score first = most likely vocal-free interlude.
function analyzeWindow(audioPath, startSecs) {
  // Overall: just to detect silence and skip invalid windows
  const r0 = spawnSync(FFMPEG, [
    '-ss', String(startSecs), '-t', String(CLIP_DURATION),
    '-i', audioPath, '-af', 'volumedetect', '-f', 'null', '-'
  ], { encoding: 'utf8', timeout: 20000 });

  // High-frequency energy (above 4 kHz — no voice here)
  const r1 = spawnSync(FFMPEG, [
    '-ss', String(startSecs), '-t', String(CLIP_DURATION),
    '-i', audioPath, '-af', 'highpass=f=4000,volumedetect', '-f', 'null', '-'
  ], { encoding: 'utf8', timeout: 20000 });

  // Narrow vocal-presence band (1kHz–3kHz, centre 2kHz, ±1kHz)
  const r2 = spawnSync(FFMPEG, [
    '-ss', String(startSecs), '-t', String(CLIP_DURATION),
    '-i', audioPath, '-af', 'bandpass=f=2000:width_type=h:width=2000,volumedetect', '-f', 'null', '-'
  ], { encoding: 'utf8', timeout: 20000 });

  const overall    = parseMeanVolume(r0.stderr);
  const highBand   = parseMeanVolume(r1.stderr);
  const narrowVocal = parseMeanVolume(r2.stderr);
  return { overall, highBand, narrowVocal };
}

// Get audio file duration in seconds
function getDuration(audioPath) {
  const r = spawnSync(FFMPEG, ['-i', audioPath, '-f', 'null', '-'], { encoding: 'utf8', timeout: 10000 });
  const m = (r.stderr || '').match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  if (!m) return 360;
  return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
}

// ── Per-song processing ───────────────────────────────────────────────────────
async function processSong(song, token, idx, total) {
  const docId = song.id;
  const fullPath = path.join(FULL_DIR, `${docId}.mp3`);
  const outPath  = path.join(OUT_DIR,  `${docId}.mp3`);

  const searchQ = song.movieName
    ? `${song.songName} ${song.movieName} Tamil song`
    : `${song.songName} Tamil song`;

  console.log(`\n[${String(idx).padStart(2,'0')}/${total}] ${song.songName}${song.movieName ? ` — ${song.movieName}` : ''}`);

  // 1. Download full song (cached across runs)
  if (!fs.existsSync(fullPath)) {
    process.stdout.write('  ↓ Downloading full song… ');
    try {
      execSync(
        `"${YT_DLP}" --js-runtimes "node:${NODE_EXE}" --ffmpeg-location "${FFMPEG_BIN}" -x --audio-format mp3 --audio-quality 128K --no-playlist -o "${path.join(FULL_DIR, `${docId}.%(ext)s`)}" "ytsearch1:${searchQ}"`,
        { timeout: 180000, stdio: 'pipe' }
      );
      console.log('done');
    } catch (e) {
      console.log(`FAILED — ${e.message.slice(0, 100)}`);
      return { id: docId, name: song.songName, error: 'download_failed' };
    }
  } else {
    console.log('  ✓ Using cached download');
  }

  if (!fs.existsSync(fullPath)) return { id: docId, name: song.songName, error: 'file_missing' };

  const duration = getDuration(fullPath);
  const mins = Math.floor(duration / 60), secs = Math.floor(duration % 60);
  console.log(`  ⏱ Duration: ${mins}:${String(secs).padStart(2,'0')}`);

  // 2. Score all valid candidate windows
  const valid = TEST_STARTS.filter(t => t + CLIP_DURATION + 5 < duration);
  if (!valid.length) return { id: docId, name: song.songName, error: 'too_short', duration };

  const scores = [];
  process.stdout.write(`  🔍 Scoring ${valid.length} windows`);
  for (const t of valid) {
    const { overall, highBand, narrowVocal } = analyzeWindow(fullPath, t);
    if (overall !== null && overall > -55) {          // skip near-silent windows
      // score = highBand - narrowVocal
      // Higher (less negative) = more high-freq content relative to vocal-presence band
      //                        = full orchestration = more likely instrumental
      const score = (highBand !== null && narrowVocal !== null) ? (highBand - narrowVocal) : -99;
      scores.push({ start: t, overall, highBand, narrowVocal, score });
    }
    process.stdout.write('.');
  }
  console.log();

  if (!scores.length) return { id: docId, name: song.songName, error: 'no_valid_windows' };

  // Sort DESCENDING — highest score = most high-freq vs vocal-presence = most instrumental
  scores.sort((a, b) => b.score - a.score);

  console.log('  Window scores (higher score = more instrumental, less vocal):');
  scores.forEach((s, i) => {
    const m = Math.floor(s.start / 60), sec = String(s.start % 60).padStart(2,'0');
    const tag = i === 0 ? ' ← BEST' : '';
    console.log(`    ${m}:${sec}  total: ${s.overall.toFixed(1)} dB  high(>4kHz): ${s.highBand?.toFixed(1)} dB  vocal(1-3kHz): ${s.narrowVocal?.toFixed(1)} dB  score: ${s.score.toFixed(2)}${tag}`);
  });

  const bestStart = scores[0].start;
  const prevStart = song.startTime;

  // 3. Re-trim at best position
  process.stdout.write(`  ✂  Re-trimming ${prevStart}s → ${bestStart}s… `);
  try {
    execSync(
      `"${FFMPEG}" -ss ${bestStart} -t ${CLIP_DURATION} -i "${fullPath}" -acodec libmp3lame -ab 128k -y "${outPath}"`,
      { timeout: 30000, stdio: 'pipe' }
    );
    console.log('done');
  } catch {
    console.log('FAILED');
    return { id: docId, name: song.songName, error: 'trim_failed', bestStart };
  }

  // 4. Re-upload to Vercel Blob
  process.stdout.write('  ↑ Uploading new clip… ');
  let newUrl;
  try {
    const meta = await request('PUT', `https://blob.vercel-storage.com/interludes/${docId}.mp3`,
      { 'Authorization': `Bearer ${token.blob}`, 'Content-Type': 'audio/mpeg', 'x-api-version': '7' },
      fs.readFileSync(outPath)
    );
    newUrl = meta.url;
    console.log('done');
  } catch (e) {
    console.log(`FAILED — ${e.message.slice(0, 120)}`);
    return { id: docId, name: song.songName, error: 'upload_failed', bestStart };
  }

  // 5. Patch Firestore (update only the 3 timing fields)
  process.stdout.write('  💾 Updating Firestore… ');
  try {
    const fields = {
      startTime:    { integerValue: String(bestStart) },
      endTime:      { integerValue: String(bestStart + CLIP_DURATION) },
      interludeUrl: { stringValue: newUrl },
    };
    const mask = 'updateMask.fieldPaths=startTime&updateMask.fieldPaths=endTime&updateMask.fieldPaths=interludeUrl';
    await request(
      'PATCH',
      `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${COLLECTION}/${docId}?${mask}`,
      { 'Authorization': `Bearer ${token.firestore}`, 'Content-Type': 'application/json' },
      JSON.stringify({ fields })
    );
    console.log('done');
    console.log(`  ✓ ${song.songName}: ${prevStart}s → ${bestStart}s`);
  } catch (e) {
    console.log(`FAILED — ${e.message.slice(0, 120)}`);
    return { id: docId, name: song.songName, error: 'firestore_failed', bestStart, newUrl };
  }

  return { id: docId, name: song.songName, prevStart, bestStart, changed: true, newUrl, scores };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Optional CLI filter: node analyze-interludes.js --song="Kadhal kaditham"
  const songFilter = process.argv.find(a => a.startsWith('--song='))?.slice(7)?.toLowerCase();

  console.log('═══════════════════════════════════════════════════');
  console.log('  Tamil Lyrics — Interlude Timing Analyzer');
  console.log('  Finds best instrumental window per song via');
  console.log('  vocal-band frequency energy scoring (ffmpeg)');
  console.log('═══════════════════════════════════════════════════\n');

  const env = loadEnv();
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);

  // Tokens
  process.stdout.write('Obtaining tokens… ');
  const firestoreToken = (await request('POST', 'https://oauth2.googleapis.com/token',
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${generateJWT(sa)}`
  )).access_token;
  const token = { firestore: firestoreToken, blob: env.BLOB_READ_WRITE_TOKEN };
  console.log('✓\n');

  // Fetch all interludes from Firestore
  const resp = await request('GET',
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${COLLECTION}?pageSize=100`,
    { 'Authorization': `Bearer ${firestoreToken}` }
  );
  let interludes = (resp.documents || []).map(doc => {
    const id = doc.name.split('/').pop();
    const f = doc.fields || {};
    return {
      id,
      songName:  f.songName?.stringValue  || id,
      movieName: f.movieName?.stringValue || '',
      startTime: parseInt(f.startTime?.integerValue || '90'),
    };
  }).sort((a, b) => a.songName.localeCompare(b.songName));

  if (songFilter) {
    interludes = interludes.filter(s => s.songName.toLowerCase().includes(songFilter) || s.id.toLowerCase().includes(songFilter));
    console.log(`Filtering to ${interludes.length} song(s) matching "${songFilter}"\n`);
  }

  console.log(`Processing ${interludes.length} songs...\n`);

  // Ensure output directories exist
  [OUT_DIR, FULL_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

  const results = [];
  for (let i = 0; i < interludes.length; i++) {
    const result = await processSong(interludes[i], token, i + 1, interludes.length);
    results.push(result);
    if (i < interludes.length - 1) await new Promise(r => setTimeout(r, 1500));
  }

  // Save report
  const reportPath = path.join(__dirname, 'interlude-analysis.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));

  const changed   = results.filter(r => r.changed === true);
  const unchanged = results.filter(r => r.changed === false);
  const errors    = results.filter(r => r.error);

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  ✓ Updated timings: ${changed.length}`);
  console.log(`  = Already optimal:  ${unchanged.length}`);
  console.log(`  ✗ Errors:           ${errors.length}`);

  if (changed.length) {
    console.log('\n  Timing changes:');
    changed.forEach(r => console.log(`    ${r.name}: ${r.prevStart}s → ${r.bestStart}s`));
  }
  if (errors.length) {
    console.log('\n  Errors:');
    errors.forEach(r => console.log(`    ${r.name}: ${r.error}`));
  }
  console.log(`\n  Full report → scripts/interlude-analysis.json`);
  console.log('═══════════════════════════════════════════════════');
}

main().catch(err => { console.error('\nFatal:', err.message); process.exit(1); });
