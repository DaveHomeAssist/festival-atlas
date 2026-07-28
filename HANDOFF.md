# Festival Atlas Handoff

## Project Summary

Festival Atlas is a static local first music festival planner. It now ships as a six page prototype:

1. `index.html`
   Dashboard with progress, happening-soon picks, shortlist, and route context
2. `festivals.html`
   Festival explorer with filters, source status, review scope, detail panel, and route actions
3. `calendar.html`
   Month calendar with search, month jump, stats, route stops, saved targets, and next-confirmed dates
4. `route.html`
   Route board with reorderable stops, trip notes, source links, and travel leg planning
5. `setkeeper.html`
   Setkeeper journal for attended history, standout sets, and session export
6. `audit.html`
   Operations surface for source audit, verification queue, backups, diagnostics, and import preview/apply

## Current Product Shape

The app keeps the shared local state and route model from the source project, but the visible experience is now festival specific. The product direction is now a current 2026 planning guide, so the UI surfaces date ranges, official source links, season status, data-review status, and optional ops/outreach intelligence.

Main flows:

1. Browse seeded festivals
2. Add stops to the route
3. Scan festival dates in the calendar
4. Pick sessions for route stops
5. Export selected sessions to calendar
6. Journal the stop in Setkeeper and preserve attended history
7. Mark the festival attended
8. Recheck official source links before booking
9. Preview and apply the Summer 2026 outreach pack when production, vendor, sponsor, or labor scouting is needed
10. Treat the ChatGPT Deep Research Summer Music Festivals 2026 pack as baseline data, auto-loaded on startup
11. Treat the ChatGPT Deep Research International Summer Festivals 2026 pack as baseline data, auto-loaded on startup
12. Prioritize outreach with ops opportunity scores and any remaining non-canonical source flags

## Key Files

1. `data.js`
   Seeded festival dataset
2. `schedule.js`
   Seeded session data and formatting helpers
3. `logos.js`
   Generated monogram marks for festival scenes
4. `outreach-pack.js`
   Built-in Summer 2026 outreach pack harvested from local research artifacts
5. `deep-research-pack.js`
   Built-in canonical ChatGPT Deep Research Summer Music Festivals 2026 pack
6. `international-research-pack.js`
   Built-in canonical ChatGPT Deep Research International Summer Festivals 2026 pack with separate entries for non-contiguous festival weekends
7. `index.html`
   Dashboard
8. `festivals.html`
   Explorer
9. `calendar.html`
   Calendar
10. `route.html`
   Route board
11. `setkeeper.html`
   Setkeeper journal
12. `shared.css`
   Shared tokens and shell styles
13. `shared/js/core/`
   Shared config, storage, utility, and device helpers required by the static pages
14. `SOURCE_AUDIT.md`
   Official source audit trail for seeded date ranges
15. `audit.html`
   Operations page for source audit, verification queue, backup, restore, reset, diagnostics, and festival pack preview/apply
16. `package.json`
   Provides `npm run validate` production smoke validation
17. `PRODUCTION_READINESS.md`
   Release checklist, source policy, privacy notes, and known constraints

## Storage Notes

Shared planner state still uses the existing local storage namespace created by `storage.js`.

Additional journal state:

```text
festivalJournalEntries
festivalJournalHistory
```

Setkeeper also uses the shared journal context payload from `app.js` so route and explorer actions can open the right festival and session.

## Source Freshness

Verified on 2026-05-29:

1. Corrected ACL, Ohana, Sea.Hear.Now, Treefort, Telluride, III Points, Shaky Knees, Summer Camp, Ubbi Dubbi, Goldrush, CRSSD, Bumbershoot, Capitol Hill Block Party, and Kilby
2. Updated next-confirmed 2027 dates for Boston Calling, Ultra, EDC Las Vegas, SXSW, BottleRock, and Kilby
3. Marked recently checked official sources with per-festival `lastReviewed`
4. Added source notes for next-confirmed 2027 festivals and special cases such as CRSSD Fall 2026

## Architecture Notes

1. Static HTML
2. Vanilla JavaScript
3. No build step
4. Local first persistence
5. Seeded sample content instead of live APIs
6. Legacy copied baseball media has been moved to `archives/legacy-mlb-assets/`; the live app now relies on generated marks and `icons/`

## Recommended Next Work

1. Replace generated marks with real festival-safe visual assets only when rights/source are clear
2. Add CSV and print export to the calendar view using the preview prototype as reference
3. Add manual verification status controls so reviewed queue items can be resolved in local state
4. Add a manual canonical/non-canonical toggle if future research packs need local override controls
5. Add a lightweight release note page if this becomes a public-facing maintained project
