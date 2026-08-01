'use strict';
// sync-blob-to-firestore.js
// Lists existing files in Vercel Blob (interludes/ prefix) and writes their
// URLs + timing data into Firestore — no downloads needed.
// Collection is derived from TENANT_ID in .env.local (e.g. group2_gameInterludes),
// or plain 'gameInterludes' when TENANT_ID is not set.
// Run: node scripts/sync-blob-to-firestore.js

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const PROJECT       = 'tamil-lyrics-app';
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
    const buf = body ? Buffer.from(body) : null;
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
  const env = loadEnv();
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const blobToken = env.BLOB_READ_WRITE_TOKEN;
  const tenant = env.TENANT_ID || '';
  const COLLECTION = tenant ? `${tenant}_gameInterludes` : 'gameInterludes';

  console.log(`TENANT_ID: ${tenant || '(none)'} → writing to Firestore collection: ${COLLECTION}\n`);

  const timings = JSON.parse(fs.readFileSync(path.join(__dirname, 'interlude-timings.json'), 'utf8'));

  // Step 1: List all blobs with prefix interludes/
  process.stdout.write('Listing Vercel Blob files… ');
  const blobList = await request('GET', 'https://blob.vercel-storage.com?prefix=interludes%2F&limit=100',
    { 'Authorization': `Bearer ${blobToken}`, 'x-api-version': '7' }
  );
  const blobs = blobList.blobs || [];
  console.log(`found ${blobs.length} files`);

  if (!blobs.length) {
    console.log('No blob files found under interludes/. Run upload-timings.js first.');
    process.exit(1);
  }

  // Build a map: docId → blob URL
  // Blob pathnames may have a random suffix (e.g. "interludes/amma-amma-AbCdEf.mp3")
  // so match by checking if pathname starts with the docId
  const blobMap = {};
  for (const b of blobs) {
    const filename = b.pathname.replace(/^interludes\//, '');
    for (const { docId } of timings) {
      if (filename.startsWith(docId)) {
        blobMap[docId] = b.url;
        break;
      }
    }
  }
  console.log(`Matched ${Object.keys(blobMap).length} of ${timings.length} songs to blob files\n`);

  // Step 2: Get Firestore token
  process.stdout.write('Obtaining Firestore token… ');
  const firestoreToken = (await request('POST', 'https://oauth2.googleapis.com/token',
    { 'Content-Type': 'application/x-www-form-urlencoded' },
    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${generateJWT(sa)}`
  )).access_token;
  console.log('✓\n');

  // Step 3: For each song in timings, write Firestore doc if blob exists
  let ok = 0, missing = 0;
  for (const { song, docId, start } of timings) {
    const url = blobMap[docId];
    if (!url) {
      console.log(`  ✗ No blob for ${docId} (${song}) — skipping`);
      missing++;
      continue;
    }

    process.stdout.write(`  💾 ${song}… `);
    try {
      await request('PATCH',
        `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${COLLECTION}/${docId}`,
        { 'Authorization': `Bearer ${firestoreToken}`, 'Content-Type': 'application/json' },
        JSON.stringify({
          fields: {
            songName:     { stringValue: song },
            movieName:    { stringValue: '' },
            interludeUrl: { stringValue: url },
            startTime:    { integerValue: String(start) },
            endTime:      { integerValue: String(start + CLIP_DURATION) },
            status:       { stringValue: 'active' },
            createdAt:    { stringValue: new Date().toISOString() },
          }
        })
      );
      console.log('✓');
      ok++;
    } catch (e) {
      console.log(`FAILED — ${e.message.slice(0, 120)}`);
      missing++;
    }
  }

  console.log(`\n✓ ${ok} synced   ✗ ${missing} missing/failed`);
  if (missing) console.log('Run upload-timings.js to download and upload the missing ones.');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
