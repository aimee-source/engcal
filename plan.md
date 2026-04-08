# engcal — Plan & Status

## Goal
Live engineering velocity calendar that automatically tracks every feature from start → demo → release. Public link shared with eng team, leads, and product.

---

## ✅ Done

### Core Calendar
- Monthly grid, Mon–Sun, navigate months
- Each ticket shows once at its latest status (🔵 released / 🟢 in review / 🟡 started)
- Mint cell backgrounds when events exist, black text
- Engineer initials badge on each chip
- Click chip → modal with full lifecycle + cycle time
- Ticket ID in modal links to Linear

### Metrics
- Avg cycle time in header
- Weekly 5-release goal: ✅/⬜ on each Sunday
- Per-engineer ticket counts (released / in review / in progress) below calendar

### Data Pipeline
- Release bot → engcal on every production deploy
- Linear webhook → live updates on state changes (started / in review / completed)
- Seed script for manual backfill (April 2026 seeded: 61 tickets)

---

## 🔲 Next Up

### High Priority
- **Confirm Linear webhook is working** — ask boss if URL is `https://engcal.vercel.app/api/linear-webhook` and Issues event is checked
- **Fix project detection** — all tickets showing as "web"; find actual Linear team names and update detection logic in webhook handler + seed script

### Medium Priority
- **Per-project cycle time** — add breakdown by project (web/mobile/functions/server) alongside overall avg in header
- **Matheus name fix** — his Linear profile has no last name; ask him to add "Matiazzo" in Linear settings so re-seeds show "MM" automatically

### Lower Priority
- **Monthly auto-seed** — run seed script at start of each month for new month's data
- **Remove debug messages** from #releasebotreview (🔍 posts) once next deploy confirms end-to-end flow works

---

## Data Notes
- InstantDB App ID: `867b7b82-9ef5-4467-864f-34d51728c0eb`
- All tickets currently labeled "web" (project detection not working)
- Seed script filtered to: completed OR active (started/inReview) issues with startedAt in April 2026
- releaseDate only set when explicitly provided — no Date.now() fallback (fixed bug where all tickets landed on seed date)
