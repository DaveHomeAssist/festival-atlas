# Changelog

Sourced from the actual commit history (`git log --format="%ad|%s" --date=short --reverse`). Grouped by date/feature.

## 2026-03-18 — Prototype born from an MLB planner fork
- Initialize Festival Atlas prototype repo; add initial assets and reference docs
- Add search clarity, shortlist, share trips, logistics links, planner assumptions, and a sample itinerary
- Fix undersized body text (bump helper/info text from 9-10px to 13px)
- Mobile UX pass: fix touch targets, text sizes, and layout at 375px
- Move Add to Route, Save, and Mark Attended to the top of the detail panel

## 2026-03-19 — Housekeeping
- Add local `archives/` ignore
- Sync local changes

## 2026-03-20 — Identity cutover from the MLB source project
- Purge MLB content and establish the Festival Atlas identity
- Merge duplicate `archive/` into `archives/`
- Add accessibility features to all 4 pages

## 2026-03-21 — Polish and cross-project sweep
- Add portfolio back link to all 4 pages
- Add meta descriptions, `prefers-reduced-motion` support, and favicon fixes
- Cross-project agent sweep: OG meta, accessibility, and performance fixes

## 2026-04-17 – 2026-04-18 — Stability fixes
- Silence service worker registration warning; add project docs
- Include `shared/js/core` modules needed by page scripts
- Sync `storage.js` quota guard from `quest-platform`
- Bump service worker cache to v2; remove deprecated `AGENTS.md`

## 2026-05-29 — Production prep and new views
- Prepare Festival Atlas for production
- Add the festival calendar view (`calendar.html`)
- Add the Summer 2026 outreach intelligence pack (`outreach-pack.js`)
- Record deployed production smoke test

## 2026-05-30 — Showready planning controls
- Add showready planning controls (source metadata, season status helpers, guide freshness UI, route reordering, attended history, audit ops page, backup/restore/reset, diagnostics, validation script)
- Add the canonical ChatGPT Deep Research data packs (`deep-research-pack.js`, `international-research-pack.js`)

## 2026-06-13 — Mobile app spec and scaffold
- Add the Festival Atlas mobile application spec (`MOBILE_APP_SPEC.md`)
- Lock React Native + Expo as the mobile framework decision
- Resolve remaining mobile spec scope questions
- Scaffold the React Native + Expo app per the mobile spec (`mobile/`)

## 2026-06-21 – 2026-06-23 — Mobile app build-out
- Merge PR #1 (mobile scaffold)
- Implement deferred mobile phases: map, camera, reminders, share, and calendar integration
- Merge PR #2 (deferred mobile phases)

## 2026-07-03 — Baseline data automation and verification
- Auto-load the Deep Research 2026 packs as baseline data; production validation updates
- Close issue 002 — post-deploy verification passed 2026-07-03

## 2026-07-06 — Licensing
- Add LICENSE (explicit all-rights-reserved)
