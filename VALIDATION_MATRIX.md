# Festival Atlas Validation Matrix

## Scope

Core planner validation for the copied festival fork.

## Required Checks

| # | Area | Expected |
|---|------|----------|
| 1 | `index.html` | Dashboard loads with seeded counts, happening-soon picks, and route context |
| 2 | `festivals.html` | Festival list renders, guide status appears, and detail panel updates |
| 3 | `route.html` | Empty state renders without errors when no route exists |
| 4 | `setkeeper.html` | Setkeeper loads a fallback festival context |
| 5 | `data.js` | Seeded festivals initialize into local storage with source metadata |
| 6 | `schedule.js` | Session formatting and date-range helpers return readable festival dates |
| 7 | `logos.js` | Generated monogram marks render for every scene label |
| 8 | Mobile layout | Home and Setkeeper stay readable on phone width |
| 9 | `shared/js/core/` | Shared core modules load before product shims |
| 10 | Route reordering | Stop order can move up/down without dropping selected sessions |
| 11 | Setkeeper history | Mark attended writes a dated history entry and preserves planner context |
| 12 | Source freshness | Corrected 2026 dates show current `lastReviewed` where official sources were checked |
| 13 | `SOURCE_AUDIT.md` | Seeded catalog has an official-source audit trail and unresolved items are explicit |
| 14 | `audit.html` | Source audit, backup, restore, reset, diagnostics, and festival pack import controls render without errors |
| 15 | `npm run validate` | Syntax and browser regression checks run from a single command |

## Latest Run

| Date | Result | Notes |
|------|--------|-------|
| 2026-03-18 | pass | Desktop and mobile screenshot smoke checks completed for home and Setkeeper; desktop screenshot smoke checks completed for festivals and route |
| 2026-05-29 | pass | Static browser smoke opened home, festivals, route, and Setkeeper with seeded content and zero page errors; mobile width checked home and Setkeeper |
| 2026-05-29 | pass | Expanded Playwright smoke covered corrected date ranges, review filter, route reorder persistence, Setkeeper attended history, mobile home/Setkeeper rendering, and post-asset-cleanup references |
| 2026-05-29 | pass | Source-audit smoke verified corrected date labels, next-confirmed 2027 statuses, CRSSD-only review filter, route load, and Setkeeper load |
| 2026-05-29 | pass | Source-notes smoke verified CRSSD Fall 2026, next-confirmed notes, empty review filter, route notes, and Setkeeper note export |
| 2026-05-29 | pass | `npm run validate` passed after audit ops, festival pack import/reset checks, service worker cache update, cleanup changes, desktop smoke, and mobile smoke |
