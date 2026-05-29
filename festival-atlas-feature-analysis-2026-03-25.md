# Festival Atlas — Feature Analysis

**Date:** 2026-03-25
**Project:** festival-atlas
**Stack:** Static HTML/CSS/JS, localStorage, Service Worker PWA, GitHub Pages + Vercel (via quest-platform)

---

## Summary Table

| Feature | Status | Data Source / Persistence | Critical Gap |
|---|---|---|---|
| Festival Visit Tracker | Complete | localStorage (`fa.prototype:visits` via FA namespace) | No cloud sync; data loss on browser clear |
| 43-Festival Directory w/ Detail Panel | Complete | Seeded in `data.js` (static) with enrichment metadata | Festival dates not surfaced; only session schedule stubs |
| Route Planner w/ Leg Builder | Complete | localStorage (`fa.prototype:activeTrip`) | Identical MLB architecture; no festival-specific logistics |
| Set Journal (Setkeeper) | Complete | `setkeeper.html` — festival-specific journal replacement | Lighter than MLB scorekeeper but still a single-file page |
| Festival Explorer Page | Complete | `festivals.html` — filterable directory | Filters reuse MLB park filters (visited/unvisited, roof/setting) |
| SVG Route Map Visualization | Complete | US-centric projection from coordinates | US-only; would break for international festivals |
| Booking/Travel Enrichment Data | Complete | `ENRICHMENT` object in `data.js` per festival | Data is static; no live flight/hotel integration |
| Monogram Logo Generation | Complete | `logos.js` generates text marks instead of image logos | Functional but visually basic; no brand assets |
| Service Worker / PWA | Complete | Cache-first via `sw.js` | Copied from MLB; cache name may collide if both installed |
| Theme System | Partial | `theme-switcher.js` / `theme-switcher-ui.js` present | Themes still carry MLB team names (phillies, yankees, etc.) |
| Shortlist Feature Flag | Configured | `config.js` sets `features.shortlist: true` | Config flag set but shortlist UI not visibly implemented |
| Trip Share Feature Flag | Configured | `config.js` sets `features.tripShare: true` | Config flag set but no share/export UI built |
| Logistics Links Feature Flag | Configured | `config.js` sets `features.logisticsLinks: true` | Config flag set but Google Flights/Hotels links not wired |
| Quest-Platform Shared Core | Active | `shared/js/core/` loaded via script tags | Same shim pattern as MLB; inherits same limitations |
| Genre/Setting Metadata | Complete | Each festival has `team` (genre), `roof` (setting type) | Field names still use MLB terms (`team`, `roof`, `parks` key) |
| Ticket Approach / Transit Notes | Complete | Per-festival advisory text in seed data | Manually written; covers official purchase + local transport |
| Special Events per Festival | Complete | Array per festival in `data.js` | Static; no date-specific event scheduling |

---

## Detailed Feature Analysis

### 1. 43-Festival Directory

**Problem it solves:** Provides a browseable reference of 43 major US music festivals with genre, city, tier ranking, ticket approach, transit notes, booking metadata (airport codes, lodging queries), and special event highlights.

**Implementation:** `data.js` contains a `SEEDED_PARKS` array (variable name carried from MLB fork) with 43 festival objects. Each has: `id`, `name`, `team` (genre tags), `city`, `roof` (setting type: Urban/Camping/Waterfront/Mixed/Outdoor/Amphitheater), `tier` (S/A/B), `color`, `note`, `ticketApproach`, `transitNote`, `coordinates`, `specialEvents`. An `ENRICHMENT` object adds `searchMeta` (local name, region) and `booking` (airport code, lodging query, ground transport query) per festival.

**Tradeoffs and limitations:**
- Field naming carries MLB terminology (`team` = genre, `roof` = setting, `parks` = festivals). This makes the code harder to read for festival-specific context.
- Festival dates (when the festival actually occurs in 2026) are not stored in the seed data, only described in prose.
- No capacity data for most festivals.

### 2. Route Planner

**Problem it solves:** Lets users build a multi-festival road trip with driving leg estimates, trip notes, and trip window date filtering.

**Implementation:** Identical architecture to MLB Ballparks Quest. `route.html` + `route.js` render trip notes, route stop cards, SVG map, and leg cards. Legs use Haversine distance. Ticket intelligence badges parse `ticketApproach` text. Trip scratchpads auto-extract dates and prices from free-text notes.

**Tradeoffs and limitations:**
- The route planner is unchanged from MLB. Festival-specific logistics (camping gear, multi-day stays, airport shuttle bookings) are not surfaced.
- The `ENRICHMENT` data includes airport codes and lodging/ground queries that could power deep links to Google Flights, Hotels, and Maps — but these links are not wired up despite the `features.logisticsLinks: true` flag.

### 3. Set Journal (Setkeeper)

**Problem it solves:** Replaces the MLB scorekeeper with a festival-appropriate journaling tool for recording sets seen, notes, and experiences.

**Implementation:** `setkeeper.html` is the festival equivalent of `scorekeeper.html`. It is a lighter implementation focused on note-taking rather than the dense grid-based scoring of baseball. Context flows from the route/explorer pages via `setScorekeeperContext()` in `app.js`.

**Tradeoffs and limitations:**
- Still a single-file HTML page, though smaller than the MLB scorekeeper.
- The context key is still named `scorekeeperContext` internally.

### 4. Monogram Logo Generation

**Problem it solves:** Since festival brands do not have standardized team logos like MLB, the app generates text-based monogram marks instead of loading image files.

**Implementation:** `logos.js` generates marks programmatically rather than mapping to PNG assets. This avoids the need for 43 festival brand images.

**Tradeoffs and limitations:**
- Visually basic compared to the MLB team logos.
- No path to richer brand imagery without sourcing and licensing festival logos.

### 5. Theme System

**Problem it solves:** Provides visual customization via team-themed color palettes.

**Implementation:** `theme-switcher.js` and `theme-switcher-ui.js` are carried over from the MLB fork. The theme registry still contains MLB team names (phillies, yankees, dodgers, cubs, mets).

**Tradeoffs and limitations:**
- Themes are completely MLB-branded. No festival-appropriate themes exist.
- The `config.js` sets `defaultTheme: "atlas-night"` but this theme key does not exist in the registry. The app falls back to "phillies".

### 6. Booking / Travel Enrichment

**Problem it solves:** Enriches each festival with practical travel planning data — nearest airport, lodging search terms, and ground transport recommendations.

**Implementation:** The `ENRICHMENT` object in `data.js` provides per-festival `booking` objects with `airportCode`, `lodgingQuery`, and `groundQuery`. Combined with the `searchMeta` (local name, region), this data could power one-click links to booking tools.

**Tradeoffs and limitations:**
- The data exists but is not rendered anywhere in the UI. No booking links, no airport badges, no hotel search integration.
- The `features.logisticsLinks: true` flag in `config.js` suggests this was planned but not built.

### 7. Feature Flags Without Implementation

**Problem it solves:** `config.js` declares three feature flags that are not yet implemented:

| Flag | Value | Intended Purpose | Current State |
|---|---|---|---|
| `shortlist` | `true` | Let users shortlist festivals without adding to route | Not built |
| `logisticsLinks` | `true` | Deep links to flights, hotels, ground transport | Not built |
| `tripShare` | `true` | Export/share trip plans | Not built |

These represent the next layer of festival-specific differentiation from the MLB product.

---

## Top 3 Priorities

1. **Replace MLB theme registry with festival themes** — The app currently falls back to "phillies" as the default theme because "atlas-night" does not exist. Creating 3-5 festival-appropriate color themes (e.g., desert, forest, urban, waterfront) would establish visual identity.

2. **Wire up booking/logistics links** — The enrichment data already includes airport codes, lodging queries, and ground transport info for every festival. Rendering these as actionable links (Google Flights, Google Hotels, Maps) would unlock the primary festival-specific value that the MLB product does not have.

3. **Rename MLB field names** — The code uses `team` for genre, `roof` for setting type, `parks` for the data key, and `scorekeeperContext` for the journal context. A rename pass would make the codebase intelligible to festival-context contributors and reduce confusion during maintenance.
