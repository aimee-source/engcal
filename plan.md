# engcal — Plan & Status

## Goal
Live engineering velocity calendar that automatically tracks every feature from start → demo → release. Public link shared with eng team, leads, and product.

---

## ✅ Done

### Core Calendar
- Monthly grid, **Mon–Fri only**, navigate months
- Multi-day feature bars spanning day columns (CSS grid, Google Calendar style)
  - 🔵 blue = released (demoDate → releaseDate)
  - 🟢 green = in review / demo (demoDate → today, extends until released)
  - Bars stack in rows (interval scheduling)
  - DRI initials badge on each bar
  - Clipped bars (spanning week boundaries) have flat edges + always show title
  - Current week subtle highlight
- Started-only tickets hidden from calendar (no visual noise)
- Click bar → modal with full lifecycle + cycle time
- Ticket ID in modal links to Linear
- "Today" blue circle computed client-side (useEffect) to avoid SSR date cache bug

### Metrics
- Avg cycle time in header
- Weekly 5-release goal: ✅/⬜ on each Friday

### Data Pipeline
- **Releasebot → engcal**: every approved release in releasebot calls `/api/add-release` with ticket ID + current timestamp → sets `releaseDate` in real time
- **Linear webhook** → live updates on state changes (started / in review / completed)
  - Also handles Feature label additions to already-completed/in-review issues (fetches full issue from Linear API for accurate timestamps)
- **Seed script** for manual backfill (April 2026 seeded: 29 Feature-labeled tickets)

---

## 🔲 Next Up

### Lower Priority
- **Monthly auto-seed** — run seed script at start of each month for new month's data
- **Confirm Linear webhook end-to-end** — test by labeling a ticket Feature while in review, verify it appears without reseeding

---

## Decided Against
- Per-engineer ticket metrics — removed, too noisy
- Project color distinction (web/mobile/functions/server) — removed, not needed
- Per-project cycle time breakdown — deprioritized
- Saturday/Sunday columns — Mon–Fri only

---

## Data Notes
- InstantDB App ID: `867b7b82-9ef5-4467-864f-34d51728c0eb`
- Project field not reliable — all tickets labeled "web", doesn't matter
- Seed script: completed OR active (started/inReview) Feature-labeled issues with startedAt in April 2026
- `releaseDate` only set when explicitly provided — no `Date.now()` fallback
- `barEndMs = releaseDate ?? Date.now()` — green bars always extend to today if not yet released
- Existing tickets have `releaseDate` from Linear `completedAt` (April 17); going forward releasebot sets actual approval date
