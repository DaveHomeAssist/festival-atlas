# Festival Atlas Validation Matrix

## Scope

Core planner validation for the copied festival fork.

## Required Checks

| # | Area | Expected |
|---|------|----------|
| 1 | `index.html` | Dashboard loads with seeded counts and shortlist |
| 2 | `parks.html` | Festival list renders and detail panel updates |
| 3 | `route.html` | Empty state renders without errors when no route exists |
| 4 | `scorekeeper.html` | Setkeeper loads a fallback festival context |
| 5 | `data.js` | Seeded festivals initialize into local storage |
| 6 | `schedule.js` | Session formatting returns readable date and artist lines |
| 7 | `logos.js` | Generated monogram marks render for every scene label |
| 8 | Mobile layout | Home and Setkeeper stay readable on phone width |

## Latest Run

| Date | Result | Notes |
|------|--------|-------|
| 2026-03-18 | pass | Desktop and mobile screenshot smoke checks completed for home and Setkeeper; desktop screenshot smoke checks completed for festivals and route |
