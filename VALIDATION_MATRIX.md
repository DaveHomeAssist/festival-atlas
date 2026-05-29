# Festival Atlas Validation Matrix

## Scope

Core planner validation for the copied festival fork.

## Required Checks

| # | Area | Expected |
|---|------|----------|
| 1 | `index.html` | Dashboard loads with seeded counts, happening-soon picks, and route context |
| 2 | `festivals.html` | Festival list renders, guide status appears, and detail panel updates |
| 3 | `calendar.html` | Month grid renders festival sessions, filters, and selected event actions |
| 4 | `route.html` | Empty state renders without errors when no route exists |
| 5 | `setkeeper.html` | Setkeeper loads a fallback festival context |
| 6 | `data.js` | Seeded festivals initialize into local storage with source metadata |
| 7 | `schedule.js` | Session formatting and date-range helpers return readable festival dates |
| 8 | `logos.js` | Generated monogram marks render for every scene label |
| 9 | Mobile layout | Home, Calendar, Audit, and Setkeeper stay readable on phone width |
| 10 | `shared/js/core/` | Shared core modules load before product shims |
| 11 | Route reordering | Stop order can move up/down without dropping selected sessions |
| 12 | Setkeeper history | Mark attended writes a dated history entry and preserves planner context |
| 13 | Source freshness | Corrected 2026 dates show current `lastReviewed` where official sources were checked |
| 14 | `SOURCE_AUDIT.md` | Seeded catalog has an official-source audit trail and unresolved items are explicit |
| 15 | `audit.html` | Source audit, backup, restore, reset, diagnostics, and festival pack import controls render without errors |
| 16 | `outreach-pack.js` | Summer 2026 outreach pack imports, merges ops intelligence, adds new calendar events, and can be reset |
| 17 | `npm run validate` | Syntax and browser regression checks run from a single command |

## Latest Run

| Date | Result | Notes |
|------|--------|-------|
| 2026-03-18 | pass | Desktop and mobile screenshot smoke checks completed for home and Setkeeper; desktop screenshot smoke checks completed for festivals and route |
| 2026-05-29 | pass | Static browser smoke opened home, festivals, route, and Setkeeper with seeded content and zero page errors; mobile width checked home and Setkeeper |
| 2026-05-29 | pass | Expanded Playwright smoke covered corrected date ranges, review filter, route reorder persistence, Setkeeper attended history, mobile home/Setkeeper rendering, and post-asset-cleanup references |
| 2026-05-29 | pass | Source-audit smoke verified corrected date labels, next-confirmed 2027 statuses, CRSSD-only review filter, route load, and Setkeeper load |
| 2026-05-29 | pass | Source-notes smoke verified CRSSD Fall 2026, next-confirmed notes, empty review filter, route notes, and Setkeeper note export |
| 2026-05-29 | pass | `npm run validate` passed after audit ops, festival pack import/reset checks, service worker cache update, cleanup changes, desktop smoke, and mobile smoke |
| 2026-05-29 | pass | Deployed GitHub Pages smoke passed for home, audit, festivals review filter, route, and Setkeeper at `https://davehomeassist.github.io/festival-atlas/` |
| 2026-05-29 | pass | Calendar validation covered visible month events, June 2026 helper events, next-confirmed events, active nav, and mobile render |
| 2026-05-29 | pass | Outreach pack validation covered 20 pack records, created/merged imports, ops metadata, September calendar events, and reset cleanup |
