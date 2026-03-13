# Tamil Lyrics App 🎵

A full-stack web application to browse Tamil movie song lyrics in Tamil and English.

## Features
- **End User Portal** (`/`) — Browse topics → songs → view lyrics in Tamil or English
- **Developer Portal** (`/dev`) — Add topics and songs with auto-scraped lyrics
- Mobile-first responsive design
- Tamil script rendering via Google Fonts (Noto Serif Tamil)
- Auto-scrapes from deeplyrics.in (Tamil) and tamil2lyrics.com (English)
- Stored in Firebase Firestore (free tier)

---

## 🚀 Complete Deployment Guide (All Free)

### Step 1 — GitHub
1. Create account at https://github.com
2. New Repository → name: `tamil-lyrics-app` → Create
3. Push this code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/tamil-lyrics-app.git
   git push -u origin main
   ```

### Step 2 — Firebase (Free Spark Plan)
1. Go to https://console.firebase.google.com
2. Create new project (e.g. `tamil-lyrics-db`)
3. Build → Firestore Database → Create database → Start in **test mode** → select region → Enable
4. ⚙️ Project Settings → Service Accounts → **Generate new private key** → Download JSON
5. Open the JSON, copy ALL the content

### Step 3 — Vercel (Free Hobby Plan)
1. Go to https://vercel.com → Sign up with GitHub
2. New Project → Import your `tamil-lyrics-app` repo
3. Settings → **Environment Variables** → Add:
   - `FIREBASE_SERVICE_ACCOUNT` → paste the entire Firebase JSON (as one line)
   - `DEV_API_KEY` → create any secret password (e.g. `RamaMusicAdmin2025`)
4. Deploy → Vercel gives you a URL like `tamil-lyrics-app.vercel.app`

### Step 4 — Free Domain (Optional)

**Option A: js.org subdomain** (free, takes 1-2 days approval)
1. Go to https://js.org and fill the form for `yourname.js.org`
2. In Vercel → Settings → Domains → add `yourname.js.org`

**Option B: FreeDNS** (instant, 5 minutes)
1. Go to https://freedns.afraid.org → Register free account
2. Choose a free subdomain (e.g. `tamillyrics.mooo.com`)
3. Point it to your Vercel URL
4. In Vercel → Settings → Domains → add your FreeDNS subdomain

---

## 🖥️ Local Development

```bash
npm install
cp .env.example .env.local
# Fill in FIREBASE_SERVICE_ACCOUNT and DEV_API_KEY in .env.local
npm run dev
# → http://localhost:3000
```

---

## 📖 How to Use

### As a Developer
1. Go to `/dev` on your site
2. Enter your `DEV_API_KEY`
3. Enter a **Topic Name** (e.g. "A.R. Rahman Classics")
4. List songs, one per line:
   ```
   Kannaana Kanney | Viswasam
   Venmathi Venmathiye | Minnale
   Nenjukulle | Kadal
   ```
5. Click **Add Topic & Scrape Lyrics**
6. Wait ~1-2 minutes — lyrics auto-scraped and stored

### As an End User
1. Visit the site homepage
2. Click a topic → see list of songs
3. Click a song → choose Tamil or English
4. Read lyrics!

---

## 🏗️ Project Structure

```
tamil-lyrics-app/
├── pages/
│   ├── index.js              # End user home (topics list)
│   ├── topic/[topicId].js    # Songs in a topic
│   ├── song/[songId].js      # Lyrics viewer
│   └── api/
│       ├── topics.js         # GET all topics
│       ├── topic-songs.js    # GET songs in a topic
│       ├── lyrics.js         # GET song lyrics
│       └── dev/
│           └── add-topic.js  # POST (protected) add topic + scrape
├── lib/
│   ├── firebase.js           # Firestore admin SDK
│   └── scraper.js            # Lyrics scraper functions
├── vercel.json               # Extended timeout for scraping
└── .env.example              # Environment variable template
```

---

## ⚠️ Notes

- Firebase **test mode** allows reads/writes without auth rules. For production, set up Firestore security rules to allow only server-side reads via Admin SDK.
- If a song's lyrics aren't found automatically, you can add them manually via the Firebase Console → Firestore → songs collection → find the song doc → edit `tamilLyrics` or `englishLyrics` fields.
- Vercel free plan allows 60s max function duration (set in vercel.json) which should be enough for scraping 10-15 songs per request.
