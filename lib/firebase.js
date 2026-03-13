// lib/firebase.js
// Uses Firestore REST API directly — avoids gRPC/protobufjs native binary issues on Vercel

const PROJECT_ID = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT).project_id;
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Get a Google OAuth2 access token using the service account
async function getAccessToken() {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  // Build JWT manually (no external deps needed)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const unsigned = `${header}.${body}`;

  // Sign with private key using Node crypto
  const { createSign } = await import('crypto');
  const sign = createSign('RSA-SHA256');
  sign.update(unsigned);
  const signature = sign.sign(serviceAccount.private_key, 'base64url');

  const jwt = `${unsigned}.${signature}`;

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

// Convert Firestore REST document format to plain JS object
function fromFirestore(doc) {
  if (!doc || !doc.fields) return null;
  const result = {};
  for (const [key, val] of Object.entries(doc.fields)) {
    if ('stringValue' in val) result[key] = val.stringValue;
    else if ('integerValue' in val) result[key] = parseInt(val.integerValue);
    else if ('booleanValue' in val) result[key] = val.booleanValue;
    else if ('arrayValue' in val) result[key] = (val.arrayValue.values || []).map(v => v.stringValue ?? v.integerValue ?? v.booleanValue ?? null);
    else if ('mapValue' in val) result[key] = fromFirestore(val.mapValue);
    else result[key] = null;
  }
  return result;
}

// Convert plain JS object to Firestore REST format
function toFirestore(obj) {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') fields[key] = { stringValue: val };
    else if (typeof val === 'number') fields[key] = { integerValue: String(val) };
    else if (typeof val === 'boolean') fields[key] = { booleanValue: val };
    else if (Array.isArray(val)) fields[key] = { arrayValue: { values: val.map(v => ({ stringValue: String(v) })) } };
    else if (val === null || val === undefined) fields[key] = { nullValue: null };
    else fields[key] = { stringValue: String(val) };
  }
  return { fields };
}

export const db = {
  collection(collectionName) {
    return {
      doc(docId) {
        return {
          async get() {
            const token = await getAccessToken();
            const resp = await fetch(`${BASE_URL}/${collectionName}/${docId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (resp.status === 404) return { exists: false, data: () => null, id: docId };
            if (!resp.ok) throw new Error(`Firestore GET failed: ${resp.status}`);
            const doc = await resp.json();
            return { exists: true, data: () => fromFirestore(doc), id: docId };
          },

          async set(data) {
            const token = await getAccessToken();
            const resp = await fetch(`${BASE_URL}/${collectionName}/${docId}`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(toFirestore(data)),
            });
            if (!resp.ok) throw new Error(`Firestore SET failed: ${resp.status} ${await resp.text()}`);
            return resp.json();
          },

          async update(data) {
            // PATCH with field mask for partial update
            const token = await getAccessToken();
            const firestoreData = toFirestore(data);
            const fieldMask = Object.keys(firestoreData.fields).map(f => `updateMask.fieldPaths=${f}`).join('&');
            const resp = await fetch(`${BASE_URL}/${collectionName}/${docId}?${fieldMask}`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(firestoreData),
            });
            if (!resp.ok) throw new Error(`Firestore UPDATE failed: ${resp.status} ${await resp.text()}`);
            return resp.json();
          },
        };
      },

      async get() {
        const token = await getAccessToken();
        const resp = await fetch(`${BASE_URL}/${collectionName}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) throw new Error(`Firestore LIST failed: ${resp.status}`);
        const data = await resp.json();
        const docs = data.documents || [];
        return {
          docs: docs.map(doc => ({
            id: doc.name.split('/').pop(),
            exists: true,
            data: () => fromFirestore(doc),
          })),
          empty: docs.length === 0,
        };
      },
    };
  },
};
