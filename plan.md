# engcal — Plan & Status

## Goal
Live engineering velocity calendar that automatically tracks every feature from start → demo → release. Public link shared with eng team, leads, and product.

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
- **By Engineer**: demos and releases per DRI this month
- **By Week**: demos and releases per week this month
- Both tables update automatically when navigating months

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
- Multi-day spanning bars — replaced with single-day milestone pills (cleaner)
- Project color distinction (web/mobile/functions/server) — not needed
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
