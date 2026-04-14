# engcal — Plan & Status

## Goal
Live engineering velocity calendar that automatically tracks every feature from start → demo → release. Public link shared with eng team, leads, and product.

---

## ✅ Done

### Core Calendar
- Monthly grid, Mon–Sun, navigate months
- Each ticket shows once at its latest status (🔵 released / 🟢 in review)
- Started-only tickets hidden from calendar (no visual noise)
- Mint cell backgrounds when events exist, black text
- Engineer initials badge on each chip
- Click chip → modal with full lifecycle + cycle time
- Ticket ID in modal links to Linear

### Metrics
- Avg cycle time in header
- Weekly 5-release goal: ✅/⬜ on each Sunday

### Data Pipeline
- Release bot → engcal on every production deploy
- Linear webhook → live updates on state changes (started / in review / completed)
- Seed script for manual backfill (April 2026 seeded: 61 tickets)

---

## 🔲 Next Up

### High Priority
- **Confirm Linear webhook is working** — ask boss if URL is `https://engcal.vercel.app/api/linear-webhook` and Issues event is checked

### Lower Priority
- **Remove debug 🔍 messages** from #releasebotreview once release bot end-to-end flow is confirmed working
- **Monthly auto-seed** — run seed script at start of each month for new month's data

---

## Decided Against
- Per-engineer ticket metrics — removed, too noisy
- Multi-day feature bars — reverted, too cluttered with 60+ tickets
- Project color distinction (web/mobile/functions/server) — removed, not needed
- Per-project cycle time breakdown — deprioritized

---

## Data Notes
- InstantDB App ID: `867b7b82-9ef5-4467-864f-34d51728c0eb`
- Project field not reliable — all tickets labeled "web", doesn't matter
- Seed script: completed OR active (started/inReview) issues with startedAt in April 2026
- releaseDate only set when explicitly provided — no Date.now() fallback
