# Festival Atlas Handoff

## Project Summary

Festival Atlas is a static local first music festival planner. It now ships as a four page prototype:

1. `index.html`
   Dashboard with progress, happening-soon picks, shortlist, and route context
2. `festivals.html`
   Festival explorer with filters, source status, review scope, detail panel, and route actions
3. `route.html`
   Route board with reorderable stops, trip notes, source links, and travel leg planning
4. `setkeeper.html`
   Setkeeper journal for attended history, standout sets, and session export

## Current Product Shape

The app keeps the shared local state and route model from the source project, but the visible experience is now festival specific. The product direction is now a current 2026 planning guide, so the UI surfaces date ranges, official source links, season status, and data-review status.

Main flows:

1. Browse seeded festivals
2. Add stops to the route
3. Pick sessions for route stops
4. Export selected sessions to calendar
5. Journal the stop in Setkeeper and preserve attended history
6. Mark the festival attended
7. Recheck official source links before booking

## Key Files

1. `data.js`
   Seeded festival dataset
2. `schedule.js`
   Seeded session data and formatting helpers
3. `logos.js`
   Generated monogram marks for festival scenes
4. `index.html`
   Dashboard
5. `festivals.html`
   Explorer
6. `route.html`
   Route board
7. `setkeeper.html`
   Setkeeper journal
8. `shared.css`
   Shared tokens and shell styles
9. `shared/js/core/`
   Shared config, storage, utility, and device helpers required by the static pages
10. `SOURCE_AUDIT.md`
   Official source audit trail for seeded date ranges
11. `audit.html`
   Operations page for source audit, backup, restore, reset, diagnostics, and festival pack import
12. `package.json`
   Provides `npm run validate` production smoke validation
13. `PRODUCTION_READINESS.md`
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
2. Consider richer festival pack validation previews before applying imports
3. Add a lightweight release note page if this becomes a public-facing maintained project
