/*
 * smoke-test.cjs
 *
 * Plain-node smoke test for the mobile app's bundled data layer, in the same
 * no-framework style as the web app's scripts/validate-production.js:
 *
 *   1. Structural invariants of the committed seed (festivals + schedule).
 *   2. Seed drift: regenerating from ../data.js + ../schedule.js must
 *      reproduce the committed JSON byte-for-byte.
 *
 * Run via `npm test` (or `node scripts/smoke-test.cjs`).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const DATA_DIR = path.resolve(__dirname, "..", "src", "data");
const FESTIVALS_PATH = path.join(DATA_DIR, "festivals.json");
const SCHEDULE_PATH = path.join(DATA_DIR, "schedule.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function checkSeedInvariants() {
  const festivals = JSON.parse(fs.readFileSync(FESTIVALS_PATH, "utf8"));
  const schedule = JSON.parse(fs.readFileSync(SCHEDULE_PATH, "utf8"));

  assert(Array.isArray(festivals), "festivals.json should be an array");
  assert(festivals.length === 43, `seed should hold the canonical 43 festivals, got ${festivals.length}`);

  const ids = new Set();
  for (const festival of festivals) {
    assert(festival.id && typeof festival.id === "string", "every festival needs a string id");
    assert(!ids.has(festival.id), `duplicate festival id: ${festival.id}`);
    ids.add(festival.id);
    assert(festival.name, `festival ${festival.id} needs a name`);
    assert(festival.city, `festival ${festival.id} needs a city`);
    assert(
      festival.coordinates &&
        Number.isFinite(festival.coordinates.lat) &&
        Number.isFinite(festival.coordinates.lng),
      `festival ${festival.id} needs numeric coordinates`
    );
  }

  const scheduleIds = Object.keys(schedule);
  assert(scheduleIds.length === 43, `schedule.json should cover 43 festivals, got ${scheduleIds.length}`);
  for (const id of scheduleIds) {
    assert(ids.has(id), `schedule references unknown festival id: ${id}`);
    const sessions = schedule[id];
    assert(Array.isArray(sessions) && sessions.length > 0, `festival ${id} should have at least one session`);
    for (const session of sessions) {
      assert(/^\d{4}-\d{2}-\d{2}$/.test(String(session.date || "")), `festival ${id} has a non-ISO session date: ${session.date}`);
    }
  }

  console.log(`Seed invariants pass: ${festivals.length} festivals, ${scheduleIds.length} schedules.`);
}

function checkSeedDrift() {
  const before = {
    festivals: fs.readFileSync(FESTIVALS_PATH, "utf8"),
    schedule: fs.readFileSync(SCHEDULE_PATH, "utf8")
  };

  const result = spawnSync(process.execPath, [path.join(__dirname, "generate-seed.cjs")], {
    encoding: "utf8",
    stdio: "pipe"
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    throw new Error("generate-seed.cjs failed");
  }

  const after = {
    festivals: fs.readFileSync(FESTIVALS_PATH, "utf8"),
    schedule: fs.readFileSync(SCHEDULE_PATH, "utf8")
  };

  const drifted = before.festivals !== after.festivals || before.schedule !== after.schedule;
  if (drifted) {
    fs.writeFileSync(FESTIVALS_PATH, before.festivals);
    fs.writeFileSync(SCHEDULE_PATH, before.schedule);
    throw new Error(
      "Committed seed no longer matches ../data.js + ../schedule.js. " +
        "Run `npm run seed` and commit the regenerated src/data files."
    );
  }

  console.log("Seed drift check passes: committed seed matches the web canon.");
}

try {
  checkSeedInvariants();
  checkSeedDrift();
  console.log("Festival Atlas mobile smoke test passed.");
} catch (error) {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
}
