# AFL Match Recorder

An official, mobile-first live scoring and tournament management platform built for the **Ashoka Football League (AFL)**.

---

## ⚡ Features

- **Pitch-Side Live Scoring**: Fast, touch-friendly event recording for handheld devices.
- **Goal & Card Tracking**: Records goals (open play, penalties, own goals) with scorers/assisters, and disciplinary cards with automatic second-yellow dismissal rules.
- **Quarter Management**: Quarter-by-quarter tracking across `Q1` through `Q4`, plus optional `Extra Time (ET)`.
- **Anti-Collision Session Locking**: Match passcode verification and device-level locking to prevent concurrent overwrite errors.
- **Real-Time Multiplayer Sync**: Powered by Supabase PostgreSQL and WebSockets for instant cross-device score updates.
- **Public Results Hub**: View-only summary page with box scores, quarter breakdowns, and chronological event timelines.
- **Dynamic Series Progression**: Best-of-5 series tracker for Playoffs, Semi-Finals, and Finals with automatic series deciders.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS (Pitch Dark Theme)
- **Icons**: Lucide React
- **Backend / Realtime**: Supabase (PostgreSQL & WebSockets)
- **CI/CD**: GitHub Actions $\rightarrow$ GitHub Pages

---

## 🚀 Quick Start

### 1. Installation
```bash
git clone https://github.com/aryajgndm/afl-match-recorder.git
cd afl-match-recorder
npm install
```

### 2. Development
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Production Build
```bash
npm run build
```

---

## 🌐 Deployment

This repository is configured for automated deployment via GitHub Actions:
1. Push code to the `main` branch.
2. In GitHub repository **Settings** $\rightarrow$ **Pages**, set **Source** to **GitHub Actions**.

---

## 📄 License
Ashoka Football League (AFL). All rights reserved.
