// scripts/generate-interludes.js
// Downloads, trims, and uploads interludes for the Tamil Lyrics guessing game
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

// ── Paths ──────────────────────────────────────────────────────────────────────
const FFMPEG     = 'C:\\Users\\mailt\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin\\ffmpeg.exe';
const FFMPEG_BIN = 'C:\\Users\\mailt\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin';
const NODE_EXE   = 'C:\\Program Files\\nodejs\\node.exe';
const YT_DLP     = path.join(__dirname, 'yt-dlp.exe');
const OUT_DIR = path.join(__dirname, 'interludes');

// ── Firestore config ───────────────────────────────────────────────────────────
const PROJECT = 'tamil-lyrics-app';
const TENANT = 'group2';
const COLLECTION = `${TENANT}_gameInterludes`;

// ── Default clip settings ──────────────────────────────────────────────────────
// Most Tamil film interludes start around 1:30. Override per-song below.
const D_START = 90;  // seconds
const D_DUR   = 20;  // seconds

// ── Song list ──────────────────────────────────────────────────────────────────
// Override start/duration per song after listening to the downloads if needed.
const SONGS = [
  { name: 'Oorusanam',                    movie: '',              start: D_START, duration: D_DUR },
  { name: 'Chinna Chinna vana kuyil',     movie: '',              start: D_START, duration: D_DUR },
  { name: 'Adi aathadi',                  movie: '',              start: D_START, duration: D_DUR },
  { name: 'Enthan nenjil',                movie: '',              start: D_START, duration: D_DUR },
  { name: 'Kadhal kaditham',              movie: '',              start: D_START, duration: D_DUR },
  { name: 'Oru nalum unnai maravadha',    movie: '',              start: D_START, duration: D_DUR },
  { name: 'Amma Amma',                    movie: '',              start: D_START, duration: D_DUR },
  { name: 'Thendral vandhu theendum bodhu', movie: '',            start: D_START, duration: D_DUR },
  { name: 'Ennai thalata varuvala',       movie: '',              start: D_START, duration: D_DUR },
  { name: 'Kannana kanney',               movie: '',              start: D_START, duration: D_DUR },
  { name: 'Mudhal nee mudivum nee',       movie: '',              start: D_START, duration: D_DUR },
  { name: 'Konji pesida venam',           movie: '',              start: D_START, duration: D_DUR },
  { name: 'Malai mangum',                 movie: '',              start: D_START, duration: D_DUR },
  { name: 'Melliname',                    movie: '',              start: D_START, duration: D_DUR },
  { name: 'Urugi urugi',                  movie: '',              start: D_START, duration: D_DUR },
  { name: 'Thamarai poovukum',            movie: '',              start: D_START, duration: D_DUR },
  { name: 'Muthal muthalil',              movie: '',              start: D_START, duration: D_DUR },
  { name: 'Malai kovil vasalil',          movie: '',              start: D_START, duration: D_DUR },
  { name: 'Kannukulle',                   movie: '',              start: D_START, duration: D_DUR },
  { name: 'Anbe Sivam',                   movie: '',              start: D_START, duration: D_DUR },
  { name: 'Oru kal Oru Kannadi',          movie: '',              start: D_START, duration: D_DUR },
  { name: 'Rayile rayile',               movie: '5 Star',        start: D_START, duration: D_DUR },
  { name: 'Nenje nenje',                  movie: 'Ayan',          start: D_START, duration: D_DUR },
  { name: 'Panju mittai',                 movie: 'Ettupatti Rasa',start: D_START, duration: D_DUR },
  { name: 'Kodi kodi minnalgal',          movie: '',              start: D_START, duration: D_DUR },
  { name: 'Azhakooril',                   movie: '',              start: D_START, duration: D_DUR },
  { name: 'Iruvadhu kodi',                movie: '',              start: D_START, duration: D_DUR },
  { name: 'Oru devathai',                 movie: 'Vaamanan',      start: D_START, duration: D_DUR },
  { name: 'Poi sonnal',                   movie: '',              start: D_START, duration: D_DUR },
  { name: 'Thaarame thaarame',            movie: '',              start: D_START, duration: D_DUR },
  { name: 'Azhage azhage',                movie: '',              start: D_START, duration: D_DUR },
  { name: 'Kaatu payale',                 movie: '',              start: D_START, duration: D_DUR },
  { name: 'Oodha kalaru ribbon',          movie: '',              start: D_START, duration: D_DUR },
  { name: 'U r my darling',               movie: '',              start: D_START, duration: D_DUR },
  { name: 'Ey sandakaara',                movie: '',              start: D_START, duration: D_DUR },
  { name: 'Hawa hawa',                    movie: '',              start: D_START, duration: D_DUR },
];

// ── Utilities ──────────────────────────────────────────────────────────────────
function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function loadEnv() {
  const envPath = path.join(__dirname, '../.env.local');
  const env = {};
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const eqIdx = line.indexOf('=');
    if (eqIdx > 0 && !line.trimStart().startsWith('#')) {
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      env[line.slice(0, eqIdx).trim()] = val;
    }
  });
  return env;
}

function generateJWT(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  })).toString('base64url');
  const toSign = `${header}.${payload}`;
  const sig = crypto.createSign('RSA-SHA256').update(toSign).sign(sa.private_key, 'base64url');
  return `${toSign}.${sig}`;
}

function request(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const bodyBuf = body ? (Buffer.isBuffer(body) ? body : Buffer.from(body)) : null;
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers: { ...headers, ...(bodyBuf ? { 'Content-Length': bodyBuf.length } : {}) },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 300)}`));
        try { resolve(JSON.parse(text)); } catch { resolve(text); }
      });
    });
    req.on('error', reject);
    if (bodyBuf) req.write(bodyBuf);
    req.end();
  });
}

async function getAccessToken(sa) {
  const res = await request('POST', 'https://oauth2.googleapis.com/token',
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${generateJWT(sa)}`
  );
  return res.access_token;
}

async function uploadFile(localPath, filename, blobToken) {
  const fileData = fs.readFileSync(localPath);
  const meta = await request('PUT', `https://blob.vercel-storage.com/interludes/${filename}`, {
    'Authorization': `Bearer ${blobToken}`,
    'Content-Type': 'audio/mpeg',
    'x-api-version': '7',
  }, fileData);
  return meta.url;
}

async function saveFirestore(docId, fields, token) {
  const fsFields = {};
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === 'string')  fsFields[k] = { stringValue: v };
    else if (typeof v === 'number') fsFields[k] = { integerValue: String(v) };
    else if (typeof v === 'boolean') fsFields[k] = { booleanValue: v };
  }
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${COLLECTION}/${docId}`;
  await request('PATCH', url,
    { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    JSON.stringify({ fields: fsFields })
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function processSong(song, idx, total, token) {
  const num = String(idx).padStart(2, '0');
  const songSlug = slug(song.name);
  const tempFile = path.join(OUT_DIR, `_tmp_${num}.mp3`);
  const finalFile = path.join(OUT_DIR, `${songSlug}.mp3`);

  // Clean stale files
  [tempFile, finalFile].forEach(f => { try { fs.unlinkSync(f); } catch {} });

  const searchQ = song.movie
    ? `${song.name} ${song.movie} Tamil`
    : `${song.name} Tamil song`;

  console.log(`\n[${num}/${total}] ${song.name}${song.movie ? ` — ${song.movie}` : ''}`);

  // 1. Download
  process.stdout.write('  ↓ Downloading… ');
  try {
    execSync(
      `"${YT_DLP}" --js-runtimes "node:${NODE_EXE}" --ffmpeg-location "${FFMPEG_BIN}" -x --audio-format mp3 --audio-quality 128K --no-playlist -o "${path.join(OUT_DIR, `_tmp_${num}.%(ext)s`)}" "ytsearch1:${searchQ}"`,
      { timeout: 180000, stdio: 'pipe' }
    );
  } catch (e) {
    console.log(`FAILED\n    ${e.message.slice(0, 120)}`);
    return { ...song, idx, status: 'download_failed' };
  }

  if (!fs.existsSync(tempFile)) {
    console.log('FAILED (no output file)');
    return { ...song, idx, status: 'download_failed' };
  }
  console.log('done');

  // 2. Trim
  process.stdout.write(`  ✂  Trimming ${song.start}s–${song.start + song.duration}s… `);
  try {
    execSync(
      `"${FFMPEG}" -ss ${song.start} -t ${song.duration} -i "${tempFile}" -acodec libmp3lame -ab 128k -y "${finalFile}"`,
      { timeout: 30000, stdio: 'pipe' }
    );
  } catch (e) {
    console.log(`FAILED\n    ${e.message.slice(0, 120)}`);
    return { ...song, idx, status: 'trim_failed' };
  } finally {
    try { fs.unlinkSync(tempFile); } catch {}
  }
  console.log('done');

  // 3. Upload
  process.stdout.write('  ↑ Uploading… ');
  let downloadUrl;
  try {
    downloadUrl = await uploadFile(finalFile, `${songSlug}.mp3`, token.blob);
  } catch (e) {
    console.log(`FAILED\n    ${e.message.slice(0, 200)}`);
    return { ...song, idx, status: 'upload_failed', localFile: finalFile };
  }
  console.log('done');

  // 4. Save to Firestore
  process.stdout.write('  💾 Saving to Firestore… ');
  const docId = songSlug;
  try {
    await saveFirestore(docId, {
      songName:     song.name,
      movieName:    song.movie || '',
      interludeUrl: downloadUrl,
      startTime:    song.start,
      endTime:      song.start + song.duration,
      createdAt:    new Date().toISOString(),
      status:       'active',
    }, token.firestore);
  } catch (e) {
    console.log(`FAILED (but file uploaded)\n    ${e.message.slice(0, 120)}`);
    return { ...song, idx, status: 'firestore_failed', interludeUrl: downloadUrl };
  }
  console.log('done');
  console.log(`  ✓ ${song.name} → ${downloadUrl.slice(0, 80)}…`);

  return { ...song, idx, status: 'success', interludeUrl: downloadUrl, docId };
}

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Tamil Lyrics — Interlude Generator');
  console.log(`  ${SONGS.length} songs to process`);
  console.log('═══════════════════════════════════════════════════');

  const env = loadEnv();
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const blobToken = env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) throw new Error('BLOB_READ_WRITE_TOKEN missing from .env.local');

  process.stdout.write('\nObtaining Firestore access token… ');
  const firestoreToken = await getAccessToken(sa);
  console.log('✓');

  const token = { firestore: firestoreToken, blob: blobToken };

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const results = [];
  for (let i = 0; i < SONGS.length; i++) {
    const result = await processSong(SONGS[i], i + 1, SONGS.length, token);
    results.push(result);
    // Avoid rate-limiting between songs
    if (i < SONGS.length - 1) await new Promise(r => setTimeout(r, 3000));
  }

  const resultsPath = path.join(__dirname, 'interlude-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));

  const ok   = results.filter(r => r.status === 'success').length;
  const fail = results.filter(r => r.status !== 'success');

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  ✓ ${ok} succeeded   ✗ ${fail.length} failed`);
  if (fail.length) {
    console.log('\n  Failed:');
    fail.forEach(r => console.log(`    - ${r.name}: ${r.status}`));
  }
  console.log(`\n  Results → scripts/interlude-results.json`);
  console.log('═══════════════════════════════════════════════════');
}

main().catch(err => { console.error('\nFatal:', err.message); process.exit(1); });
