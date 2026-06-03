// pages/api/admin/change-password.js
// Changes the Firebase Auth password for the currently logged-in admin user

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { idToken, newPassword } = req.body || {};
    if (!idToken) return res.status(400).json({ error: 'idToken required' });
    if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'FIREBASE_WEB_API_KEY not configured' });

    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, password: newPassword, returnSecureToken: false }),
      }
    );
    const data = await resp.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    return res.json({ success: true });
  } catch (err) {
    console.error('[/api/admin/change-password]', err);
    res.status(500).json({ error: err.message });
  }
}
