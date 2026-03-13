// lib/transliterate.js
// Uses Google Gemini API (free tier) for transliteration

const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[transliterate] GEMINI_API_KEY not set');
    return null;
  }

  try {
    const res = await fetch(`${GEMINI_API}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[transliterate] Gemini error: ${res.status} — ${errBody}`);
      return null;
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (err) {
    console.error('[transliterate] Gemini call error:', err.message);
    return null;
  }
}

export async function englishToTamil(englishLyrics, songName) {
  const prompt = `You are an expert Tamil linguist. Convert these English transliterated Tamil song lyrics for "${songName}" into Tamil script (Unicode).
Rules:
- Preserve exact line breaks and stanza structure
- Output ONLY the Tamil script lyrics, no explanations or headers
- Keep the same number of lines as input

${englishLyrics}`;

  return await callGemini(prompt);
}

export async function tamilToEnglish(tamilLyrics, songName) {
  const prompt = `You are an expert Tamil linguist. Transliterate these Tamil script song lyrics for "${songName}" into English (romanized Tamil).
Rules:
- Preserve exact line breaks and stanza structure
- Output ONLY the transliterated lyrics, no explanations or headers
- Keep the same number of lines as input

${tamilLyrics}`;

  return await callGemini(prompt);
}

export async function fillMissingLyrics(songName, tamilText, englishText) {
  if (tamilText && englishText) {
    return { tamil: tamilText, english: englishText, tamilSource: 'scraped', englishSource: 'scraped' };
  }

  if (!tamilText && !englishText) {
    return { tamil: null, english: null, tamilSource: 'not_found', englishSource: 'not_found' };
  }

  if (tamilText && !englishText) {
    console.log(`[transliterate] Tamil→English for: ${songName}`);
    const generated = await tamilToEnglish(tamilText, songName);
    return {
      tamil: tamilText,
      english: generated || null,
      tamilSource: 'scraped',
      englishSource: generated ? 'transliterated' : 'not_found',
    };
  }

  if (!tamilText && englishText) {
    console.log(`[transliterate] English→Tamil for: ${songName}`);
    const generated = await englishToTamil(englishText, songName);
    return {
      tamil: generated || null,
      english: englishText,
      tamilSource: generated ? 'transliterated' : 'not_found',
      englishSource: 'scraped',
    };
  }
}
