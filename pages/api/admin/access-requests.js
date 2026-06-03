// pages/api/admin/access-requests.js
import { fdb } from '../../../lib/firebaseDb.js';
import { requireAdmin } from '../../../lib/firebaseAdmin.js';
export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Public: submit access request
    const { email, reason } = req.body || {};
    if (!email || !reason) return res.status(400).json({ error: 'email and reason required' });

    // Check not already requested
    const existing = await fdb.collection('accessRequests').where('email', '==', email);
    if (existing.length > 0) {
      const latest = existing[0].data();
      if (latest.status === 'pending') return res.status(409).json({ error: 'Request already pending' });
      if (latest.status === 'approved') return res.status(409).json({ error: 'Already approved. Check your email.' });
    }

    const id = await fdb.collection('accessRequests').add({
      email: email.trim().toLowerCase(),
      reason: reason.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    // Send email notification to admin (via mailto link — no SMTP needed)
    res.status(201).json({
      success: true,
      message: 'Request submitted. You will receive an email once approved.',
      id: id.id,
    });
    return;
  }

  if (req.method === 'GET') {
    const user = await requireAdmin(req, res);
    if (!user) return;
    const docs = await fdb.collection('accessRequests').getAll();
    const requests = docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return res.json({ requests });
  }

  res.status(405).end();
}
