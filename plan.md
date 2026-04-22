# engcal — Plan & Status

## Goal
Live engineering velocity calendar that automatically tracks every feature from start → demo → release. Accessible to authorized Avida team members only.

---

## ✅ Done

### Core Calendar
- Monthly grid, **Mon–Fri only**, navigate months
- Single-day milestone pills per feature (no spanning bars):
  - 🟢 green pill on `demoDate`
  - 🔵 blue pill on `releaseDate`
  - Each shows feature title (truncated) + DRI initials badge
  - Current week subtle highlight
- Click any pill → detail modal with dates + cycle time + Linear link
- "Today" blue circle computed client-side (useEffect) to avoid SSR date cache bug

### Metrics (below calendar, current month)
- **By Engineer**: demos and releases per DRI
- **By Week**: demos and releases per week
- Both tables update automatically when navigating months
- Avg cycle time in header
- Weekly 5-release goal: ✅/⬜ on each Friday

### Auth
- Magic code login (email → 6-digit code, no Google OAuth)
- Allowlist of 8 authorized emails (all @system2.fitness)
- Sign out button in header

### Data Pipeline
- **Releasebot → engcal**: every approved release calls `/api/add-release` with ticket ID + `Date.now()` → most accurate release date
- **Linear webhook** → live updates on state changes (started / in review / completed)
  - Auto-classifies unlabeled tickets using Claude Haiku — if it's a feature, adds the Feature label in Linear automatically
  - Removing Feature label in Linear removes ticket from engcal
  - Does NOT set `releaseDate` — only releasebot does that
- **Seed script** for manual backfill (`node scripts/seed-from-linear.mjs`)

---

## 🔲 Next Up
- **Monthly auto-seed** — run seed script at start of each month
- **Test auth end-to-end** on deployed app

---

## Decided Against
- Multi-day spanning bars — replaced with single-day milestone pills
- Project color distinction — not needed
- Per-project cycle time breakdown — deprioritized
- Saturday/Sunday columns — Mon–Fri only

---

## Data Notes
- InstantDB App ID: `867b7b82-9ef5-4467-864f-34d51728c0eb`
- `releaseDate` only set by releasebot (on approval) — never by Linear webhook
- `demoDate` set when ticket moves to "In Review" state
- `startDate` set when ticket moves to "started" state
- Removing Feature label in Linear → webhook deletes ticket from InstantDB
- Auto-classification skips tickets where Feature label was explicitly removed
