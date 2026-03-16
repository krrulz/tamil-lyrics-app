// lib/transliterate.js
// Tamil Unicode → English transliteration (rule-based, no API needed)
// English → Tamil is NOT attempted — rule-based reverse is grammatically unreliable

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
  '்':'',
};

function transliterateChar(chars, i) {
  const ch = chars[i];
  if (VOWELS[ch]) return [VOWELS[ch], 1];
  if (CONSONANTS[ch]) {
    const base = CONSONANTS[ch];
    const next = chars[i + 1];
    if (next && VOWEL_MARKERS[next] !== undefined) return [base + VOWEL_MARKERS[next], 2];
    return [base + 'a', 1];
  }
  return [ch, 1];
}

function transliterateLine(line) {
  const speakerMatch = line.match(/^([\s·•\-–]*\[?\s*(?:Male|Female|Chorus|Man|Woman|Both|Duet|Solo|All|Hero|Heroine|ஆண்|பெண்|இருவரும்|குழு)\s*[:\]–\-]*\s*)/i);
  if (speakerMatch) {
    const prefix = speakerMatch[0];
    return prefix + transliterateLine(line.slice(prefix.length));
  }
  const chars = [...line];
  let result = '', i = 0;
  while (i < chars.length) {
    const [out, consumed] = transliterateChar(chars, i);
    result += out;
    i += consumed;
  }
  return result;
}

export function tamilToEnglishRuleBased(tamilText) {
  if (!tamilText) return null;
  return tamilText.split('\n').map(transliterateLine).join('\n');
}

export async function fillMissingLyrics(songName, tamilText, englishText) {
  if (tamilText && englishText) {
    return { tamil: tamilText, english: englishText, tamilSource: 'scraped', englishSource: 'scraped' };
  }
  if (!tamilText && !englishText) {
    return { tamil: null, english: null, tamilSource: 'not_found', englishSource: 'not_found' };
  }
  if (tamilText && !englishText) {
    console.log('[transliterate] Tamil->English for: ' + songName);
    const generated = tamilToEnglishRuleBased(tamilText);
    return { tamil: tamilText, english: generated || null, tamilSource: 'scraped', englishSource: generated ? 'transliterated' : 'not_found' };
  }
  // English only — cannot reverse-transliterate reliably
  console.log('[transliterate] English-only, no Tamil: ' + songName);
  return { tamil: null, english: englishText, tamilSource: 'not_found', englishSource: 'scraped' };
}
