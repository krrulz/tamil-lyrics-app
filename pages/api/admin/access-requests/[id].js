// pages/api/admin/access-requests/[id].js
import { fdb } from '../../../../lib/firebaseDb.js';
import { requireAdmin } from '../../../../lib/firebaseAdmin.js';

// Get an OAuth token scoped for Identity Toolkit (to look up users by email)
async function getAdminToken() {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/firebase',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const { createSign } = await import('crypto');
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${body}`);
  const sig = sign.sign(sa.private_key, 'base64url');
  const jwt = `${header}.${body}.${sig}`;
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error('Failed to get admin token: ' + JSON.stringify(data));
  return data.access_token;
}

export default async function handler(req, res) {
  const { id } = req.query;
  const { action } = req.body || {};

  if (req.method !== 'PATCH') return res.status(405).end();

  try {
    const user = await requireAdmin(req, res);
    if (!user) return;

    const doc = await fdb.collection('accessRequests').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Request not found' });

    if (action === 'reject') {
      await fdb.collection('accessRequests').doc(id).update({ status: 'rejected', reviewedAt: new Date().toISOString(), reviewedBy: user.email });
      return res.json({ success: true });
    }

    if (action === 'approve') {
      const { email } = doc.data();
      const projectId = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT).project_id;
      const tempPassword = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase() + '!';

      // Get admin OAuth token for Identity Toolkit
      const adminToken = await getAdminToken();

      // Try to create user via Admin API
      let uid = null;
      const createRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({ email, password: tempPassword }),
        }
      );
      const createData = await createRes.json();

      if (createData.localId) {
        // New user created successfully
        uid = createData.localId;
      } else if (createData.error?.message?.includes('EMAIL_EXISTS') || createData.error?.message?.includes('DUPLICATE_EMAIL')) {
        // User already exists — look them up by email via Admin API
        const lookupRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({ email: [email] }),
          }
        );
        const lookupData = await lookupRes.json();
        uid = lookupData.users?.[0]?.localId;
      } else {
        return res.status(500).json({ error: 'Failed to create user: ' + (createData.error?.message || JSON.stringify(createData)) });
      }

      if (!uid) return res.status(500).json({ error: 'Could not resolve UID for ' + email });

      // Mark as approved admin in Firestore
      await fdb.collection('admins').doc(uid).set({
        email, approved: true, approvedAt: new Date().toISOString(), approvedBy: user.email,
      });

      // Update request
      await fdb.collection('accessRequests').doc(id).update({
        status: 'approved', uid, reviewedAt: new Date().toISOString(), reviewedBy: user.email, tempPassword,
      });

      return res.json({ success: true, email, tempPassword, message: `Share this temporary password with ${email}` });
    }

    res.status(400).json({ error: 'action must be approve or reject' });
  } catch (err) {
    console.error('[/api/admin/access-requests/[id]]', err);
    res.status(500).json({ error: err.message });
  }
}
