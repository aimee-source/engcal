# engcal — Claude Context

## What This Project Is
A public engineering velocity calendar for Avida. Shows every feature's current status — started, in review, or released — on a monthly calendar grid. Each ticket appears once at its latest status. Inspired by Anthropic's 2026 shipping log.

Deployed at: `https://engcal.vercel.app`

---

## Tech Stack
- **Frontend/Backend:** Next.js 15 (App Router)
- **Database:** InstantDB (`features` entity)
- **Deployment:** Vercel (`aimee-6876s-projects` scope, project `engcal`)
- **Data sources:** Linear webhook (live) + release bot (on deploy) + seed script (manual backfill)

---

## Project Structure
```
app/
  page.tsx                      → main calendar view (public, no auth)
  api/
    add-release/route.ts        → called by release bot after confirmed deploy
    linear-webhook/route.ts     → called by Linear on any issue state change
lib/
  db.ts                         → InstantDB React client
  adminDb.ts                    → InstantDB admin client (server-side)
scripts/
  seed-from-linear.mjs          → manual backfill: fetches April completed + active issues
instant.schema.ts               → InstantDB schema
```

---

## Data Model

```typescript
features: {
  ticketId: string (unique, indexed)  // e.g. "S2-7306"
  title: string                        // feature name from Linear
  project: string                      // "web" | "server" | "mobile" | "functions"
  dri?: string                         // assignee full name (from Linear)
  startDate?: number                   // timestamp — when work began (Linear startedAt)
  demoDate?: number                    // timestamp — when ticket moved to "In Review"
  releaseDate?: number                 // timestamp — confirmed production deploy
  linearUrl?: string                   // link to Linear ticket
  notes?: string                       // optional context
}
```

---

## Calendar Behavior
- Monthly grid (Mon–Sun), navigate with ‹ ›
- Each ticket appears **once** at its latest status date:
  - 🔵 released → shown on releaseDate
  - 🟢 in review → shown on demoDate
  - 🟡 started → shown on startDate
- Chips show truncated title + engineer initials badge
- Cells with events have mint (`#c8f5e4`) background, black text
- Click any chip → modal with full lifecycle + cycle time (startDate → releaseDate)
- Ticket ID in modal links to Linear
- Header shows avg cycle time across all completed features
- Sunday cells show weekly goal: ✅ if 5+ released that week, ⬜ if not
- Bottom section shows per-engineer ticket counts (released / in review / in progress)

---

## Data Flow

### Live updates (Linear webhook)
Linear fires `POST /api/linear-webhook` on every issue state change.
- State type `started` → sets `startDate`
- State name includes "in review" → sets `demoDate`
- State type `completed` → sets `releaseDate`
- Auth: `LINEAR_WEBHOOK_SECRET` (HMAC-SHA256 signature verification)

### Release bot
Fires `POST /api/add-release` after every confirmed production deploy.
- Sets `releaseDate` for deployed tickets
- Pulls `startDate` and `demoDate` from Linear at deploy time
- Auth: `ENGCAL_SECRET` in request body

### Seed script
`node scripts/seed-from-linear.mjs`
- Fetches completed + active (started/inReview) issues for April 2026
- Requires `LINEAR_API_KEY` env var (generate new key if revoked)
- Posts to `/api/add-release` in batches of 50
- Safe to re-run (upserts by ticketId)

---

## API: `/api/add-release`
**Auth:** `ENGCAL_SECRET` in request body

```json
{
  "secret": "engcal-secret-2026",
  "releases": [{
    "ticketId": "S2-7306",
    "title": "Feature name",
    "project": "web",
    "dri": "Santiago Diaz",
    "startDate": 1743123456789,
    "demoDate": 1743123456789,
    "releaseDate": 1743123456789
  }],
  "releaseDate": 1743123456789  // optional batch fallback
}
```
- Upserts by `ticketId`
- Per-ticket `releaseDate` takes priority over batch `releaseDate`
- Only sets `releaseDate` if explicitly provided (no Date.now() fallback)

---

## Env Variables

| Variable | Description | Status |
|---|---|---|
| `NEXT_PUBLIC_INSTANT_APP_ID` | InstantDB app ID | Set |
| `INSTANT_ADMIN_TOKEN` | InstantDB admin token | Set |
| `ENGCAL_SECRET` | Shared secret for /api/add-release | Set (`engcal-secret-2026`) |
| `LINEAR_WEBHOOK_SECRET` | Linear webhook signing secret | Set |

---

## Package Manager & Commands
Use `npm`. Node via nvm at `/home/user/.nvm/`.

```bash
. /home/user/.nvm/nvm.sh && npm <command>
. /home/user/.nvm/nvm.sh && npx instant-cli push schema --yes
# Seed April data:
LINEAR_API_KEY=<key> node scripts/seed-from-linear.mjs
# Clear all features (InstantDB admin):
node -e "const {init}=require('@instantdb/admin');const db=init({appId:'867b7b82-9ef5-4467-864f-34d51728c0eb',adminToken:'e0059c70-9c08-471d-9dde-522121c623e3'});(async()=>{let t=0;while(true){const{features:f}=await db.query({features:{\$:{limit:100}}});if(!f.length)break;await db.transact(f.map(x=>db.tx.features[x.id].delete()));t+=f.length;}console.log('Deleted',t);})()"
```

## GitHub & Deployment
- Repo: `https://github.com/aimee-source/engcal.git`
- Token: stored in git remote URL
- Vercel auto-deploys on push to `main`
- Vercel scope: `aimee-6876s-projects`, project: `engcal`

---

## Known Issues / Pending
- [ ] Project detection broken — all tickets show as "web"; need to map actual Linear team names
- [ ] Per-project cycle time — header shows overall avg only; doc calls for per-project breakdown
- [ ] Matheus's DRI is stored as "matheus@system2.fitness" from Linear (no last name in profile); manually fixed to "Matheus Matiazzo" in DB but will revert on re-seed
- [ ] Linear webhook confirmation pending — boss set it up, need to verify URL + Issues event checked
