// lib/transliterate.js
// Uses Claude API to transliterate lyrics between Tamil script and English
// when one direction is missing after scraping.

const CLAUDE_API = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-3-5-20241022'; // fast + cheap for this task

async function callClaude(systemPrompt, userContent) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    return null;
  }

  try {
    const res = await fetch(CLAUDE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`Claude API error: ${res.status} — ${errBody}`);
      return null;
    }

    const data = await res.json();
    return data?.content?.[0]?.text?.trim() || null;
  } catch (err) {
    console.error('Claude call error:', err.message);
    return null;
  }
}

// Convert Tamil script lyrics → English transliteration
export async function tamilToEnglish(tamilLyrics, songName) {
  const system = `You are an expert Tamil linguist specializing in song lyrics transliteration.
Your task is to convert Tamil script song lyrics into English transliteration (romanized Tamil).
Rules:
- Preserve the exact line breaks and stanza structure of the original
- Use standard Tamil transliteration conventions (e.g. க = k/g, ச = s/ch, ட = d/t, த = th, ப = p/b, ம = m, ன = n, ண = n, ந = n, வ = v, ய = y, ர = r, ல = l, ள = l, ழ = zh, ற = r, ஆ = aa, இ = i, ஈ = ee, உ = u, ஊ = oo, எ = e, ஏ = ae, ஐ = ai, ஒ = o, ஓ = oh, ஔ = au)
- Output ONLY the transliterated lyrics, no explanations, no headers, no extra text
- Keep the same number of lines as input`;

  const userContent = `Transliterate these Tamil lyrics for the song "${songName}" to English:\n\n${tamilLyrics}`;
  return await callClaude(system, userContent);
}

// Convert English transliteration lyrics → Tamil script
export async function englishToTamil(englishLyrics, songName) {
  const system = `You are an expert Tamil linguist specializing in song lyrics.
Your task is to convert English transliterated Tamil song lyrics back into Tamil script (Unicode).
Rules:
- Preserve the exact line breaks and stanza structure of the original
- Use proper Tamil Unicode characters (உ, ஆ, etc.)
- Output ONLY the Tamil script lyrics, no explanations, no headers, no extra text
- Keep the same number of lines as input
- If a word is ambiguous, use the most common Tamil spelling for that song context`;

  const userContent = `Convert these transliterated lyrics for the song "${songName}" to Tamil script:\n\n${englishLyrics}`;
  return await callClaude(system, userContent);
}

// Smart router: given what we have, fill what's missing
export async function fillMissingLyrics(songName, tamilText, englishText) {
  // Both present — nothing to do
  if (tamilText && englishText) {
    return { tamil: tamilText, english: englishText, tamilSource: 'scraped', englishSource: 'scraped' };
  }

  // Both missing — can't help
  if (!tamilText && !englishText) {
    return { tamil: null, english: null, tamilSource: 'not_found', englishSource: 'not_found' };
  }

  // Have Tamil, need English
  if (tamilText && !englishText) {
    console.log(`Transliterating Tamil→English for: ${songName}`);
    const generated = await tamilToEnglish(tamilText, songName);
    return {
      tamil: tamilText,
      english: generated || null,
      tamilSource: 'scraped',
      englishSource: generated ? 'transliterated' : 'not_found',
    };
  }

  // Have English, need Tamil
  if (!tamilText && englishText) {
    console.log(`Transliterating English→Tamil for: ${songName}`);
    const generated = await englishToTamil(englishText, songName);
    return {
      tamil: generated || null,
      english: englishText,
      tamilSource: generated ? 'transliterated' : 'not_found',
      englishSource: 'scraped',
    };
  }
}
