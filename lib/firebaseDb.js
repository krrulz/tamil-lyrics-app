// lib/firebaseDb.js
// Wraps lib/firebase.js with extra helpers: where(), orderBy(), add(), delete()

import { db as baseDb } from './firebase.js';

if (!process.env.FIREBASE_SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set');
const PROJECT_ID = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT).project_id;
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function getAccessToken() {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 };
  const { createSign } = await import('crypto');
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${body}`);
  const sig = sign.sign(sa.private_key, 'base64url');
  const jwt = `${header}.${body}.${sig}`;
  const resp = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}` });
  const data = await resp.json();
  if (!data.access_token) throw new Error('Auth failed: ' + JSON.stringify(data));
  return data.access_token;
}

function fromFirestore(doc) {
  if (!doc?.fields) return null;
  const r = {};
  for (const [k, v] of Object.entries(doc.fields)) {
    if ('stringValue' in v) r[k] = v.stringValue;
    else if ('integerValue' in v) r[k] = parseInt(v.integerValue);
    else if ('doubleValue' in v) r[k] = v.doubleValue;
    else if ('booleanValue' in v) r[k] = v.booleanValue;
    else if ('timestampValue' in v) r[k] = v.timestampValue;
    else if ('nullValue' in v) r[k] = null;
    else if ('arrayValue' in v) r[k] = (v.arrayValue.values || []).map(x => x.stringValue ?? x.integerValue ?? x.booleanValue ?? null);
    else if ('mapValue' in v) r[k] = fromFirestore(v.mapValue);
    else r[k] = null;
  }
  return r;
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number' && Number.isInteger(val)) return { integerValue: String(val) };
  if (typeof val === 'number') return { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(val).map(([k, v]) => [k, toFirestoreValue(v)])) } };
  return { stringValue: String(val) };
}

function toFirestore(obj) {
  return { fields: Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toFirestoreValue(v)])) };
}

// Auto-generate a random doc ID
function newId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(11))).map(b => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[b % 62]).join('');
}

export const fdb = {
  collection(col) {
    return {
      doc(id) {
        return {
          async get() {
            const token = await getAccessToken();
            const resp = await fetch(`${BASE_URL}/${col}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            if (resp.status === 404) return { exists: false, id, data: () => null };
            if (!resp.ok) throw new Error(`GET ${col}/${id}: ${resp.status}`);
            const doc = await resp.json();
            return { exists: true, id, data: () => fromFirestore(doc) };
          },
          async set(data) {
            const token = await getAccessToken();
            const resp = await fetch(`${BASE_URL}/${col}/${id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(toFirestore(data)) });
            if (!resp.ok) throw new Error(`SET ${col}/${id}: ${resp.status} ${await resp.text()}`);
            return resp.json();
          },
          async update(data) {
            const token = await getAccessToken();
            const fs = toFirestore(data);
            const mask = Object.keys(fs.fields).map(f => `updateMask.fieldPaths=${f}`).join('&');
            const resp = await fetch(`${BASE_URL}/${col}/${id}?${mask}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(fs) });
            if (!resp.ok) throw new Error(`UPDATE ${col}/${id}: ${resp.status} ${await resp.text()}`);
            return resp.json();
          },
          async delete() {
            const token = await getAccessToken();
            const resp = await fetch(`${BASE_URL}/${col}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            if (!resp.ok && resp.status !== 404) throw new Error(`DELETE ${col}/${id}: ${resp.status}`);
          },
        };
      },

      // Add a new document with auto-generated ID
      async add(data) {
        const id = newId();
        const token = await getAccessToken();
        const resp = await fetch(`${BASE_URL}/${col}/${id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(toFirestore(data)) });
        if (!resp.ok) throw new Error(`ADD ${col}: ${resp.status} ${await resp.text()}`);
        return { id };
      },

      // List all documents in collection
      async getAll() {
        const token = await getAccessToken();
        const resp = await fetch(`${BASE_URL}/${col}?pageSize=300`, { headers: { Authorization: `Bearer ${token}` } });
        if (!resp.ok) throw new Error(`LIST ${col}: ${resp.status}`);
        const data = await resp.json();
        return (data.documents || []).map(doc => ({ id: doc.name.split('/').pop(), exists: true, data: () => fromFirestore(doc) }));
      },

      // Simple equality filter using Firestore runQuery
      async where(field, op, value) {
        const token = await getAccessToken();
        const opMap = { '==': 'EQUAL', '!=': 'NOT_EQUAL', '<': 'LESS_THAN', '<=': 'LESS_THAN_OR_EQUAL', '>': 'GREATER_THAN', '>=': 'GREATER_THAN_OR_EQUAL' };
        const body = {
          structuredQuery: {
            from: [{ collectionId: col }],
            where: { fieldFilter: { field: { fieldPath: field }, op: opMap[op] || 'EQUAL', value: toFirestoreValue(value) } },
            limit: 300,
          }
        };
        const resp = await fetch(`${BASE_URL}:runQuery`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!resp.ok) throw new Error(`QUERY ${col}: ${resp.status}`);
        const results = await resp.json();
        return (results || []).filter(r => r.document).map(r => ({ id: r.document.name.split('/').pop(), exists: true, data: () => fromFirestore(r.document) }));
      },
    };
  },
};

// Re-export base db for backward compat
export { baseDb as db };
