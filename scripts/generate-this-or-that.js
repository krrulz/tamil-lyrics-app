'use strict';
// generate-this-or-that.js
// For each pair in this-or-that-pairs.json:
//   - Download full song1 and song2 (cached in full-songs/)
//   - Trim 20s–35s from each → 15s clips
//   - Merge the two clips into one 30s file
//   - Upload to Vercel Blob as this-or-that/{id}.mp3
//   - Save URL to Firestore (collection derived from TENANT_ID)
// Run: node scripts/generate-this-or-that.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const FFMPEG     = 'C:\\Users\\mailt\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin\\ffmpeg.exe';
const FFMPEG_BIN = 'C:\\Users\\mailt\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin';
const NODE_EXE   = 'C:\\Program Files\\nodejs\\node.exe';
const YT_DLP     = path.join(__dirname, 'yt-dlp.exe');
const FULL_DIR   = path.join(__dirname, 'full-songs');
const CLIPS_DIR  = path.join(__dirname, 'this-or-that-clips');
const PROJECT    = 'tamil-lyrics-app';
const CLIP_START = 20;
const CLIP_END   = 35;
const CLIP_DUR   = CLIP_END - CLIP_START; // 15s

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

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
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 300)}`));
        try { resolve(JSON.parse(text)); } catch { resolve(text); }
      });
    });
    req.on('error', reject);
    if (buf) req.write(buf);
    req.end();
  });
}

function download(songName, destPath) {
  const searchQ = `${songName} Tamil song`;
  execSync(
    `"${YT_DLP}" --js-runtimes "node:${NODE_EXE}" --ffmpeg-location "${FFMPEG_BIN}" -x --audio-format mp3 --audio-quality 128K --no-playlist -o "${destPath.replace(/\.mp3$/, '.%(ext)s')}" "ytsearch1:${searchQ}"`,
    { timeout: 180000, stdio: 'pipe' }
  );
}

function trim(inputPath, outputPath) {
  execSync(
    `"${FFMPEG}" -ss ${CLIP_START} -t ${CLIP_DUR} -i "${inputPath}" -acodec libmp3lame -ab 128k -y "${outputPath}"`,
    { timeout: 30000, stdio: 'pipe' }
  );
}

function merge(clip1, clip2, outputPath) {
  // Write concat list to temp file
  const listFile = path.join(CLIPS_DIR, '_concat.txt');
  fs.writeFileSync(listFile, `file '${clip1}'\nfile '${clip2}'\n`);
  execSync(
    `"${FFMPEG}" -f concat -safe 0 -i "${listFile}" -acodec libmp3lame -ab 128k -y "${outputPath}"`,
    { timeout: 30000, stdio: 'pipe' }
  );
  fs.unlinkSync(listFile);
}

async function main() {
  const env = loadEnv();
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const blobToken = env.BLOB_READ_WRITE_TOKEN;
  const tenant = env.TENANT_ID || '';
  const COLLECTION = tenant ? `${tenant}_thisOrThatPairs` : 'thisOrThatPairs';

  console.log(`TENANT_ID: ${tenant || '(none)'} → writing to: ${COLLECTION}\n`);

  const pairs = JSON.parse(fs.readFileSync(path.join(__dirname, 'this-or-that-pairs.json'), 'utf8'));

  [FULL_DIR, CLIPS_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

  process.stdout.write('Obtaining Firestore token… ');
  const firestoreToken = (await request('POST', 'https://oauth2.googleapis.com/token',
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${generateJWT(sa)}`
  )).access_token;
  console.log('✓\n');

  const results = [];

  for (let i = 0; i < pairs.length; i++) {
    const { id, song1, song2 } = pairs[i];
    console.log(`[${String(i + 1).padStart(2, '0')}/${pairs.length}] ${song1} vs ${song2}`);

    const slug1 = slug(song1);
    const slug2 = slug(song2);
    const full1 = path.join(FULL_DIR, `${slug1}.mp3`);
    const full2 = path.join(FULL_DIR, `${slug2}.mp3`);
    const clip1 = path.join(CLIPS_DIR, `${id}_a.mp3`);
    const clip2 = path.join(CLIPS_DIR, `${id}_b.mp3`);
    const merged = path.join(CLIPS_DIR, `${id}.mp3`);

    // Download song1
    if (!fs.existsSync(full1)) {
      process.stdout.write(`  ↓ Downloading "${song1}"… `);
      try { download(song1, full1); console.log('done'); }
      catch (e) { console.log(`FAILED — ${e.message.slice(0, 80)}`); results.push({ id, error: 'download1_failed' }); continue; }
    } else {
      console.log(`  ✓ "${song1}" already cached`);
    }

    // Download song2
    if (!fs.existsSync(full2)) {
      process.stdout.write(`  ↓ Downloading "${song2}"… `);
      try { download(song2, full2); console.log('done'); }
      catch (e) { console.log(`FAILED — ${e.message.slice(0, 80)}`); results.push({ id, error: 'download2_failed' }); continue; }
    } else {
      console.log(`  ✓ "${song2}" already cached`);
    }

    // Trim both
    process.stdout.write(`  ✂  Trimming ${CLIP_START}s–${CLIP_END}s from each… `);
    try {
      trim(full1, clip1);
      trim(full2, clip2);
      console.log('done');
    } catch (e) { console.log(`FAILED — ${e.message.slice(0, 80)}`); results.push({ id, error: 'trim_failed' }); continue; }

    // Merge
    process.stdout.write(`  🔗 Merging into 30s clip… `);
    try { merge(clip1, clip2, merged); console.log('done'); }
    catch (e) { console.log(`FAILED — ${e.message.slice(0, 80)}`); results.push({ id, error: 'merge_failed' }); continue; }

    // Upload
    process.stdout.write(`  ↑ Uploading to Vercel Blob… `);
    let audioUrl;
    try {
      const meta = await request('PUT', `https://blob.vercel-storage.com/this-or-that/${id}.mp3`,
        { 'Authorization': `Bearer ${blobToken}`, 'Content-Type': 'audio/mpeg', 'x-api-version': '7' },
        fs.readFileSync(merged)
      );
      audioUrl = meta.url;
      console.log('done');
    } catch (e) { console.log(`FAILED — ${e.message.slice(0, 80)}`); results.push({ id, error: 'upload_failed' }); continue; }

    // Firestore
    process.stdout.write(`  💾 Saving to Firestore… `);
    try {
      await request('PATCH',
        `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${COLLECTION}/${id}`,
        { 'Authorization': `Bearer ${firestoreToken}`, 'Content-Type': 'application/json' },
        JSON.stringify({
          fields: {
            song1:     { stringValue: song1 },
            song2:     { stringValue: song2 },
            audioUrl:  { stringValue: audioUrl },
            clipStart: { integerValue: String(CLIP_START) },
            clipEnd:   { integerValue: String(CLIP_END) },
            status:    { stringValue: 'active' },
            createdAt: { stringValue: new Date().toISOString() },
          }
        })
      );
      console.log('done');
      results.push({ id, song1, song2, audioUrl, status: 'ok' });
    } catch (e) {
      console.log(`FAILED — ${e.message.slice(0, 80)}`);
      results.push({ id, error: 'firestore_failed', audioUrl });
    }

    console.log();
  }

  const ok   = results.filter(r => r.status === 'ok').length;
  const fail = results.filter(r => r.error);
  console.log(`\n✓ ${ok} pairs done   ✗ ${fail.length} failed`);
  if (fail.length) fail.forEach(r => console.log(`  - ${r.id}: ${r.error}`));
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
