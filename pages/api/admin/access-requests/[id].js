// pages/api/admin/access-requests/[id].js
import { fdb } from '../../../../lib/firebaseDb.js';
import { requireAdmin } from '../../../../lib/firebaseAdmin.js';

export default async function handler(req, res) {
  const { id } = req.query;
  const { action } = req.body || {};

  if (req.method !== 'PATCH') return res.status(405).end();

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
    // Create Firebase Auth user via Identity Toolkit REST API
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    const apiKey = process.env.FIREBASE_WEB_API_KEY;

    // Generate a temporary password — user will be prompted to change it
    const tempPassword = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase() + '!';

    // Create user via Firebase Auth REST API
    const createRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: tempPassword, returnSecureToken: false }),
      }
    );
    const createData = await createRes.json();
    if (createData.error && createData.error.message !== 'EMAIL_EXISTS') {
      return res.status(500).json({ error: 'Failed to create user: ' + createData.error.message });
    }

    // Look up the uid
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: [email] }) }
    );
    const lookupData = await lookupRes.json();
    const uid = lookupData.users?.[0]?.localId;

    if (!uid) return res.status(500).json({ error: 'Could not find created user' });

    // Mark as admin in Firestore
    await fdb.collection('admins').doc(uid).set({
      email, approved: true, approvedAt: new Date().toISOString(), approvedBy: user.email,
    });

    // Update request status
    await fdb.collection('accessRequests').doc(id).update({
      status: 'approved', uid, reviewedAt: new Date().toISOString(), reviewedBy: user.email, tempPassword,
    });

    // Return temp password so admin can share with user via email
    return res.json({ success: true, email, tempPassword, message: `Share this temporary password with ${email}` });
  }

  res.status(400).json({ error: 'action must be approve or reject' });
}
