# Festival Atlas — User Guide

Festival Atlas is a browser-based guide for planning your 2026 festival season: browse festivals, build a route across multiple events, check dates on a calendar, and log the sets you actually saw. Everything you do is saved on your own device — there's no account and nothing is sent to a server.

## Getting started

Open the app (`index.html`, or your deployed URL) in a browser. The **Dashboard** is your home base — it shows your overall progress, festivals happening soon, your shortlist, and a snapshot of your current route.

## The pages

- **Dashboard** (`index.html`) — Your starting point: progress at a glance, "happening soon" picks, your shortlist, and route context.
- **Explorer** (`festivals.html`) — Browse and filter every seeded festival. Each festival has a detail panel showing dates, location, official links, and how recently its dates were verified. From here you can add a festival to your route, save it to your shortlist, or mark it attended.
- **Calendar** (`calendar.html`) — See festival dates laid out by month. Search, jump to a month, view stats, and check "next-confirmed" dates for festivals whose 2026 dates aren't announced yet.
- **Route** (`route.html`) — Your trip planner. Reorder stops by dragging, add trip notes, jump to official source links, and plan travel legs between festivals.
- **Setkeeper** (`setkeeper.html`) — Your festival journal. Log sets you attended, flag standout performances, and export a session's notes. It also keeps your attended-festival history over time.
- **Audit** (`audit.html`) — A data-health page for the site's maintainer: it shows which festival dates need re-checking against official sources, and lets you back up, restore, or reset your local data, or import an updated festival data pack. Most visitors won't need this page day-to-day, but it's the place to go if your saved data ever needs a reset or a backup.

## Typical flow

1. Browse festivals in the **Explorer** and add the ones you're interested in to your **shortlist** or **route**.
2. Use the **Calendar** to spot-check dates and avoid overlaps.
3. Reorder and annotate your trip in **Route**.
4. Pick specific sessions for each stop and, if you like, export them to your own calendar.
5. After the festival, log it in **Setkeeper** — note standout sets and mark the festival attended so it moves into your history.
6. Before booking travel or tickets, check the source link and "last reviewed" date on a festival's detail panel — Festival Atlas seeds its dates from research, not a live feed, so always confirm against the official festival site first.

## Your data

Everything (route, shortlist, journal entries, attended history) is stored locally in your browser. If you switch browsers or devices, use the **backup/restore** tools on the Audit page to carry your data with you — nothing syncs automatically.
