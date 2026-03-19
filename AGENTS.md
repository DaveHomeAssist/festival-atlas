# AGENTS.md
# /Users/daverobertson/Desktop/Code/20-prototypes/Music Festivals/

## Project Overview

Festival Atlas is a static local first music festival planning prototype. The current goal is to reuse the stronger MLB planner structure, retheme it for festivals, and keep the app fast to browse, route, and journal.

## Stack

- Static HTML
- CSS
- Vanilla JavaScript
- localStorage
- GitHub Pages

## Key Decisions

- Keep the app static and local first
- Seed the planner with sample festival data instead of live feeds
- Use generated monogram marks instead of stored brand logos
- Keep the existing route and visit state shape to speed the reorientation
- Replace the scorekeeper with a festival set journal

## Issue Tracker

| ID | Severity | Status | Title | Notes |
|----|----------|--------|-------|-------|
| 001 | P2 | resolved | Reorient copied MLB planner for music festivals | Replaced seeded data, dashboard pages, route board, and scorekeeper with festival specific flows |

## Session Log

[2026-03-18] [MUSIC FESTIVALS] [feat] Copy the MLB prototype into a festival project
[2026-03-18] [MUSIC FESTIVALS] [refactor] Replace ballpark data and schedule with seeded festival content
[2026-03-18] [MUSIC FESTIVALS] [feat] Add Festival Atlas dashboard, explorer, route board, and set journal
[2026-03-18] [MUSIC FESTIVALS] [fix] Swap stored team logos for generated festival monogram marks
[2026-03-18] [MUSIC FESTIVALS] [docs] Rewrite copied handoff and writeup files for Festival Atlas
[2026-03-18] [MUSIC FESTIVALS] [chore] Remove copied MLB only schedule pages from the festival fork
[2026-03-18] [MUSIC FESTIVALS] [feat] Import 43 researched USA festivals and 2026 session dates into the prototype seed
