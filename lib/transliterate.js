// lib/transliterate.js
// Rule-based Tamil Unicode → English transliteration (no API needed, always works)
// Covers all Tamil vowels, consonants and vowel markers

const VOWELS = {
  'அ':'a','ஆ':'aa','இ':'i','ஈ':'ii','உ':'u','ஊ':'uu',
  'எ':'e','ஏ':'ae','ஐ':'ai','ஒ':'o','ஓ':'oe','ஔ':'au',
};

const CONSONANTS = {
  'க':'k','ங':'ng','ச':'ch','ஞ':'nj','ட':'t','ண':'n',
  'த':'th','ந':'n','ப':'p','ம':'m','ய':'y','ர':'r',
  'ல':'l','வ':'v','ழ':'zh','ள':'l','ற':'tr','ன':'n',
  'ஜ':'j','ஷ':'sh','ஸ':'s','ஹ':'h','ஃ':'k',
};

const VOWEL_MARKERS = {
  'ா':'aa','ி':'i','ீ':'ii','ு':'u','ூ':'uu',
  'ெ':'e','ே':'ae','ை':'ai','ொ':'o','ோ':'oe','ௌ':'au',
  '்':'',   // pulli - kill the inherent 'a'
};

const SPECIAL = {
  '।':'।','॥':'॥','ஶ்ரீ':'shri',
};

function transliterateChar(chars, i) {
  // Check special sequences first
  for (const [key, val] of Object.entries(SPECIAL)) {
    if (chars.slice(i, i + key.length).join('') === key) return [val, key.length];
  }

  const ch = chars[i];

  // Standalone vowel
  if (VOWELS[ch]) return [VOWELS[ch], 1];

  // Consonant — check what follows
  if (CONSONANTS[ch]) {
    const base = CONSONANTS[ch];
    const next = chars[i + 1];
    if (next && VOWEL_MARKERS[next] !== undefined) {
      // Consonant + vowel marker (including pulli which gives '')
      return [base + VOWEL_MARKERS[next], 2];
    }
    // Consonant alone = inherent 'a' (unless at end of word handled separately)
    return [base + 'a', 1];
  }

  // Not a Tamil character — pass through as-is
  return [ch, 1];
}

function transliterateLine(line) {
  // Preserve speaker labels like "Male :", "Female :", "Chorus :"
  const speakerMatch = line.match(/^(\s*(?:Male|Female|Chorus|Man|Woman|Both|Duet|Solo|All|Hero|Heroine)[\s:.\]–-]*)/i);
  if (speakerMatch) {
    const prefix = speakerMatch[0];
    const rest = line.slice(prefix.length);
    return prefix + transliterateLine(rest);
  }

  const chars = [...line]; // handles multi-byte Unicode correctly
  let result = '';
  let i = 0;
  while (i < chars.length) {
    const [out, consumed] = transliterateChar(chars, i);
    result += out;
    i += consumed;
  }
  return result;
}

export function tamilToEnglishRuleBased(tamilText) {
  if (!tamilText) return null;
  return tamilText
    .split('\n')
    .map(transliterateLine)
    .join('\n');
}

// Kept for API compatibility — now uses rule-based, never fails
export async function fillMissingLyrics(songName, tamilText, englishText) {
  if (tamilText && englishText) {
    return { tamil: tamilText, english: englishText, tamilSource: 'scraped', englishSource: 'scraped' };
  }

  if (!tamilText && !englishText) {
    return { tamil: null, english: null, tamilSource: 'not_found', englishSource: 'not_found' };
  }

  if (tamilText && !englishText) {
    console.log(`[transliterate] Tamil→English (rule-based) for: ${songName}`);
    const generated = tamilToEnglishRuleBased(tamilText);
    return {
      tamil: tamilText,
      english: generated || null,
      tamilSource: 'scraped',
      englishSource: generated ? 'transliterated' : 'not_found',
    };
  }

  // English only — return as-is, we can't reverse-transliterate reliably
  return {
    tamil: null,
    english: englishText,
    tamilSource: 'not_found',
    englishSource: 'scraped',
  };
}
