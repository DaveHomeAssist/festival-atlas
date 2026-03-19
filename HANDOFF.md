# Festival Atlas Handoff

## Project Summary

Festival Atlas is a static local first music festival planner. It now ships as a four page prototype:

1. `index.html`
   Dashboard with progress, shortlist, and route context
2. `parks.html`
   Festival explorer with filters, detail panel, and route actions
3. `route.html`
   Route board with stops, trip notes, and travel leg planning
4. `scorekeeper.html`
   Setkeeper journal for attended notes, standout sets, and session export

## Current Product Shape

The app keeps the shared local state and route model from the source project, but the visible experience is now festival specific.

Main flows:

1. Browse seeded festivals
2. Add stops to the route
3. Pick sessions for route stops
4. Export selected sessions to calendar
5. Journal the stop in Setkeeper
6. Mark the festival attended

## Key Files

1. `data.js`
   Seeded festival dataset
2. `schedule.js`
   Seeded session data and formatting helpers
3. `logos.js`
   Generated monogram marks for festival scenes
4. `index.html`
   Dashboard
5. `parks.html`
   Explorer
6. `route.html`
   Route board
7. `scorekeeper.html`
   Setkeeper journal
8. `shared.css`
   Shared tokens and shell styles

## Storage Notes

Shared planner state still uses the existing local storage namespace created by `storage.js`.

Additional journal state:

```text
festivalJournalEntries
```

Setkeeper also uses the shared scorekeeper context payload from `app.js` so route and explorer actions can open the right festival and session.

## Architecture Notes

1. Static HTML
2. Vanilla JavaScript
3. No build step
4. Local first persistence
5. Seeded sample content instead of live APIs

## Recommended Next Work

1. Replace copied source docs under `docs/` with festival specific references
2. Add route reorder controls
3. Add richer attended history instead of one entry per festival
4. Add import flow for festival packs
