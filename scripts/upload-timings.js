'use strict';
// upload-timings.js
// Reads interlude-timings.json, trims each full song to 15s at the given start
// time, uploads to Vercel Blob, and updates Firestore.
// Run: node scripts/upload-timings.js

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
const OUT_DIR    = path.join(__dirname, 'interludes');
const PROJECT  = 'tamil-lyrics-app';
const TENANT   = 'group2';
const COLLECTION = `${TENANT}_gameInterludes`;
const CLIP_DURATION = 15;

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

async function main() {
  const timings = JSON.parse(fs.readFileSync(path.join(__dirname, 'interlude-timings.json'), 'utf8'));
  const missing = timings.filter(t => t.start === 0);
  if (missing.length) {
    console.log(`⚠  ${missing.length} songs still have start=0:`);
    missing.forEach(t => console.log(`   - ${t.song}`));
    console.log('\nFill in all start times in interlude-timings.json first.\n');
    process.exit(1);
  }

  const env = loadEnv();
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);

  process.stdout.write('Obtaining tokens… ');
  const firestoreToken = (await request('POST', 'https://oauth2.googleapis.com/token',
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${generateJWT(sa)}`
  )).access_token;
  console.log('✓\n');

  [FULL_DIR, OUT_DIR].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

  const results = [];
  for (let i = 0; i < timings.length; i++) {
    const { song, docId, start } = timings[i];
    const fullPath = path.join(FULL_DIR, `${docId}.mp3`);
    const outPath  = path.join(OUT_DIR, `${docId}.mp3`);

    console.log(`[${String(i + 1).padStart(2, '0')}/${timings.length}] ${song} — start: ${start}s`);

    if (!fs.existsSync(fullPath)) {
      const searchQ = `${song} Tamil song`;
      process.stdout.write(`  ↓ Downloading full song… `);
      try {
        execSync(
          `"${YT_DLP}" --js-runtimes "node:${NODE_EXE}" --ffmpeg-location "${FFMPEG_BIN}" -x --audio-format mp3 --audio-quality 128K --no-playlist -o "${path.join(FULL_DIR, `${docId}.%(ext)s`)}" "ytsearch1:${searchQ}"`,
          { timeout: 180000, stdio: 'pipe' }
        );
        console.log('done');
      } catch (e) {
        console.log(`FAILED — ${e.message.slice(0, 100)}`);
        results.push({ song, docId, error: 'download_failed' });
        continue;
      }
    }

    // Trim
    process.stdout.write(`  ✂  Trimming ${start}s–${start + CLIP_DURATION}s… `);
    try {
      execSync(
        `"${FFMPEG}" -ss ${start} -t ${CLIP_DURATION} -i "${fullPath}" -acodec libmp3lame -ab 128k -y "${outPath}"`,
        { timeout: 30000, stdio: 'pipe' }
      );
      console.log('done');
    } catch {
      console.log('FAILED');
      results.push({ song, docId, error: 'trim_failed' });
      continue;
    }

    // Upload
    process.stdout.write('  ↑ Uploading to Vercel Blob… ');
    let newUrl;
    try {
      const meta = await request('PUT', `https://blob.vercel-storage.com/interludes/${docId}.mp3`,
        { 'Authorization': `Bearer ${env.BLOB_READ_WRITE_TOKEN}`, 'Content-Type': 'audio/mpeg', 'x-api-version': '7' },
        fs.readFileSync(outPath)
      );
      newUrl = meta.url;
      console.log('done');
    } catch (e) {
      console.log(`FAILED — ${e.message.slice(0, 100)}`);
      results.push({ song, docId, error: 'upload_failed' });
      continue;
    }

    // Firestore
    process.stdout.write('  💾 Saving to Firestore… ');
    try {
      const fields = {
        startTime:    { integerValue: String(start) },
        endTime:      { integerValue: String(start + CLIP_DURATION) },
        interludeUrl: { stringValue: newUrl },
      };
      const mask = 'updateMask.fieldPaths=startTime&updateMask.fieldPaths=endTime&updateMask.fieldPaths=interludeUrl';
      await request('PATCH',
        `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${COLLECTION}/${docId}?${mask}`,
        { 'Authorization': `Bearer ${firestoreToken}`, 'Content-Type': 'application/json' },
        JSON.stringify({ fields })
      );
      console.log('done');
      results.push({ song, docId, start, url: newUrl, status: 'ok' });
    } catch (e) {
      console.log(`FAILED — ${e.message.slice(0, 100)}`);
      results.push({ song, docId, error: 'firestore_failed', url: newUrl });
    }
  }

  const ok   = results.filter(r => r.status === 'ok').length;
  const fail = results.filter(r => r.error);
  console.log(`\n✓ ${ok} uploaded   ✗ ${fail.length} failed`);
  if (fail.length) fail.forEach(r => console.log(`  - ${r.song}: ${r.error}`));
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
