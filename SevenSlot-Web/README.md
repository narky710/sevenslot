# SevenSlot Web

HTML5 slot game collection — mobile-first portrait web app.

**Live URL:** https://sevenslot-beta.vercel.app

## What's in this repo

| Path | What it is |
|------|-----------|
| `src/` | **Source of truth.** React + TypeScript + Vite. All game logic, components, and assets live here. |
| `design-package/` | Point-in-time design handoff docs. Written for an external agency at a specific snapshot. May be outdated — read `src/` for current specs. |
| `design-package/screenshots/` | Live screenshots captured from the deployed app, organized by game. |

## Games

- **Triple Sevens** — 3×3 classic slot
- **Double-Up Keno** — 80-ball keno with a double-up mechanic
- **Diamond Riches** — 3×5 video slot with free spins and progressive jackpots

## Dev

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # output to dist/
```

## Stack

React 18 · TypeScript · Vite · CSS custom properties (no UI framework)
