/*
 * generate-seed.cjs
 *
 * Extracts the canonical festival seed + 2026 schedule from the web app's
 * data.js / schedule.js and emits JSON the mobile app bundles. Running this
 * (instead of hand-porting) guarantees the mobile seed never drifts from the
 * web canon. Re-run after any change to ../../data.js or ../../schedule.js:
 *
 *   node mobile/scripts/generate-seed.cjs
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const OUT_DIR = path.resolve(__dirname, "..", "src", "data");

// The web modules are browser IIFEs of the form (function (global) { ... })(window).
// Provide just enough of a window + FA.storage shim for them to load and seed.
global.window = global;
global.FA = {
  storage: {
    get() {
      return null; // force the modules to fall back to their seeded defaults
    },
    set() {},
  },
};

require(path.join(ROOT, "data.js"));
require(path.join(ROOT, "schedule.js"));

const data = global.FA.data;
const schedule = global.FA.schedule;

if (!data || !Array.isArray(data.SEEDED_PARKS)) {
  throw new Error("Failed to load SEEDED_PARKS from data.js");
}
if (!schedule || typeof schedule.getGamesForPark !== "function") {
  throw new Error("Failed to load schedule helpers from schedule.js");
}

// Map the MLB-era field names onto festival-context aliases while keeping the
// originals, so the mobile app can read clean names without losing fidelity.
const festivals = data.SEEDED_PARKS.map((park) => ({
  id: park.id,
  name: park.name,
  genre: park.team, // `team` historically held genre tags
  setting: park.roof, // `roof` historically held the venue setting
  city: park.city,
  tier: park.tier,
  color: park.color,
  capacity: park.capacity,
  note: park.note,
  ticketApproach: park.ticketApproach,
  transitNote: park.transitNote,
  coordinates: park.coordinates,
  specialEvents: park.specialEvents || [],
  searchMeta: park.searchMeta || { localName: park.name, region: "" },
  booking: park.booking || { airportCode: "", lodgingQuery: "", groundQuery: "" },
  officialUrl: park.officialUrl || "",
  lastReviewed: park.lastReviewed || "",
  sourceLabel: park.sourceLabel || "",
  sourceNote: park.sourceNote || "",
  dateConfidence: park.dateConfidence || "official",
}));

const scheduleByFestival = {};
festivals.forEach((festival) => {
  const sessions = schedule.getGamesForPark(festival.id) || [];
  scheduleByFestival[festival.id] = sessions.map((session) => ({
    weekday: session.y || "",
    date: session.d || "",
    time: session.t || null,
    headliner: session.o || null,
    label: session.s || "",
  }));
});

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUT_DIR, "festivals.json"),
  JSON.stringify(festivals, null, 2) + "\n"
);
fs.writeFileSync(
  path.join(OUT_DIR, "schedule.json"),
  JSON.stringify(scheduleByFestival, null, 2) + "\n"
);

console.log(
  `Wrote ${festivals.length} festivals and schedules for ` +
    `${Object.keys(scheduleByFestival).length} festivals to src/data/`
);
