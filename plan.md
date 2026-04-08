# engcal — Engineering Velocity Calendar

## Overview
A public monthly calendar showing every feature's lifecycle from start → demo → production. Avida's answer to Anthropic's 2026 shipping log. Goal: make cycle times visible so we can shorten them.

---

## Features

### 1. Calendar View
- Monthly grid (Mon–Sun), navigate month to month
- Each day shows feature events as colored chips
- 🟢 Started · 🟡 Demo'd · 🔵 Released
- Color-coded by project: web / server / mobile / functions
- Click any chip → detail modal (title, DRI, all dates, cycle time, Linear link)
- Avg cycle time shown in header

### 2. Data Entry — Automated (Release Bot)
- Release bot detects production deploy → extracts Linear ticket IDs from screenshot
- POSTs ticket data to `/api/add-release` with release date
- Upserts by ticketId — safe to call multiple times

### 3. Data Entry — Manual (Future)
- Form for DRIs to add start dates and demo dates
- Auth via shared password or magic code

### 4. Metrics (Future)
- Per-project cycle time breakdown
- Rolling 4-week velocity chart
- Demo → release lag tracking

---

## Tech Stack
- **Frontend/Backend:** Next.js 15 (App Router)
- **Database:** InstantDB (real-time, no polling needed)
- **Deployment:** Vercel (`engcal.vercel.app`)

---

## Status

### Done
- [x] Project scaffolded (Next.js + InstantDB)
- [x] InstantDB schema (features entity with all lifecycle dates)
- [x] Monthly calendar grid with Mon–Sun layout
- [x] Color-coded project chips with event type icons
- [x] Feature detail modal with cycle time calculation
- [x] Avg cycle time in header
- [x] `/api/add-release` endpoint (ENGCAL_SECRET auth, upsert by ticketId)
- [x] Schema pushed to InstantDB
- [x] Deployed to GitHub

### Pending
- [ ] Deploy to Vercel + set env vars
- [ ] Connect release bot (add ENGCAL_URL + ENGCAL_SECRET to releasebot)
- [ ] Pull startDate from Linear when ticket moves to In Progress
- [ ] Manual entry form for demo dates
- [ ] Seed historical data (back-fill past releases)

---

## Env Variables

| Variable | Description | Status |
|---|---|---|
| `NEXT_PUBLIC_INSTANT_APP_ID` | InstantDB app ID (`867b7b82-...`) | Set |
| `INSTANT_ADMIN_TOKEN` | InstantDB admin token | Set |
| `ENGCAL_SECRET` | Auth secret for release bot API calls | Set (`engcal-secret-2026`) |
