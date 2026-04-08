# engcal — Claude Context

## What This Project Is
A public engineering velocity calendar for Avida. Shows every feature's full lifecycle — started, demo'd, released to production — on a monthly calendar view. Inspired by Anthropic's 2026 shipping log. Avg cycle time shown in header.

Deployed at: `https://engcal.vercel.app` (or similar)

---

## Tech Stack
- **Frontend/Backend:** Next.js 15 (App Router)
- **Database:** InstantDB (`features` entity)
- **Deployment:** Vercel (`aimee-6876s-projects` scope, project `engcal`)
- **Data source:** Release bot (auto) + manual entry (future)

---

## Project Structure
```
app/
  page.tsx                  → main calendar view (public, no auth)
  api/
    add-release/route.ts    → called by release bot after confirmed deploy
lib/
  db.ts                     → InstantDB React client
  adminDb.ts                → InstantDB admin client (server-side)
instant.schema.ts           → InstantDB schema
```

---

## Data Model

```typescript
features: {
  ticketId: string (unique, indexed)  // e.g. "S2-7306"
  title: string                        // feature name from Linear
  project: string                      // "web" | "server" | "mobile" | "functions"
  dri?: string                         // person responsible
  startDate?: number                   // timestamp — when work began
  demoDate?: number                    // timestamp — when demo'd to Product
  releaseDate?: number                 // timestamp — confirmed production deploy
  linearUrl?: string                   // link to Linear ticket
  notes?: string                       // optional context
}
```

---

## Calendar Behavior
- Monthly grid (Mon–Sun), navigate with ‹ ›
- Each date shows events as colored chips with icons:
  - 🟢 started (startDate)
  - 🟡 demo'd (demoDate)
  - 🔵 released (releaseDate)
- Color-coded by project: blue=web, violet=server, orange=mobile, green=functions
- Click any chip → modal with full lifecycle + cycle time (startDate → releaseDate)
- Header shows avg cycle time across all features with both dates

---

## API: `/api/add-release`
Called by the release bot after a confirmed production deploy.

**Auth:** `ENGCAL_SECRET` env var (shared secret in request body)

**Request body:**
```json
{
  "secret": "engcal-secret-2026",
  "releases": [
    {
      "ticketId": "S2-7306",
      "title": "Add upsell offer detection, banner and modal",
      "project": "mobile",
      "linearUrl": "https://linear.app/...",
      "dri": "supunvr"
    }
  ],
  "releaseDate": 1743123456789
}
```

- Upserts by `ticketId` — if ticket already exists, updates `releaseDate` without overwriting `startDate`/`demoDate`
- Returns `{ ok: true, count: N }`

---

## Key Decisions
- **No auth on read** — calendar is public/shared link for whole team + product
- **Upsert by ticketId** — safe to call multiple times; release bot won't duplicate entries
- **startDate from Linear** — pulled via Linear API when release bot processes tickets (future: also add startDate when ticket moves to In Progress)
- **demoDate manual** — no automated source; added manually by DRI or lead

---

## Env Variables

| Variable | Description | Status |
|---|---|---|
| `NEXT_PUBLIC_INSTANT_APP_ID` | InstantDB app ID | Set |
| `INSTANT_ADMIN_TOKEN` | InstantDB admin token | Set |
| `ENGCAL_SECRET` | Shared secret for /api/add-release | Set (`engcal-secret-2026`) |

---

## Package Manager & Commands
Use `npm`. Node via nvm at `/home/user/.nvm/`.

```bash
. /home/user/.nvm/nvm.sh && npm <command>
. /home/user/.nvm/nvm.sh && npx instant-cli push schema --yes
```

## GitHub & Deployment
- Repo: `https://github.com/aimee-source/engcal.git`
- Push via HTTPS with personal access token
- Vercel auto-deploys on push to `main`
- Vercel scope: `aimee-6876s-projects`, project: `engcal`

---

## Known Issues / Pending
- [ ] startDate not yet pulled from Linear (release bot only sets releaseDate for now)
- [ ] demoDate entry UI — manual entry form for DRIs to log demo dates
- [ ] Release bot integration — needs ENGCAL_URL + ENGCAL_SECRET added to releasebot env vars
- [ ] Add feature manually from UI (for features not in Linear or pre-bot history)
