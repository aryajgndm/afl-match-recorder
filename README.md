# 🏆 AFL Match Recorder

An official, mobile-first match recording and live tournament tracking web application built for the **Ashoka Football League (AFL)**.

Designed for high-speed pitch-side recording, multi-device conflict prevention, real-time cloud synchronization, and spectator match analysis.

---

## ✨ Features

- **📱 Mobile-First Pitch-side Recording**
  - Ultra-fast, single-tap event recording tailored for handheld mobile devices during matches.
  - Tracks **Goals** (Open Play, Penalty, Own Goal) with Scorers and Assisters.
  - Tracks **Disciplinary Cards** (Yellow, Direct Red, Second Yellow $\rightarrow$ Red) with automatic player dismissal enforcement.
  - Quarter-by-quarter scoresheets (`Q1`, `Q2`, `Q3`, `Q4`, and `Extra Time`).

- **🔒 Conflict-Free Multi-Device Locking**
  - Match-specific 6-digit passcode authentication to prevent unauthorized edits.
  - Active session locking with live heartbeats to prevent two recorders from overwriting each other simultaneously.
  - **Universal Emergency Master Passcode** (`911911`) for coordinator bypass.

- **📊 Comprehensive Results & Match Insights**
  - Dedicated public match results view (no passcode required for spectators).
  - Full-width quarter switcher to review timeline events and score breakdowns by period.
  - Chronological event timeline with minute-by-minute action history.

- **⚡ Real-Time Cloud Synchronization**
  - Instant multiplayer sync powered by **Supabase PostgreSQL** and **WebSockets**.
  - Local offline-resilient cache ensuring zero score loss even if pitch connectivity drops.

- **🏅 Tournament Stage Progression**
  - Automated series tracking for **Playoffs (Best of 5)**, **Semi-Finals (Best of 5)**, and the **Finals (Best of 5)**.
  - Dynamic advancement logic: Winner of Playoff 1 advances to SF1 against Falcons; Grizzlies face Raptors in SF2; winners battle in the Finals.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS (Pitch Dark Theme: `#121212`, `#1c1c1c`, `#242424`) |
| **Icons** | Lucide React |
| **Database & Realtime** | Supabase (PostgreSQL + Realtime WebSockets) |
| **Local Backend / Proxy** | Node.js HTTP Server (`server/`) |
| **Deployment** | GitHub Actions $\rightarrow$ GitHub Pages |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)

### 1. Clone & Install

```bash
git clone https://github.com/<your-username>/afl-match-recorder.git
cd afl-match-recorder
npm install
```

### 2. Environment Setup

Create a `.env` file in the root directory (optional — production fallback keys are embedded for Supabase client sync):

```env
VITE_SUPABASE_URL=https://awzrvpwtmowtwbdgqrcw.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_SN11e77i-LGnumwjeSqDDg_I6IF_Wjh
```

### 3. Run Development Server

```bash
npm run dev
```

Open `http://127.0.0.1:5173/` in your browser.

### 4. Build for Production

```bash
npm run build
```

The optimized static production assets will be output to `dist/`.

---

## 🌐 Deploy to GitHub Pages

This project is pre-configured with a continuous deployment GitHub Actions workflow (`.github/workflows/deploy.yml`).

1. Push this repository to GitHub:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```
2. On GitHub, navigate to **Settings** $\rightarrow$ **Pages**.
3. Under **Build and deployment $\rightarrow$ Source**, select **GitHub Actions**.
4. The deployment workflow will run automatically and host your app at:
   ```
   https://<your-username>.github.io/<your-repo-name>/
   ```

---

## 📁 Project Structure

```
afl-match-recorder/
├── .github/workflows/        # Automated GitHub Pages CI/CD pipeline
├── public/teams/             # Official AFL team crests and badges
├── server/                   # Local Node.js server and data store
│   ├── data/                 # Fixtures seed and fallback store
│   ├── db.js                 # Local DB storage engine
│   └── server.js             # Local API proxy
├── src/
│   ├── components/
│   │   ├── common/           # Passcode modal, score tables, UI elements
│   │   ├── dashboard/        # Series summary, fixture cards, bracket view
│   │   ├── recording/        # Live scoresheet, bottom dock, event creator
│   │   └── results/          # Box scores, quarter selector, event timelines
│   ├── data/                 # Team rosters, tournament fixtures, passcodes
│   ├── lib/                  # Supabase client, storage layer, disciplinary rules
│   ├── pages/                # Dashboard, Recording, and Results pages
│   ├── types/                # TypeScript interfaces (Fixture, Event, Team, Score)
│   └── App.tsx               # Main HashRouter application container
├── vite.config.ts            # Vite build configuration with relative base
└── package.json
```

---

## ⚖️ Tournament Rulebook Enforcement

- **Quarter Timing**: 4 quarters (`Q1`, `Q2`, `Q3`, `Q4`) + optional Extra Time (`ET`).
- **Disciplinary Stacking**:
  - 1 Yellow Card = Warning.
  - 2 Yellow Cards = Automatic Red Card & pitch dismissal.
  - 1 Direct Red Card = Immediate pitch dismissal.
  - Dismissed players are automatically barred from subsequent goal scoring or event attribution for the remainder of the match.
- **Series Deciders**: In a Best-of-5 series, a team clinches upon reaching 3 wins; unneeded subsequent matches are dynamically marked `NOT REQUIRED`.

---

## 📄 License

Developed for the **Ashoka Football League (AFL)**. All team crests and league materials belong to their respective clubs.
