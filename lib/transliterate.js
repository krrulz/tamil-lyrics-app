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
// Uses longest-match greedy substitution with proper Tamil romanisation
// Handles common conventions: th=த, dh=த, zh=ழ, aa=ா, ee/ii=ீ, oo/uu=ூ etc.

// Ordered longest → shortest to ensure greedy matching
const ROMAJI_MAP = [
  // Long vowels (must come before single vowels)
  ['aa','ா'], ['ee','ீ'], ['ii','ீ'], ['oo','ூ'], ['uu','ூ'],
  ['ae','ே'], ['ai','ை'], ['au','ௌ'], ['oa','ோ'],
  // Consonant digraphs (must come before single consonants)
  ['ng','ங'], ['nj','ஞ'], ['nh','ன'],
  ['ch','ச'], ['sh','ஷ'],
  ['th','த'], ['dh','த'],
  ['zh','ழ'], ['tr','ற'], ['dr','ற'],
  ['kk','க்க'], ['cc','ச்ச'], ['tt','ட்ட'], ['pp','ப்ப'],
  ['nn','ன்ன'], ['mm','ம்ம'], ['ll','ல்ல'], ['rr','ர்ர'],
  ['nd','ந்த'], ['nt','ந்த'], ['mb','ம்ப'],
  ['nk','ங்க'], ['nch','ஞ்ச'],
  // Single consonants
  ['k','க'], ['g','க'], ['q','க'],
  ['c','க'], ['s','ஸ'],
  ['j','ஜ'], ['z','ழ'],
  ['t','ட'], ['d','ட'],
  ['n','ன'], ['N','ண'],
  ['p','ப'], ['b','ப'], ['f','ப'],
  ['m','ம'], ['y','ய'],
  ['r','ர'], ['R','ற'],
  ['l','ல'], ['L','ள'],
  ['v','வ'], ['w','வ'],
  ['h','ஹ'],
  // Short vowels (standalone, when not after consonant)
  ['a','அ'], ['i','இ'], ['u','உ'], ['e','எ'], ['o','ஒ'],
];

// Vowel marker equivalents (when a vowel follows a consonant)
const VOWEL_MARKER_MAP = {
  'அ':'', 'ஆ':'ா', 'இ':'ி', 'ஈ':'ீ', 'உ':'ு', 'ஊ':'ூ',
  'எ':'ெ', 'ஏ':'ே', 'ஐ':'ை', 'ஒ':'ொ', 'ஓ':'ோ', 'ஔ':'ௌ',
  // Long vowels direct
  'ா':'ா', 'ி':'ி', 'ீ':'ீ', 'ு':'ு', 'ூ':'ூ',
  'ெ':'ெ', 'ே':'ே', 'ை':'ை', 'ொ':'ொ', 'ோ':'ோ', 'ௌ':'ௌ',
};

const STANDALONE_VOWELS = new Set(['அ','ஆ','இ','ஈ','உ','ஊ','எ','ஏ','ஐ','ஒ','ஓ','ஔ']);
const VOWEL_MARKERS_SET = new Set(['ா','ி','ீ','ு','ூ','ெ','ே','ை','ொ','ோ','ௌ']);

function isVowelResult(taChar) {
  return STANDALONE_VOWELS.has(taChar) || VOWEL_MARKERS_SET.has(taChar);
}

function convertWord(word) {
  if (!word) return '';
  const w = word.toLowerCase();
  let result = '';
  let i = 0;
  let lastWasConsonant = false;
  let pendingConsonant = ''; // Tamil consonant char waiting for vowel

  const flushConsonant = (vowelMarker = 'அ') => {
    if (!pendingConsonant) return;
    const marker = VOWEL_MARKER_MAP[vowelMarker];
    result += pendingConsonant + (marker !== undefined ? marker : '');
    pendingConsonant = '';
  };

  while (i < w.length) {
    let matched = false;
    for (const [eng, ta] of ROMAJI_MAP) {
      if (w.startsWith(eng, i)) {
        const taIsVowel = isVowelResult(ta) || ta === 'ா' || ta === 'ி' || ta === 'ீ' || ta === 'ு' || ta === 'ூ';
        
        if (!taIsVowel) {
          // It's a consonant result
          if (pendingConsonant) {
            // Previous consonant gets pulli (no vowel followed)
            result += pendingConsonant + '்';
          }
          // Handle multi-char results like 'ங்க'
          if (ta.length > 1 && !ta.includes('்')) {
            result += ta;
            pendingConsonant = '';
          } else if (ta.includes('்')) {
            result += ta;
            pendingConsonant = '';
          } else {
            pendingConsonant = ta;
          }
        } else {
          // It's a vowel
          if (pendingConsonant) {
            flushConsonant(ta);
          } else {
            // Standalone vowel
            const standalone = {
              'ா':'ஆ','ி':'இ','ீ':'ஈ','ு':'உ','ூ':'ஊ',
              'ெ':'எ','ே':'ஏ','ை':'ஐ','ொ':'ஒ','ோ':'ஓ','ௌ':'ஔ',
            }[ta] || ta;
            result += standalone;
          }
        }
        i += eng.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Non-alpha — flush pending consonant with inherent 'a', pass char through
      if (pendingConsonant) {
        result += pendingConsonant + 'அ';
        pendingConsonant = '';
      }
      result += w[i];
      i++;
    }
  }
  // Flush any trailing consonant with inherent 'a'  
  if (pendingConsonant) result += pendingConsonant + 'அ';
  return result;
}

function englishToTamilLine(line) {
  const speakerMatch = line.match(/^(\s*(?:Male|Female|Chorus|Man|Woman|Both|Duet|Solo|All|Hero|Heroine)[\s:.\]–-]*)/i);
  if (speakerMatch) {
    const prefix = speakerMatch[0];
    return prefix + englishToTamilLine(line.slice(prefix.length));
  }
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
    console.log(`[transliterate] Tamil→English for: ${songName}`);
    const generated = tamilToEnglishRuleBased(tamilText);
    return { tamil: tamilText, english: generated || null, tamilSource: 'scraped', englishSource: generated ? 'transliterated' : 'not_found' };
  }
  // English only → generate Tamil phonetically
  console.log(`[transliterate] English→Tamil for: ${songName}`);
  const generated = englishToTamilRuleBased(englishText);
  return { tamil: generated || null, english: englishText, tamilSource: generated ? 'transliterated' : 'not_found', englishSource: 'scraped' };
}
