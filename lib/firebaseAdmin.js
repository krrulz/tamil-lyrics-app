// lib/firebaseAdmin.js
// Verifies Firebase ID tokens server-side using the public key endpoint
// No external SDK needed — pure fetch + crypto

export async function verifyIdToken(token) {
  if (!token) return null;
  try {
    // Decode header to get kid
    const [headerB64] = token.split('.');
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());

    // Fetch Google's public keys
    const keysRes = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
      { next: { revalidate: 3600 } }
    );
    const keys = await keysRes.json();
    const cert = keys[header.kid];
    if (!cert) return null;

    // Decode payload
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    // Basic time checks
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    if (payload.iat > now + 300) return null;

    const projectId = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT).project_id;
    if (payload.aud !== projectId) return null;

    // Verify signature using Node crypto
    const { createVerify } = await import('crypto');
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${parts[0]}.${parts[1]}`);
    const valid = verifier.verify(cert, parts[2], 'base64url');
    if (!valid) return null;

    return { uid: payload.user_id || payload.sub, email: payload.email };
  } catch (err) {
    console.error('[verifyIdToken]', err.message);
    return null;
  }
}

// Check if a uid is an approved admin in Firestore.
// Checks the tenant-prefixed collection first, then falls back to the base
// 'admins' collection so existing admins aren't locked out after TENANT_ID is set.
export async function isApprovedAdmin(uid) {
  const { fdb, rawFdb } = await import('./firebaseDb.js');
  try {
    const doc = await fdb.collection('admins').doc(uid).get();
    if (doc.exists && doc.data()?.approved === true) return true;
    // Fallback: check unprefixed 'admins' (backward compat when TENANT_ID was not set)
    if (process.env.TENANT_ID) {
      const baseDoc = await rawFdb.collection('admins').doc(uid).get();
      if (baseDoc.exists && baseDoc.data()?.approved === true) return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Middleware helper: returns { uid, email } or sends 401
export async function requireAdmin(req, res) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const token = auth.slice(7);
  const user = await verifyIdToken(token);
  if (!user) {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }
  const admin = await isApprovedAdmin(user.uid);
  if (!admin) {
    res.status(403).json({ error: 'Not an approved admin' });
    return null;
  }
  return user;
}
