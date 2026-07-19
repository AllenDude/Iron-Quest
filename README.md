# Iron Quest — Calisthenics RPG

A mobile-first installable PWA that turns your 4-day calisthenics split into an RPG
progression system. Fully offline, no backend, no build step — plain HTML/CSS/JS.

## Running it

Service workers (needed for offline support + "Add to Home Screen") only work over
**HTTPS or localhost** — not over a plain `file://` path. Pick one:

**Quickest — local test:**
```
cd iron-quest
python3 -m http.server 8080
```
Then open `http://localhost:8080` on your phone (same Wi-Fi) or computer.

**To actually install it on your phone:** host the folder somewhere with HTTPS —
GitHub Pages, Netlify, Vercel, Cloudflare Pages all work with drag-and-drop deploys
of this folder, free. Once it's live:
- **Android (Chrome):** open the URL → menu → "Install app"
- **iPhone (Safari):** open the URL → Share → "Add to Home Screen"
- **Windows/macOS (Chrome/Edge):** address bar → install icon

After the first load, the app shell is cached — it keeps working with no signal.

## Data

Everything (workouts, XP, streaks, PRs, quests, achievements) is stored in
`localStorage` on-device. Nothing is sent anywhere. Use Settings → Export to back
up to a JSON file, and Import to restore it (e.g. after clearing browser data or
switching devices).

## What's implemented vs. the brief's "Future Expansion" list

Built: the four-day split exactly as given, guided set-by-set logging (ranges,
drop sets, to-failure, per-side, choose-your-variation), rest timer, progressive
overload suggestions, XP/levels/titles, daily & weekly quests, 18 achievements,
stats, progress calendar, per-exercise history with PRs, workout history with
notes, themes, hardcore mode, full offline support.

Not built (explicitly called out in the brief as future expansion, so left out of
this pass): additional workout plans, leg/full-body days, nutrition/weight/body
measurement tracking, cloud backup, friend challenges, leaderboards, wearable
integration.

## Editing the workout plan

All exercise definitions live in `js/config.js` (`WORKOUT_PLAN`). Rep ranges, drop
sets, and variations are data, not hardcoded UI — change the numbers there and the
logging screens update automatically.
