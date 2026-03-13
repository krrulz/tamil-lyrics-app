export default async function handler(req, res) {
  const apiKey = req.headers['x-api-key'] || req.query.key;
  if (apiKey !== process.env.DEV_API_KEY) return res.status(401).end();

  const slug = req.query.slug || 'devuda-devuda-song-lyrics';
  const url = `https://tamillyrics143.com/lyrics/${slug}/`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://www.google.com/',
      },
      signal: AbortSignal.timeout(8000),
    });
    const body = await response.text();

    // Extract just the lyric-text div to see structure
    const lyricMatch = body.match(/<div class="lyric-text[\s\S]*?(?=<div class="scriptlesssocialsharing|<\/article)/i);
    const snippet = lyricMatch ? lyricMatch[0].slice(0, 3000) : body.slice(10000, 13000);

    return res.status(200).json({
      status: response.status,
      url,
      body_length: body.length,
      lyric_section: snippet,
    });
  } catch (err) {
    return res.status(200).json({ error: err.message });
  }
}
