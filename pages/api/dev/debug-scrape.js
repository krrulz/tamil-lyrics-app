// pages/api/dev/debug-scrape.js
// TEMPORARY DEBUG ENDPOINT — remove after testing
// Usage: GET /api/dev/debug-scrape?song=Malare+Mounama&key=Music@Belgi2026

export default async function handler(req, res) {
  const { song, key } = req.query;

  if (key !== process.env.DEV_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const songName = song || 'Malare Mounama';
  const logs = [];
  const log = (msg) => { console.log(msg); logs.push(msg); };

  const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml',
  };

  function toSlug(name) {
    return name.toLowerCase().trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
  }

  const slug = toSlug(songName);
  const url = `https://tamillyrics143.com/lyrics/${slug}-song-lyrics/`;
  log(`Testing song: "${songName}"`);
  log(`Slug: ${slug}`);
  log(`URL: ${url}`);

  // Test 1: DNS resolution
  try {
    const { resolve4 } = await import('dns/promises');
    const addrs = await resolve4('tamillyrics143.com');
    log(`DNS OK: ${addrs.join(', ')}`);
  } catch (e) {
    log(`DNS FAILED: ${e.code} — ${e.message}`);
  }

  // Test 2: Direct URL fetch
  let html = null;
  let fetchStatus = null;
  let fetchError = null;
  try {
    const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    fetchStatus = r.status;
    log(`Fetch status: ${r.status}`);
    log(`Content-Type: ${r.headers.get('content-type')}`);
    if (r.ok) {
      html = await r.text();
      log(`Response length: ${html.length} bytes`);
      log(`Has <h1>: ${html.includes('<h1')}`);
      log(`Has entry-content: ${html.includes('entry-content')}`);
      log(`Has Tamil chars: ${/[\u0B80-\u0BFF]/.test(html)}`);
      log(`Has "Share this Lyrics": ${html.includes('Share this Lyrics')}`);

      // Show 300 chars after h1
      const h1idx = html.indexOf('<h1');
      if (h1idx > -1) {
        log(`After <h1> (300 chars): ${html.substring(h1idx, h1idx + 300).replace(/\s+/g, ' ')}`);
      }

      // Try extraction
      let clean = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[\s\S]*?<\/nav>/gi, '')
        .replace(/<header[\s\S]*?<\/header>/gi, '')
        .replace(/<footer[\s\S]*?<\/footer>/gi, '')
        .replace(/<aside[\s\S]*?<\/aside>/gi, '');

      const afterH1Match = clean.match(/<h1[^>]*>[\s\S]*?<\/h1>([\s\S]+)/i);
      if (!afterH1Match) {
        log('EXTRACT FAIL: no h1 match after cleaning');
      } else {
        let body = afterH1Match[1].split(/Share this Lyrics|SONG DETAILS/i)[0];
        const plain = body
          .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n')
          .replace(/<p[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ')
          .replace(/\n{3,}/g, '\n\n').trim();
        const lines = plain.split('\n').map(l => l.trim()).filter(Boolean);
        const tamil = lines.filter(l => /[\u0B80-\u0BFF]/.test(l));
        const english = lines.filter(l => !/[\u0B80-\u0BFF]/.test(l) && l.length > 3);
        log(`Extracted ${lines.length} total lines`);
        log(`Tamil lines: ${tamil.length} | Sample: ${tamil[0] || 'none'}`);
        log(`English lines: ${english.length} | Sample: ${english.find(l => !/^(Song|Starring|Music|Singer|Lyricist)/i.test(l)) || 'none'}`);
      }
    } else {
      const body = await r.text();
      log(`Error body (200 chars): ${body.substring(0, 200)}`);
    }
  } catch (e) {
    fetchError = e.message;
    log(`FETCH ERROR: ${e.message}`);
  }

  // Test 3: Try alternate slug (with known mapping)
  const KNOWN_SLUGS = {
    'malare-mounama': 'malare-mounama-song-lyrics',
    'theradi-veedhiyil': 'theradi-veethiyil-song-lyrics',
    'aasai-aasai': 'aasai-aasai-ippozhudhu-song-lyrics',
  };
  const knownSlug = KNOWN_SLUGS[slug];
  if (knownSlug && knownSlug !== `${slug}-song-lyrics`) {
    const altUrl = `https://tamillyrics143.com/lyrics/${knownSlug}/`;
    log(`\nTrying known slug URL: ${altUrl}`);
    try {
      const r2 = await fetch(altUrl, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
      log(`Alt fetch status: ${r2.status}`);
      if (r2.ok) {
        const h2 = await r2.text();
        log(`Alt response length: ${h2.length}`);
      }
    } catch (e) {
      log(`Alt fetch ERROR: ${e.message}`);
    }
  }

  return res.status(200).json({ song: songName, slug, url, fetchStatus, fetchError, logs });
}
