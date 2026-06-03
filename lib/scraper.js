// lib/scraper.js
// Primary: tamil2lyrics.com (has Male:/Female:/Chorus: labels + Tamil script)
// Fallback 1: tamillyrics143.com
// Fallback 2: aanmeegamlyrics.com (devotional/spiritual Tamil lyrics)

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.google.com/',
};

const BASE_T2L   = 'https://www.tamil2lyrics.com/lyrics/';
const BASE_TL143 = 'https://tamillyrics143.com/lyrics/';

// Slug overrides for tamil2lyrics.com — add entries when auto-detection fails
const T2L_SLUGS = {
  // Spelling variants (double vowels, ae/ai differences)
  'roja-roja':                        'rojaa-rojaa-song-lyrics',
  'manguyile-poonguyile':             'maanguyile-poonguyile-duet-song-lyrics',
  'maanguyile-poonguyile':            'maanguyile-poonguyile-duet-song-lyrics',
  'manguyilae-poonguyilae':           'maanguyile-poonguyile-duet-song-lyrics',
  'enoda-laila':                      'ennoda-laila-song-lyrics',
  'ennodu-laila':                     'ennoda-laila-song-lyrics',
  'theradi-veedhiyil':                'theradi-veethiyil-song-lyrics',
  'poi-solla-koodadhu':               'poi-solla-koodathu-song-lyrics',
  'kaadhal-pisaase':                  'kadhal-pisase-song-lyrics',
  'kokkara-kokkara-ko':               'kokkarakko-song-lyrics',
  'then-then':                        'thaen-thaen-thaen-song-lyrics',
  'thaamarai-poovukkum':              'thamarai-poovukum-song-lyrics',
  'neeya-pesiyadhu':                  'neeya-pesiyadhu-en-anbae-song-lyrics',
  'thottu-thottu-pesum-sulthana':     'thottu-thottu-pesum-sultana-song-lyrics',
  'poo-vaasam':                       'poo-vaasam-purappadum-song-lyrics',
  'kadhal-vandhaal-solli-anuppu':     'kaadhal-vandhaal-solli-anuppu-song-lyrics',
  'koduva-meesai':                    'koduvaa-meesai-song-lyrics',
  'poovukkellam-siragu':              'poovukellam-siragu-song-lyrics',
  'azhagooril-poothavale':            'azhagooril-poothavale-song-lyrics',
  'thaalatum-kaatre-vaa':             'thalaattum-kaatre-vaa-song-lyrics',
  // New batch (Janaki/Rahman/Raja classics)
  'thenmadurai-vaigainadi':           'then-madurai-vaigai-nadhi-song-lyrics',
  'then-madurai-vaigai-nadhi':        'then-madurai-vaigai-nadhi-song-lyrics',
  'mustafa-mustafa':                  'mustafa-mustafa-song-lyrics',
  'sorgame-endralum':                 'sorgame-endralum-song-lyrics',
  'andha-arabi-kadaloram':            'andha-arabickadaloram-song-lyrics',
  'andha-arabic-kadaloram':           'andha-arabickadaloram-song-lyrics',
  'vaarayo-thozhi':                   'vaaraayo-thozhi-song-lyrics',
  'varayo-thozhi':                    'vaaraayo-thozhi-song-lyrics',
  'vaarayo-thozhi':                   'vaaraayo-thozhi-song-lyrics',
  'soniya-soniya':                    'sonia-sonia-song-lyrics',
  'sonia-sonia':                      'sonia-sonia-song-lyrics',
  'ennai-kaanavilaye':                'ennai-kaanavillaiye-song-lyrics',
  'ennai-kaanavillai':                'ennai-kaanavillaiye-song-lyrics',
  'ennai-kanavillai':                 'ennai-kaanavillaiye-song-lyrics',
  'thanga-thamarai':                  'thangaa-thaamarai-magalae-song-lyrics',
  'thanga-thaamarai':                 'thangaa-thaamarai-magalae-song-lyrics',
  'thanga-thamarai-magale':           'thangaa-thaamarai-magalae-song-lyrics',
  'sundari-kanal-oru-sethi':          'sundari-kannaal-oru-song-lyrics',
  'sundari-kannal-oru-sethi':         'sundari-kannaal-oru-song-lyrics',
  'sundari-kannal':                   'sundari-kannaal-oru-song-lyrics',
  'valai-osai':                       'valai-osai-song-lyrics',
  'valaiyosai':                       'valai-osai-song-lyrics',
  'konja-naal-poru-thalaiva':         'konja-naal-poru-thalaivaa-song-lyrics',
  'konja-naal-poru-thalaivaa':        'konja-naal-poru-thalaivaa-song-lyrics',
  'vellarika-pinju-vellarika':        'vellarikka-pinju-vellarikka-song-lyrics',
  'vellarikka-pinju-vellarikka':      'vellarikka-pinju-vellarikka-song-lyrics',
  'otakara-marimuthu':                'odakara-marimuthu-song-lyrics',
  'odakara-marimuthu':                'odakara-marimuthu-song-lyrics',
  'ottakara-marimuthu':               'odakara-marimuthu-song-lyrics',
  'kanmani-anbodu':                   'kanmani-anbodu-song-lyrics',
  'aval-varuvala':                    'aval-varuvala-song-lyrics',
  'aval-varuvaala':                   'aval-varuvala-song-lyrics',
  'athangarai-marame':                'aathangara-marame-song-lyrics',
  'aathangara-marame':                'aathangara-marame-song-lyrics',
  'aathangarai-marame':               'aathangara-marame-song-lyrics',
  'mandram-vandha':                   'mandram-vandha-song-lyrics',
  'kadhalenum-therveyaudhi':          'kadhalenum-thervezhudhi-song-lyrics',
  'kadhalenum-thervezhudhi':          'kadhalenum-thervezhudhi-song-lyrics',
  'kadhal-enum-thervezhudhi':         'kadhalenum-thervezhudhi-song-lyrics',
  'oora-therinjikitu':                'oora-therinjikitten-song-lyrics',
  'oora-therinjikitten':              'oora-therinjikitten-song-lyrics',
  'oora-therinchikitten':             'oora-therinjikitten-song-lyrics',
  'thendral-vandhu-theendum-bodhu':   'thendral-vanthu-theendumbothu-song-lyrics',
  'thendral-vandhu-theendumbothu':    'thendral-vanthu-theendumbothu-song-lyrics',
  'thendral-vanthu-theendumbothu':    'thendral-vanthu-theendumbothu-song-lyrics',
  'nee-kaatum-selai-madipila':        'selai-kattum-pennukkoru-song-lyrics',
  'selai-kattum-pennukoru':           'selai-kattum-pennukkoru-song-lyrics',
  'selai-kattum-pennukkoru-vaasam':   'selai-kattum-pennukkoru-song-lyrics',
  'ra-ra-ra-ramaya':                  'ra-ra-ra-ramaiya-song-lyrics',
  'ra-ra-ra-ramaiya':                 'ra-ra-ra-ramaiya-song-lyrics',
  'raa-raa-raa-ramaiya':              'ra-ra-ra-ramaiya-song-lyrics',
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

// Collapse Tamil romanization variants so roja≡rojaa, kaadhal≡kadhal, veedhiyil≡veethiyil, etc.
// Used only for comparison — never for URL construction.
function tamilNorm(s) {
  return s
    .replace(/aa/g, 'a').replace(/ee/g, 'e').replace(/oo/g, 'o').replace(/ii/g, 'i')
    .replace(/ae/g, 'e')
    .replace(/([bcdfghjklmnpqrstvwxyz])\1/g, '$1')  // double consonants → single
    .replace(/dh/g, 'd').replace(/th/g, 't')
    .replace(/zh/g, 'l');
}

function scoreSlugMatch(nameWords, slugCandidate) {
  // Strip common suffixes, split on hyphens, then normalize each word
  const slugWords = tamilNorm(
    slugCandidate.replace(/-song-lyrics$/, '').replace(/-duet$/, '').replace(/-/g, ' ')
  ).split(' ').filter(Boolean);

  let score = 0;
  let matchedWords = 0;
  for (const nw of nameWords) {
    let hit = false;
    for (const sw of slugWords) {
      if (sw === nw)                          { score += 3; hit = true; break; }
      if (sw.startsWith(nw) || nw.startsWith(sw)) { score += 2; hit = true; break; }
      if (sw.includes(nw)   || nw.includes(sw))   { score += 1; hit = true; break; }
    }
    if (hit) matchedWords++;
  }
  // Big bonus when every name word is found in the slug
  if (matchedWords === nameWords.length) score += nameWords.length * 2;
  // Penalty for each extra word the slug has beyond the name
  score -= Math.max(0, slugWords.length - nameWords.length);
  return score;
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

// Search tamil2lyrics.com's own WordPress search to find the correct slug
async function searchT2L(songName) {
  const searchUrl = `https://www.tamil2lyrics.com/?s=${encodeURIComponent(songName)}`;
  console.log(`[scraper] T2L site search: ${searchUrl}`);
  try {
    const html = await fetchPage(searchUrl);
    if (!html) return null;

    const matches = [...html.matchAll(/href="https?:\/\/www\.tamil2lyrics\.com\/lyrics\/([^/"]+)\/"/g)];
    if (!matches.length) return null;

    // Normalize name words once for comparison
    const normName = tamilNorm(songName.toLowerCase().replace(/[^a-z0-9\s]/g, ''));
    const nameWords = normName.split(/\s+/).filter(w => w.length > 1);

    let best = null, bestScore = -1;
    for (const m of matches) {
      const score = scoreSlugMatch(nameWords, m[1]);
      if (score > bestScore) { bestScore = score; best = m[1]; }
    }

    if (best && bestScore > 0) {
      console.log(`[scraper] T2L search found: ${best} (score=${bestScore})`);
      return best;
    }
    return null;
  } catch (err) {
    console.error('[scraper] T2L search error:', err.message);
    return null;
  }
}

async function scrapeT2L(songName) {
  const key = toKey(songName);

  // Step 1: known override
  if (T2L_SLUGS[key]) {
    const html = await fetchPage(`${BASE_T2L}${T2L_SLUGS[key]}/`);
    if (html && (html.includes('id="English"') || html.includes('id="Tamil"'))) {
      console.log(`[scraper] T2L known slug hit: ${T2L_SLUGS[key]}`);
      return extractT2LTabs(html);
    }
  }

  // Step 2a: direct slug guess (original spelling)
  const directSlug = `${key}-song-lyrics`;
  const directHtml = await fetchPage(`${BASE_T2L}${directSlug}/`);
  if (directHtml && (directHtml.includes('id="English"') || directHtml.includes('id="Tamil"'))) {
    console.log(`[scraper] T2L direct slug hit: ${directSlug}`);
    return extractT2LTabs(directHtml);
  }

  // Step 2b: try slug with vowel-elongation collapsed (aa→a, ee→e, oo→o)
  const normKey = tamilNorm(key);
  if (normKey !== key) {
    const normSlug = `${normKey}-song-lyrics`;
    const normHtml = await fetchPage(`${BASE_T2L}${normSlug}/`);
    if (normHtml && (normHtml.includes('id="English"') || normHtml.includes('id="Tamil"'))) {
      console.log(`[scraper] T2L normalized slug hit: ${normSlug}`);
      return extractT2LTabs(normHtml);
    }
  }

  // Step 3: use the site's own search to find the correct slug
  console.log(`[scraper] T2L direct failed, searching site for: ${songName}`);
  const foundSlug = await searchT2L(songName);
  if (foundSlug) {
    const html = await fetchPage(`${BASE_T2L}${foundSlug}/`);
    if (html && (html.includes('id="English"') || html.includes('id="Tamil"'))) {
      console.log(`[scraper] T2L search success: '${key}' → '${foundSlug}'`);
      return extractT2LTabs(html);
    }
  }

  console.log(`[scraper] T2L: all methods failed for: ${songName}`);
  return { english: null, tamil: null };
}

function extractT2LTabs(html) {
  const english = html.includes('id="English"') ? extractT2LTab(html, 'English') : null;
  const tamil   = html.includes('id="Tamil"')   ? extractT2LTab(html, 'Tamil')   : null;
  console.log(`[scraper] T2L tabs — en=${english?.length ?? 0}, ta=${tamil?.length ?? 0}`);
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

async function searchTL143(songName) {
  const searchUrl = `https://tamillyrics143.com/?s=${encodeURIComponent(songName)}`;
  console.log(`[scraper] TL143 site search: ${searchUrl}`);
  try {
    const html = await fetchPage(searchUrl);
    if (!html) return null;
    const matches = [...html.matchAll(/href="https?:\/\/tamillyrics143\.com\/lyrics\/([^/"]+)\/"/g)];
    if (!matches.length) return null;
    const normName = tamilNorm(songName.toLowerCase().replace(/[^a-z0-9\s]/g, ''));
    const nameWords = normName.split(/\s+/).filter(w => w.length > 1);
    let best = null, bestScore = -1;
    for (const m of matches) {
      const score = scoreSlugMatch(nameWords, m[1]);
      if (score > bestScore) { bestScore = score; best = m[1]; }
    }
    if (best && bestScore > 0) {
      console.log(`[scraper] TL143 search found: ${best} (score=${bestScore})`);
      return best;
    }
    return null;
  } catch (err) {
    console.error('[scraper] TL143 search error:', err.message);
    return null;
  }
}

async function scrapeTL143(songName) {
  const key = toKey(songName);

  // Step 1: known override
  if (TL143_SLUGS[key]) {
    const html = await fetchPage(`${BASE_TL143}${TL143_SLUGS[key]}/`);
    if (html) {
      if (html.includes('id="English"'))
        return { english: extractByTabDiv(html, 'English'), tamil: extractByTabDiv(html, 'Tamil') };
      const plain = extractPlainLyrics(html);
      if (plain) return { english: plain, tamil: null };
    }
  }

  // Step 2: direct slug guess
  const directSlug = `${key}-song-lyrics`;
  const url = `${BASE_TL143}${directSlug}/`;
  console.log(`[scraper] tamillyrics143 fallback: ${url}`);
  const html = await fetchPage(url);
  if (html) {
    if (html.includes('id="English"'))
      return { english: extractByTabDiv(html, 'English'), tamil: extractByTabDiv(html, 'Tamil') };
    const plain = extractPlainLyrics(html);
    if (plain) return { english: plain, tamil: null };
  }

  // Step 3: site search fallback
  const foundSlug = await searchTL143(songName);
  if (foundSlug) {
    const searchHtml = await fetchPage(`${BASE_TL143}${foundSlug}/`);
    if (searchHtml) {
      if (searchHtml.includes('id="English"'))
        return { english: extractByTabDiv(searchHtml, 'English'), tamil: extractByTabDiv(searchHtml, 'Tamil') };
      const plain = extractPlainLyrics(searchHtml);
      if (plain) return { english: plain, tamil: null };
    }
  }

  return { english: null, tamil: null };
}

// ─── aanmeegamlyrics.com ──────────────────────────────────────────────────────
// WordPress/Newspaper theme — lyrics in <div class="td-post-content tagdiv-type">
// Tamil-only content (devotional/spiritual songs). No English tab.

const BASE_AML = 'https://aanmeegamlyrics.com';

// Metadata lines to skip (Tamil + English patterns)
const AML_META = /^(அருளியவர்|தலம்|நாடு|சிறப்பு|திருச்சிற்றம்பலம்|Song|Singers?|Music|Lyricist|Penned|Composed|திரைப்படம்|இசை|பாடியவர்)/i;

function extractAmlLyrics(html) {
  const start = html.indexOf('td-post-content tagdiv-type');
  if (start === -1) return null;
  const tagEnd = html.indexOf('>', start);
  if (tagEnd === -1) return null;

  // Grab content until closing section (next major section or related posts)
  const stopMarkers = ['td-module-meta-info', 'td-related', 'td-block-title', 'td-post-next-prev'];
  let endIdx = html.length;
  for (const m of stopMarkers) {
    const i = html.indexOf(m, tagEnd);
    if (i !== -1 && i < endIdx) endIdx = i;
  }

  const section = html.slice(tagEnd + 1, endIdx);

  // Strip ads, scripts, ins tags
  const cleaned = section
    .replace(/<div[^>]*class="[^"]*quads[^"]*"[\s\S]*?<\/div>/gi, '')
    .replace(/<ins[\s\S]*?<\/ins>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');

  // Extract text from <p> tags
  const paras = [...cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(m => m[1]
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '')
      .replace(/\([^)]*lyrics[^)]*\)/gi, '') // strip "(Song Name Lyrics)" titles
      .trim()
    )
    .filter(p => p.length > 0);

  // Filter out metadata lines, keep only lyric content
  const lyricLines = [];
  let foundLyrics = false;
  for (const para of paras) {
    const lines = para.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (AML_META.test(line)) continue;
      if (line.length < 3) continue;
      // Once we find a Tamil character-heavy line, we're in lyrics
      const tamilChars = (line.match(/[஀-௿]/g) || []).length;
      if (tamilChars > 2) foundLyrics = true;
      if (foundLyrics) lyricLines.push(line);
    }
    if (foundLyrics && lines.length > 0) lyricLines.push(''); // blank line between paras
  }

  const result = lyricLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return result.length > 30 ? result : null;
}

async function searchAML(songName) {
  const searchUrl = `${BASE_AML}/?s=${encodeURIComponent(songName)}`;
  console.log(`[scraper] AML site search: ${searchUrl}`);
  try {
    const html = await fetchPage(searchUrl);
    if (!html) return null;

    // Match song page URLs: /category/slug/
    const matches = [...html.matchAll(/href="https?:\/\/aanmeegamlyrics\.com\/([a-z0-9-]+)\/([a-z0-9-]+)\/"/g)]
      .filter(m => !['category', 'tag', 'author', 'page', 'search'].includes(m[1]));

    if (!matches.length) return null;

    const normName = tamilNorm(songName.toLowerCase().replace(/[^a-z0-9\s]/g, ''));
    const nameWords = normName.split(/\s+/).filter(w => w.length > 1);

    let best = null, bestScore = -1;
    for (const m of matches) {
      const slug = m[2];
      const score = scoreSlugMatch(nameWords, slug);
      if (score > bestScore) { bestScore = score; best = `${BASE_AML}/${m[1]}/${slug}/`; }
    }

    if (best && bestScore >= 0) {
      console.log(`[scraper] AML search found: ${best} (score=${bestScore})`);
      return best;
    }
    return null;
  } catch (err) {
    console.error('[scraper] AML search error:', err.message);
    return null;
  }
}

async function scrapeAML(songName) {
  // Direct slug guess
  const key = toKey(songName);
  const directUrl = `${BASE_AML}/${key}-lyrics/`;
  console.log(`[scraper] AML direct: ${directUrl}`);
  let html = await fetchPage(directUrl);
  if (html && html.includes('td-post-content')) {
    const tamil = extractAmlLyrics(html);
    if (tamil) { console.log(`[scraper] AML direct hit: ${directUrl}`); return { tamil, english: null }; }
  }

  // Site search fallback
  const foundUrl = await searchAML(songName);
  if (foundUrl) {
    html = await fetchPage(foundUrl);
    if (html && html.includes('td-post-content')) {
      const tamil = extractAmlLyrics(html);
      if (tamil) { console.log(`[scraper] AML search hit: ${foundUrl}`); return { tamil, english: null }; }
    }
  }

  console.log(`[scraper] AML: not found for: ${songName}`);
  return { tamil: null, english: null };
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
  if (tl.english || tl.tamil) {
    console.log(`[scraper] tamillyrics143 — en=${tl.english?.length ?? 0}, ta=${tl.tamil?.length ?? 0}`);
    return tl;
  }

  console.log(`[scraper] Falling back to aanmeegamlyrics for: ${songName}`);
  const aml = await scrapeAML(songName);
  console.log(`[scraper] aanmeegamlyrics — ta=${aml.tamil?.length ?? 0}`);
  return aml;
}
