// pages/api/admin/check.js
import { requireAdmin } from '../../../lib/firebaseAdmin.js';

export default async function handler(req, res) {
  const user = await requireAdmin(req, res);
  if (!user) return;
  res.json({ ok: true, email: user.email });
}
