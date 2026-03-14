// lib/transliterate.js
// Bidirectional Tamil transliteration — no API needed, always works

// ─── Tamil Unicode → English (forward) ───────────────────────────────────────

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
  const speakerMatch = line.match(/^(\s*(?:Male|Female|Chorus|Man|Woman|Both|Duet|Solo|All|Hero|Heroine)[\s:.\]–-]*)/i);
  if (speakerMatch) {
    const prefix = speakerMatch[0];
    return prefix + transliterateLine(line.slice(prefix.length));
  }
  const chars = [...line];
  let result = '', i = 0;
  while (i < chars.length) {
    const [out, consumed] = transliterateChar(chars, i);
    result += out; i += consumed;
  }
  return result;
}

export function tamilToEnglishRuleBased(tamilText) {
  if (!tamilText) return null;
  return tamilText.split('\n').map(transliterateLine).join('\n');
}

// ─── English phonetic → Tamil Unicode (reverse) ──────────────────────────────
// Ordered longest-match first so "thr" matches before "th"

const EN_TO_TA_MAP = [
  // Consonant clusters
  ['ngh','ங்க'],['ngk','ங்க'],
  ['thr','த்ர'],['shr','ஶ்ர'],
  // Two-char consonants
  ['ng','ங'],['ch','ச'],['nj','ஞ'],['th','த'],['sh','ஷ'],['zh','ழ'],['tr','ற'],
  // Vowels (long before short)
  ['aa','ா'],['ii','ீ'],['uu','ூ'],['ae','ே'],['oe','ோ'],['ai','ை'],['au','ௌ'],
  // Single-char consonants
  ['k','க'],['g','க'],['c','க'],['n','ன'],['t','ட'],['d','ட'],
  ['p','ப'],['b','ப'],['m','ம'],['y','ய'],['r','ர'],['l','ல'],
  ['v','வ'],['w','வ'],['s','ஸ'],['h','ஹ'],['j','ஜ'],['z','ழ'],
  // Single vowels
  ['a','அ'],['i','இ'],['u','உ'],['e','எ'],['o','ஒ'],
];

function convertWord(word) {
  if (!word) return '';
  const lower = word.toLowerCase();
  let result = '';
  let i = 0;
  let prevWasConsonant = false;

  while (i < lower.length) {
    let matched = false;
    for (const [eng, ta] of EN_TO_TA_MAP) {
      if (lower.startsWith(eng, i)) {
        const isVowelChar = 'aeiouaeiiuuoeai'.includes(eng[0]);
        const isConsonantChar = !isVowelChar;

        if (isConsonantChar) {
          if (prevWasConsonant) {
            // Add pulli to previous consonant
            result += '்';
          }
          result += ta;
          prevWasConsonant = true;
        } else {
          // Vowel after consonant → use vowel marker instead of standalone vowel
          if (prevWasConsonant) {
            const marker = {
              'அ':'','ஆ':'ா','இ':'ி','ஈ':'ீ','உ':'ு','ஊ':'ூ',
              'எ':'ெ','ஏ':'ே','ஐ':'ை','ஒ':'ொ','ஓ':'ோ','ஔ':'ௌ',
            }[ta];
            result += (marker !== undefined ? marker : ta);
          } else {
            result += ta;
          }
          prevWasConsonant = false;
        }
        i += eng.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Non-alpha character (space, punctuation, number) — flush and pass through
      if (prevWasConsonant) result += 'அ'; // inherent 'a' for trailing consonant
      prevWasConsonant = false;
      result += lower[i];
      i++;
    }
  }
  if (prevWasConsonant) result += 'அ';
  return result;
}

function englishToTamilLine(line) {
  // Preserve speaker labels as-is
  const speakerMatch = line.match(/^(\s*(?:Male|Female|Chorus|Man|Woman|Both|Duet|Solo|All|Hero|Heroine)[\s:.\]–-]*)/i);
  if (speakerMatch) {
    const prefix = speakerMatch[0];
    return prefix + englishToTamilLine(line.slice(prefix.length));
  }
  // Split on whitespace/punctuation boundaries, convert each word
  return line.replace(/[a-zA-Z]+/g, match => convertWord(match));
}

export function englishToTamilRuleBased(englishText) {
  if (!englishText) return null;
  return englishText.split('\n').map(englishToTamilLine).join('\n');
}

// ─── Main export ─────────────────────────────────────────────────────────────

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

  // English only → generate Tamil phonetically
  console.log(`[transliterate] English→Tamil (rule-based) for: ${songName}`);
  const generated = englishToTamilRuleBased(englishText);
  return {
    tamil: generated || null,
    english: englishText,
    tamilSource: generated ? 'transliterated' : 'not_found',
    englishSource: 'scraped',
  };
}
