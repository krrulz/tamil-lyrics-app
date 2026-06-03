# Tamil Lyrics App v2 — Deployment Guide

## Overview
This is a **single Next.js app** deployed to **one Vercel project**.
- Frontend: `pages/` → `https://tamil-lyrics-app.vercel.app`
- API: `pages/api/` → `https://tamil-lyrics-app.vercel.app/api/...`

The separate Express API at `tamil-lyrics-api.vercel.app` is **no longer needed**.
All API calls in the frontend use relative URLs (`/api/...`), so there is no CORS issue.

---

## Step 1 — Add environment variables in Vercel

Go to vercel.com → tamil-lyrics-app project → Settings → Environment Variables.
Add ALL of these (Production + Preview + Development):

| Name | Where to get it |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Console → Project Settings → Service Accounts → Generate new private key → paste entire JSON as one line |
| `FIREBASE_WEB_API_KEY` | Firebase Console → Project Settings → General → Web API Key |
| `DEV_API_KEY` | Any secret string you choose (e.g. `TamilAdmin2025!`) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Same as `FIREBASE_WEB_API_KEY` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `tamil-lyrics-app.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `tamil-lyrics-app` |

---

## Step 2 — Push code to GitHub

```bash
# In your local tamil-lyrics-app repo:
git add .
git commit -m "v2: admin portal, suggestions, polls, analytics, voting"
git push origin main
```

Vercel will auto-deploy on push.

---

## Step 3 — Bootstrap your first admin account (one-time only)

1. **Firebase Console → Authentication → Users → Add user**
   - Email: karthikramamurthy0@gmail.com
   - Set a password

2. **Copy the UID** shown next to the user

3. **Firebase Console → Firestore → Start collection → `admins`**
   - Document ID: paste the UID
   - Add field: `approved` = boolean → `true`
   - Add field: `email` = string → `karthikramamurthy0@gmail.com`

4. **Login at** `https://tamil-lyrics-app.vercel.app/admin/login`

After this, all other admins request access through the UI and you approve them.

---

## Step 4 — Add Firestore indexes (if not already created)

These were created earlier in Firebase Console but verify they exist:

| Collection | Fields | Purpose |
|---|---|---|
| `playlists` | `userId` ASC + `createdAt` DESC | List user playlists |
| `songs` | `movie` ASC + `name` ASC | Browse by movie |
| `songs` | `searchTokens` Arrays + `name` ASC | Search |

---

## New routes in v2

### Public (no login)
| URL | What it does |
|---|---|
| `/` | Topics list (unchanged) |
| `/topic/[id]` | Songs in topic (unchanged) |
| `/song/[id]` | Lyrics with Male/Female/Chorus colours (unchanged) |
| `/suggest` | **NEW** — Public song suggestion form |
| `/vote/[pollId]` | **NEW** — Shareable voting poll page |

### Admin (requires approved account)
| URL | What it does |
|---|---|
| `/admin/login` | Login + access request form |
| `/admin` | Dashboard with stats |
| `/admin/suggestions` | Review suggestions, fetch lyrics, approve to playlist |
| `/admin/playlists` | CRUD playlists, add/remove/reorder songs |
| `/admin/polls` | Create polls, share vote links, close + tally |
| `/admin/topics` | Build topics from top-voted playlist songs, drag-reorder |
| `/admin/analytics` | Votes, top songs, voter leaderboard per poll |
| `/admin/access` | Approve/reject admin access requests |

---

## New Firestore collections

| Collection | Purpose |
|---|---|
| `admins` | `{ uid: { approved: true, email } }` — approved admins |
| `accessRequests` | Admin access request queue |
| `suggestions` | User-submitted song suggestions |
| `polls` | Voting polls with per-song vote counts |
| `votes` | `{pollId}_{fingerprint}` — one per voter per poll |

Existing collections (`songs`, `topics`, `playlists`) are unchanged in schema.

---

## Local development

```bash
npm install
cp .env.example .env.local
# Fill in all 6 vars in .env.local
npm run dev
# → http://localhost:3000
```

---

## Retire the old Express API

Once v2 is deployed and working:
1. Test all `/api/` endpoints via `https://tamil-lyrics-app.vercel.app/api/topics`
2. Delete or archive the `tamil-lyrics-api` Vercel project (it's no longer used)

---

## Files added in v2 (do not touch v1 files)

### New lib files
- `lib/firebaseAdmin.js` — server-side token verification
- `lib/firebaseDb.js` — extended Firestore helper (add, delete, where queries)
- `lib/useAdmin.js` — client-side Firebase Auth hook

### New API routes
- `pages/api/songs.js` — song search for admin playlist management
- `pages/api/suggestions/index.js` — submit + list suggestions
- `pages/api/suggestions/[id].js` — fetch-lyrics, approve, reject
- `pages/api/polls/index.js` — create poll + list
- `pages/api/polls/[pollId].js` — get poll + close
- `pages/api/polls/[pollId]/vote.js` — cast vote
- `pages/api/admin/check.js` — verify admin token
- `pages/api/admin/analytics.js` — full analytics object
- `pages/api/admin/playlists.js` — list + create playlists
- `pages/api/admin/playlists/[id].js` — detail, reorder, add/remove song
- `pages/api/admin/topics.js` — list + create topics
- `pages/api/admin/topics/[id].js` — edit, reorder, delete topic
- `pages/api/admin/access-requests.js` — submit + list requests
- `pages/api/admin/access-requests/[id].js` — approve (creates Firebase user) + reject

### New pages
- `pages/_app.js` — global CSS variables
- `pages/index.js` — updated homepage (adds Suggest + Admin footer links)
- `pages/suggest.js` — public suggestion form
- `pages/vote/[pollId].js` — public voting page
- `pages/admin/login.js` — admin login + access request
- `pages/admin/index.js` — admin dashboard
- `pages/admin/suggestions.js` — suggestions review
- `pages/admin/playlists.js` — playlist management
- `pages/admin/polls.js` — poll management
- `pages/admin/topics.js` — topic builder
- `pages/admin/analytics.js` — analytics dashboard
- `pages/admin/access.js` — access request review
