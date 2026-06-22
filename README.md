# SAT Golden Trio 🟡

A **shared** SAT-prep workspace for a small group of friends (5–10 people) prepping for
the **August 2026 SAT**. Everything anyone does is visible to everyone — it's a shared
study room, not private accounts.

No passwords. You "log in" just by entering your email (your email is your key). First
time you enter an unknown email you fill a short onboarding form; after that the same
email always logs you back into the same profile.

## What's inside

- ⏳ Live countdown to the SAT + "Live now" online users (realtime presence)
- 🏠 **Today view** (homepage): today's plan, your flashcards due, activity feed, open questions
- 📅 **Shared Study Plan** — one calendar everyone edits, daily notes feed, per-user mastery %
- ❓ **Question Bank** — post questions, tag by skill, comment, mark solved/need-help, track attempts
- 📖 **Vocabulary** — shared words, auto flashcards w/ spaced repetition, prefixes & suffixes, search
- ❌ **Shared Mistake Log** — log misses, comment on each other's, charts of weak spots
- 📊 **Practice Test Tracker** — log Bluebook scores, one line-chart with everyone's trajectory
- 💬 **Group Chat** — realtime
- 👥 **Shared Dashboard** — everyone side by side (no ranking)
- 📰 **Activity Feed** — live "who did what"
- 📐 **Math Formula Sheet** + 📝 **Weekly Reflections** (Sunday retrospective)
- ⬇️ CSV export on vocab + mistakes

## Setup (10 minutes)

### 1. Create a Supabase project
Go to <https://supabase.com> → New project (the free tier is plenty).

### 2. Create the tables
Open **SQL Editor** in your Supabase dashboard, paste the whole contents of
[`schema.sql`](schema.sql), and click **Run**. This creates every table, opens access
for the shared app, turns on realtime for chat/activity, and pre-fills common
prefixes & suffixes.

### 3. Add your keys
In Supabase: **Project Settings → API**. Copy the **Project URL** and the **anon public**
key into [`js/config.js`](js/config.js):

```js
export const SUPABASE_URL = "https://xxxx.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGc...";
```

While you're there, set `SAT_DATE` to your exact registered exam date/time.

### 4. Run it
Because the app uses ES modules, open it through a tiny web server (not `file://`):

```bash
# from inside the sat-golden-trio folder
npx serve          # then open the printed http://localhost:3000
# or:  python -m http.server 8000
```

Or deploy the folder to **Netlify / Vercel / GitHub Pages** (just drag-and-drop the
folder — there's nothing to build) and share the link with your friends.

## A note on security
This is built for a small, trusted group. Everyone shares one `anon` key with full
read/write to the tables, so anyone with the link + key can edit everything. That's the
whole point (a shared study room) — just don't post the link publicly.
