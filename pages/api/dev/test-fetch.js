// pages/api/dev/test-fetch.js
// Temporary diagnostic — remove after testing
// Call: GET /api/dev/test-fetch?key=Music@Belgi2026

export default async function handler(req, res) {
  const apiKey = req.headers['x-api-key'] || req.query.key;
  if (apiKey !== process.env.DEV_API_KEY) return res.status(401).end();

  const url = 'https://tamillyrics143.com/lyrics/malare-mounama-song-lyrics/';

  try {
    const start = Date.now();
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/',
      },
      signal: AbortSignal.timeout(8000),
    });

    const elapsed = Date.now() - start;
    const body = await response.text();

    return res.status(200).json({
      status: response.status,
      ok: response.ok,
      elapsed_ms: elapsed,
      body_length: body.length,
      body_preview: body.slice(0, 50000),
      headers: Object.fromEntries(response.headers.entries()),
    });

  } catch (err) {
    return res.status(200).json({
      error: err.message,
      type: err.constructor.name,
      cause: err.cause?.message || null,
    });
  }
}
