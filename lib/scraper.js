// lib/scraper.js
// Primary: tamil2lyrics.com (has Male:/Female:/Chorus: labels + Tamil script)
// Fallback: tamillyrics143.com

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.google.com/',
};

const BASE_T2L   = 'https://www.tamil2lyrics.com/lyrics/';
const BASE_TL143 = 'https://tamillyrics143.com/lyrics/';

// Slug overrides for tamil2lyrics.com
const T2L_SLUGS = {
  'theradi-veedhiyil':            'theradi-veethiyil-song-lyrics',
  'poi-solla-koodadhu':           'poi-solla-koodathu-song-lyrics',
  'kaadhal-pisaase':              'kadhal-pisase-song-lyrics',
  'kokkara-kokkara-ko':           'kokkarakko-song-lyrics',
  'then-then':                    'thaen-thaen-thaen-song-lyrics',
  'thaamarai-poovukkum':          'thamarai-poovukum-song-lyrics',
  'neeya-pesiyadhu':              'neeya-pesiyadhu-en-anbae-song-lyrics',
  'thottu-thottu-pesum-sulthana': 'thottu-thottu-pesum-sultana-song-lyrics',
  'poo-vaasam':                   'poo-vaasam-purappadum-song-lyrics',
  'kadhal-vandhaal-solli-anuppu': 'kaadhal-vandhaal-solli-anuppu-song-lyrics',
  'koduva-meesai':                'koduvaa-meesai-song-lyrics',
  'poovukkellam-siragu':          'poovukellam-siragu-song-lyrics',
  'azhagooril-poothavale':        'azhagooril-poothavale-song-lyrics',
  'thaalatum-kaatre-vaa':         'thalaattum-kaatre-vaa-song-lyrics',
};

// Slug overrides for tamillyrics143.com (fallback)
const TL143_SLUGS = {
  'theradi-veedhiyil':            'theradi-veethiyil-song-lyrics',
  'poovukkellam-siragu':          'poovukellam-siragu-song-lyrics',
  'poi-solla-koodadhu':           'poi-solla-koodathu-song-lyrics',
  'kaadhal-pisaase':              'kadhal-pisase-song-lyrics',
  'poo-vaasam':                   'poo-vaasam-purappadum-song-lyrics',
  'thottu-thottu-pesum-sulthana': 'thottu-thottu-pesum-sultana-song-lyrics',
  'azhagooril-poothavale':        'azhagooril-poothavale-song-lyrics',
  'kadhal-vandhaal-solli-anuppu': 'kaadhal-vandhaal-song-lyrics',
  'thaamarai-poovukkum':          'thamarai-poovukum-song-lyrics',
  'aasai-aasai':                  'aasai-aasai-ippozhudhu-song-lyrics',
  'appadi-podu':                  'appadi-podu-song-lyrics',
  'kaatrin-mozhi':                'kaatrin-mozhi-song-lyrics',
  'then-then':                    'thaen-thaen-thaen-song-lyrics',
  'neeya-pesiyadhu':              'neeya-pesiyadhu-en-anbae-song-lyrics',
  'kokkara-kokkara-ko':           'kokkarakko-song-lyrics',
  'koduva-meesai':                'koduvaa-meesai-song-lyrics',
  'thaalatum-kaatre-vaa':         'thalaattum-kaatre-vaa-song-lyrics',
};

function toKey(name) {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');
}

async function fetchPage(url) {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(9000) });
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > 1000 ? text : null;
  } catch (err) {
    console.error('fetchPage error:', url, err.message);
    return null;
  }
}

// ─── tamil2lyrics.com ─────────────────────────────────────────────────────────
// Structure: <div id="English" class="tabcontent"> and <div id="Tamil" class="tabcontent">
// Speaker labels: <strong>Male :</strong>, <strong>Female :</strong>, <strong>ஆண் :</strong>

function htmlToText_T2L(html) {
  return html
    .replace(/<strong>\s*(Male|Female|Chorus|Man|Woman|Both|Duet|Solo|All|Hero|Heroine)\s*:?\s*<\/strong>\s*:?\s*/gi,
      (_, lbl) => `\n${lbl.charAt(0).toUpperCase() + lbl.slice(1).toLowerCase()} : `)
    .replace(/<strong>\s*(ஆண்|பெண்|இருவரும்|குழு)\s*:?\s*<\/strong>\s*:?\s*/g,
      (_, lbl) => `\n${lbl} : `)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n').replace(/<p[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function extractT2LTab(html, tabId) {
  const marker = `id="${tabId}"`;
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const tagEnd = html.indexOf('>', start);
  if (tagEnd === -1) return null;

  // Walk nested divs to find matching closing </div>
  let depth = 1, pos = tagEnd + 1;
  while (pos < html.length && depth > 0) {
    const nextOpen  = html.indexOf('<div', pos);
    const nextClose = html.indexOf('</div>', pos);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) { depth++; pos = nextOpen + 4; }
    else { depth--; pos = nextClose + 6; }
  }
  const content = html.slice(tagEnd + 1, depth === 0 ? pos - 6 : pos);
  const text = htmlToText_T2L(content);

  // Strip metadata lines
  const metaPattern = /^(Singers?\s*:|Music\s*(by|Director)?\s*:|Lyricist\s*:|Penned by|Sung by|Composer|பாடகர்கள்|இசையமைப்பாளர்|பாடலாசிரியர்)/i;
  const filtered = [];
  let pastMeta = false;
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) { if (pastMeta) filtered.push(''); continue; }
    if (!pastMeta && metaPattern.test(t)) continue;
    pastMeta = true;
    filtered.push(t);
  }
  const result = filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return result.length > 30 ? result : null;
}

async function searchT2LSlug(songName) {
  // Search DuckDuckGo for the correct tamil2lyrics.com URL
  const query = `site:tamil2lyrics.com/lyrics ${songName} song lyrics`;
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  console.log(`[scraper] DDG search for: ${songName}`);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract tamil2lyrics.com/lyrics/... URLs from search results
    const matches = [...html.matchAll(/https?:\/\/www\.tamil2lyrics\.com\/lyrics\/([^/"&]+)/g)];
    if (!matches.length) return null;

    // Score each result by how closely the slug matches the song name
    const key = toKey(songName); // e.g. "roja-roja"
    const keyWords = key.split('-').filter(w => w.length > 2);

    let best = null, bestScore = 0;
    for (const m of matches) {
      const slug = m[1].replace(/-song-lyrics$/, ''); // e.g. "rojaa-rojaa"
      let score = 0;
      for (const word of keyWords) {
        if (slug.includes(word)) score++;
      }
      if (score > bestScore) { bestScore = score; best = m[1]; }
    }

    if (best && bestScore > 0) {
      console.log(`[scraper] DDG found slug: ${best} (score=${bestScore})`);
      return best;
    }
    return null;
  } catch (err) {
    console.error('[scraper] DDG search error:', err.message);
    return null;
  }
}

async function scrapeT2L(songName) {
  const key = toKey(songName);
  const directSlug = T2L_SLUGS[key] || `${key}-song-lyrics`;
  const directUrl = `${BASE_T2L}${directSlug}/`;
  console.log(`[scraper] tamil2lyrics direct: ${directUrl}`);
  let html = await fetchPage(directUrl);

  // If direct slug has no tabs, search for the correct URL
  if (!html || (!html.includes('id="English"') && !html.includes('id="Tamil"'))) {
    console.log(`[scraper] Direct slug failed, searching for: ${songName}`);
    const foundSlug = await searchT2LSlug(songName);
    if (foundSlug && foundSlug !== directSlug) {
      const foundUrl = `${BASE_T2L}${foundSlug}/`;
      console.log(`[scraper] Retrying with: ${foundUrl}`);
      html = await fetchPage(foundUrl);
    }
  }

  if (!html) return { english: null, tamil: null };

  const hasEnglish = html.includes('id="English"');
  const hasTamil   = html.includes('id="Tamil"');
  if (!hasEnglish && !hasTamil) {
    console.log(`[scraper] T2L: no tabs found for ${songName}`);
    return { english: null, tamil: null };
  }

  const english = hasEnglish ? extractT2LTab(html, 'English') : null;
  const tamil   = hasTamil   ? extractT2LTab(html, 'Tamil')   : null;
  console.log(`[scraper] T2L — en=${english?.length ?? 0}, ta=${tamil?.length ?? 0}`);
  return { english, tamil };
}

// ─── tamillyrics143.com (fallback) ────────────────────────────────────────────

function htmlToText(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<p[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '')
    .replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function extractByTabDiv(html, tabId) {
  const start = html.indexOf(`id="${tabId}"`);
  if (start === -1) return null;
  const tagEnd = html.indexOf('>', start);
  if (tagEnd === -1) return null;
  const content = html.slice(tagEnd + 1);
  const stopPatterns = [`id="Tamil"`, `id="English"`, 'Share this Lyrics', 'SONG DETAILS', 'scriptlesssocialsharing'];
  let endIdx = content.length;
  for (const pat of stopPatterns) {
    const idx = content.indexOf(pat);
    if (idx !== -1 && idx < endIdx) endIdx = idx;
  }
  const text = htmlToText(content.slice(0, endIdx));
  return text.length > 30 ? text : null;
}

function extractPlainLyrics(html) {
  const start = html.indexOf('class="lyric-text');
  if (start === -1) return null;
  const tagEnd = html.indexOf('>', start);
  const content = html.slice(tagEnd + 1);
  const stopPatterns = ['Share this Lyrics','SONG DETAILS','scriptlesssocialsharing','perfmatters-lazy-youtube'];
  let endIdx = content.length;
  for (const pat of stopPatterns) { const i = content.indexOf(pat); if (i !== -1 && i < endIdx) endIdx = i; }
  let body = content.slice(0, endIdx)
    .replace(/<div[^>]*id="ad-header"[\s\S]*?<\/div>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<ins[\s\S]*?<\/ins>/gi, '');
  const text = htmlToText(body);
  const lines = text.split('\n');
  const metaPattern = /^(Song Details|Starring|Music:|Singer|Lyricist|Music Label|Composer|Penned by|Sung by)/i;
  const filtered = []; let pastMeta = false;
  for (const line of lines) {
    const t = line.trim();
    if (!t) { if (pastMeta) filtered.push(''); continue; }
    if (!pastMeta && metaPattern.test(t)) continue;
    pastMeta = true; filtered.push(t);
  }
  const result = filtered.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return result.length > 30 ? result : null;
}

async function scrapeTL143(songName) {
  const key = toKey(songName);
  const slug = TL143_SLUGS[key] || `${key}-song-lyrics`;
  const url = `${BASE_TL143}${slug}/`;
  console.log(`[scraper] tamillyrics143 fallback: ${url}`);
  const html = await fetchPage(url);
  if (!html) return { english: null, tamil: null };
  if (html.includes('id="English"')) {
    return { english: extractByTabDiv(html, 'English'), tamil: extractByTabDiv(html, 'Tamil') };
  }
  return { english: extractPlainLyrics(html), tamil: null };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function scrapeBothLyricsOptimised(songName) {
  const t2l = await scrapeT2L(songName);
  if (t2l.english || t2l.tamil) {
    console.log(`[scraper] Got from tamil2lyrics — en=${t2l.english?.length ?? 0}, ta=${t2l.tamil?.length ?? 0}`);
    return t2l;
  }
  console.log(`[scraper] Falling back to tamillyrics143 for: ${songName}`);
  const tl = await scrapeTL143(songName);
  console.log(`[scraper] tamillyrics143 — en=${tl.english?.length ?? 0}, ta=${tl.tamil?.length ?? 0}`);
  return tl;
}
