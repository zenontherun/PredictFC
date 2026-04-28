# 🏆 World Cup 2026 Predictor — Backend Setup Guide

## What you'll need
- A free [Supabase](https://supabase.com) account
- A free [Vercel](https://vercel.com) account (for deployment)
- Your React project from the previous step

---

## STEP 1 — Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and click **Start your project**
2. Sign in with GitHub
3. Click **New Project**
4. Fill in:
   - **Name**: `worldcup2026`
   - **Database Password**: choose a strong password (save it!)
   - **Region**: pick the one closest to your company
5. Click **Create new project** — wait ~2 minutes for it to spin up

---

## STEP 2 — Run the Database Schema

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Open the file `supabase_schema.sql` from this package
4. Paste the entire contents into the editor
5. Click **Run** (▶)
6. You should see: *"Success. No rows returned"*

This creates all your tables: `profiles`, `matches`, `predictions`, and the `leaderboard` view.

---

## STEP 3 — Enable Google Login

1. In Supabase dashboard → **Authentication** → **Providers**
2. Find **Google** and toggle it ON
3. You'll need a Google OAuth Client ID and Secret:
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Create a new project → **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth Client ID**
   - Application type: **Web application**
   - Add Authorized redirect URI: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
   - Copy the **Client ID** and **Client Secret** back into Supabase
4. Save!

> 💡 **Company-only access**: In `supabase.js`, the line `hd: 'yourcompany.com'` restricts login to your company's Google Workspace domain. Replace `yourcompany.com` with your actual company domain.

---

## STEP 4 — Get Your Supabase Keys

1. In Supabase dashboard → **Settings** → **API**
2. Copy:
   - **Project URL** → paste into `supabase.js` as `SUPABASE_URL`
   - **anon / public key** → paste into `supabase.js` as `SUPABASE_ANON_KEY`

---

## STEP 5 — Install & Wire Up Your React App

```bash
# In your project folder:
npm install @supabase/supabase-js

# Copy the files from this package into your /src folder:
# - supabase.js
# - App.jsx (replace your existing one)
```

Your folder structure should look like:
```
src/
  App.jsx        ← updated version
  supabase.js    ← new file
  main.jsx       ← unchanged
```

---

## STEP 6 — Deploy to Vercel (Free)

```bash
npm install -g vercel
vercel
```

Follow the prompts. Vercel will give you a URL like:
`https://worldcup2026-predictor.vercel.app`

Share this link with your colleagues on Slack or email — that's it!

> No app store, no registration, no cost.

---

## STEP 7 — Entering Match Results (Admin)

After each match, you need to enter the real score so points are calculated.

**Option A — Supabase Dashboard (easiest)**
1. Go to Supabase → **Table Editor** → `matches`
2. Find the match row
3. Edit `result_home` and `result_away` with the final score
4. Then go to **SQL Editor** and run:
   ```sql
   SELECT calculate_points(1);  -- replace 1 with the match ID
   ```
   This automatically calculates and saves everyone's points!

**Option B — Build an Admin Panel** (recommended later)
A simple password-protected page where you can enter scores via a form. Let me know if you'd like this built!

---

## Database Tables Summary

| Table | What it stores |
|---|---|
| `profiles` | One row per user — username, points, stats |
| `matches` | All World Cup matches, dates, results |
| `predictions` | Every user's prediction for every match |
| `leaderboard` | Auto-calculated view (no manual updates needed) |

---

## How Points Are Auto-Calculated

When you call `calculate_points(match_id)` in SQL, it:
1. Reads the real result from the `matches` table
2. Loops through every user's prediction for that match
3. Awards 5 / 3 / 1 / 0 points based on the scoring rules
4. Updates each user's `total_points` in `profiles`
5. The leaderboard view updates automatically — no extra work needed!

---

## Estimated Costs

| Service | Cost |
|---|---|
| Supabase (free tier) | $0 — handles up to 50,000 users |
| Vercel (hobby plan) | $0 — unlimited deployments |
| Google OAuth | $0 |
| **Total** | **$0** |

---

## Questions?

The three files in this package work together:
- `supabase_schema.sql` → run once in Supabase to set up the database
- `supabase.js` → all database/auth functions for your React app
- `App.jsx` → the full frontend wired up to the backend
