'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const FFMPEG     = 'C:\\Users\\mailt\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin\\ffmpeg.exe';
const FFMPEG_BIN = 'C:\\Users\\mailt\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.2-full_build\\bin';
const NODE_EXE   = 'C:\\Program Files\\nodejs\\node.exe';
const YT_DLP     = path.join(__dirname, 'yt-dlp.exe');
const OUT_DIR    = path.join(__dirname, 'interludes');
const PROJECT    = 'tamil-lyrics-app';
const TENANT     = 'group2';
const COLLECTION = `${TENANT}_gameInterludes`;

// Try alternate shorter search queries for tricky songs
const RETRY_SONGS = [
  { name: 'Thendral vandhu theendum bodhu', movie: '', searchOverride: 'Thendral vandhu theendum Tamil', start: 90, duration: 20 },
];

function loadEnv() {
  const env = {};
  fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8').split('\n').forEach(line => {
    const i = line.indexOf('=');
    if (i > 0) {
      let val = line.slice(i + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      env[line.slice(0, i).trim()] = val;
    }
  });
  return env;
}

function slug(name) { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

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
    const r = https.request({ hostname: u.hostname, path: u.pathname + u.search, method, headers: { ...headers, ...(buf ? { 'Content-Length': buf.length } : {}) } }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 300)}`));
        try { resolve(JSON.parse(text)); } catch { resolve(text); }
      });
    });
    r.on('error', reject);
    if (buf) r.write(buf);
    r.end();
  });
}

async function main() {
  const env = loadEnv();
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const blobToken = env.BLOB_READ_WRITE_TOKEN;
  const firestoreToken = (await request('POST', 'https://oauth2.googleapis.com/token',
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${generateJWT(sa)}`
  )).access_token;

  console.log('✓ Tokens ready\n');

  for (const song of RETRY_SONGS) {
    const songSlug = slug(song.name);
    const tempFile = path.join(OUT_DIR, `_retry.mp3`);
    const finalFile = path.join(OUT_DIR, `${songSlug}.mp3`);
    [tempFile, finalFile].forEach(f => { try { fs.unlinkSync(f); } catch {} });

    const searchQ = song.searchOverride || `${song.name} Tamil song`;
    console.log(`Processing: ${song.name}\nSearch: "${searchQ}"`);

    process.stdout.write('  ↓ Downloading… ');
    execSync(`"${YT_DLP}" --js-runtimes "node:${NODE_EXE}" --ffmpeg-location "${FFMPEG_BIN}" -x --audio-format mp3 --audio-quality 128K --no-playlist -o "${path.join(OUT_DIR, '_retry.%(ext)s')}" "ytsearch1:${searchQ}"`, { timeout: 180000, stdio: 'inherit' });
    console.log('\n  ↓ Download done');

    process.stdout.write('  ✂  Trimming… ');
    execSync(`"${FFMPEG}" -ss ${song.start} -t ${song.duration} -i "${tempFile}" -acodec libmp3lame -ab 128k -y "${finalFile}"`, { timeout: 30000, stdio: 'pipe' });
    try { fs.unlinkSync(tempFile); } catch {}
    console.log('done');

    process.stdout.write('  ↑ Uploading to Vercel Blob… ');
    const fileData = fs.readFileSync(finalFile);
    const meta = await request('PUT', `https://blob.vercel-storage.com/interludes/${songSlug}.mp3`,
      { 'Authorization': `Bearer ${blobToken}`, 'Content-Type': 'audio/mpeg', 'x-api-version': '7' }, fileData);
    const url = meta.url;
    console.log('done');

    process.stdout.write('  💾 Saving to Firestore… ');
    const fsFields = { songName: { stringValue: song.name }, movieName: { stringValue: song.movie || '' }, interludeUrl: { stringValue: url }, startTime: { integerValue: String(song.start) }, endTime: { integerValue: String(song.start + song.duration) }, createdAt: { stringValue: new Date().toISOString() }, status: { stringValue: 'active' } };
    await request('PATCH', `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${COLLECTION}/${songSlug}`,
      { 'Authorization': `Bearer ${firestoreToken}`, 'Content-Type': 'application/json' },
      JSON.stringify({ fields: fsFields }));
    console.log('done');
    console.log(`  ✓ URL: ${url}`);
  }
}

main().catch(console.error);
