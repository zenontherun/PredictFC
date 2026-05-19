# 🏆 World Cup 2026 Predictor (Predict'26)

A premium, interactive web application for predicting the **FIFA World Cup 2026** matches, tracking group standings in real-time, competing on a live leaderboard, and locking in tournament award predictions.

Built with a modern, high-energy dark theme, fluid animations, and real-time database synchronization.

---

## 🚀 Key Features

*   **Real-time Match Predictions**: Users can submit predictions for every Group and Knockout stage match. Predictions lock automatically at kickoff.
*   **Dynamic Live Leaderboard**: A real-time ranking dashboard built on Postgres views and Supabase subscriptions, showing total points, exact scores, and outcomes predicted.
*   **Tournament Bonus Picks**: A dedicated "Picks" section for users to select tournament awards (Golden Ball, Golden Boot, Golden Glove, Young Player, and Fair Play) using an autocomplete player list, featuring a permanent "lock-in" submission mechanism.
*   **Automatic Group Standings**: Standings (Played, Won, Drawn, Lost, Goal Difference, Points) are calculated dynamically on the fly based on match scores.
*   **Background Score Sync**: Cron-based score updater script integrated with the `api-football` service to automatically pull final scores, lock matches, and calculate user scores.
*   **SuperAdmin Dashboard**: Dedicated management suite to manually lock/unlock matches, enter final scores, trigger point calculations, edit user stats, and manage user statuses.

---

## 🛠️ Technology Stack

*   **Frontend**: React (Vite), Framer Motion (for premium animations & micro-interactions), Vanilla CSS (custom-curated dark theme with orange & green accents).
*   **Backend & DB**: Supabase (PostgreSQL, Realtime Subscriptions, Database Functions & Triggers, Row-Level Security).
*   **Automation**: Node.js cron schedule integrating `api-football` (RapidAPI) for automated result updates.

---

## 📊 Database Architecture

| Table | Purpose |
| :--- | :--- |
| `profiles` | Stores user profiles (username, emoji, points, exact score count, status, and role). |
| `matches` | Stores official match data (teams, flags, date, time, venue, group, final scores, and lock status). |
| `predictions` | Stores user match-score predictions and points earned. |
| `bonus_predictions` | Stores locked-in tournament-wide award picks. |
| `leaderboard` | PostgreSQL View for sorting and ranking active users in real-time. |

---

## 🎯 Scoring System

Points are distributed automatically when match results are entered:
*   **5 Points** (Exact Score): Correctly predicted the exact home and away scores.
*   **3 Points** (Goal Difference): Correctly predicted the match outcome (e.g., Home Win) and the exact goal difference (e.g., predicted 3-1, ended 2-0).
*   **1 Point** (Correct Outcome): Correctly predicted the outcome only (Win, Draw, or Loss).
*   **0 Points** (Incorrect): Prediction did not match the outcome.

---

## 📥 Setup & Installation

### Prerequisite: Database Schema
1. Log in to your **Supabase Console** and create a project.
2. Go to the **SQL Editor**, paste the contents of `backend/supabase_schema.sql`, and click **Run**.
3. Enable Google Auth or Email Login in your Supabase Auth settings.

### 1. Frontend Setup
```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Create/Configure your .env file
# Add your credentials for score sync (API Football)
API_FOOTBALL_KEY=your_api_football_key
```

### 2. Run the Development Server
```bash
# Start Vite development server
npm run dev
```
The app will be running locally at `http://localhost:5173`.

### 3. Running the Auto-Score Sync (Optional)
To keep match results and user scores updated in the background:
```bash
# From the frontend directory, run the background Cron script
node scripts/auto_score_updater.mjs
```

---

## 🚀 Deployment

The React frontend is optimized for deployment to Vercel (Free / Hobby tier):
```bash
# Install Vercel CLI globally
npm install -g vercel

# Deploy
vercel
```
