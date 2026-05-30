const path = require("path");
const { spawnSync } = require("child_process");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
    shell: process.platform === "win32",
    ...options
  });

  if (result.status !== 0) {
    process.stderr.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    throw new Error(`${command} ${args.join(" ")} failed`);
  }

  return result.stdout;
}

function loadPlaywright() {
  const candidates = [
    "playwright",
    "../node_modules/playwright",
    "../soil-searcher/node_modules/playwright"
  ];

  for (const candidate of candidates) {
    try {
      return candidate === "playwright"
        ? require(candidate)
        : require(path.resolve(process.cwd(), candidate));
    } catch (error) {
      // Try the next local install location.
    }
  }

  throw new Error("Playwright is not installed in this repo or known sibling locations");
}

async function validateBrowser() {
  const { chromium } = loadPlaywright();
  const base = "file:///" + process.cwd().replace(/\\/g, "/") + "/";
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const errors = [];

  async function openPage(file) {
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(`${file}: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`${file}: console error: ${message.text()}`);
    });
    await page.goto(base + file, { waitUntil: "load" });
    await page.waitForTimeout(120);
    return page;
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  const home = await openPage("index.html");
  await home.evaluate(() => localStorage.clear());
  await home.reload({ waitUntil: "load" });
  await home.waitForTimeout(120);
  assert((await home.textContent("body")).includes("Festival Atlas"), "home should render");
  await home.close();

  const audit = await openPage("audit.html");
  const auditProbe = await audit.evaluate(() => {
    const rows = window.FA.app.getSourceAuditRows();
    const diagnostics = window.FA.app.createDiagnostics();
    const crssd = rows.find((row) => row.id === "crssd-festival");
    const nextConfirmed = rows.filter((row) => row.dataStatus === "next-confirmed").length;
    const verificationQueue = window.FA.app.getSourceVerificationQueue();
    const preview = window.FA.app.previewFestivalPack(window.FA.outreachPack);
    return {
      rows: rows.length,
      reviewNeeded: diagnostics.counts.sourceReviewNeeded,
      verificationNeeded: diagnostics.counts.sourceVerificationQueue,
      nextConfirmed,
      crssdLabel: crssd && crssd.dateRangeLabel,
      crssdNote: crssd && crssd.sourceNote,
      backupApp: window.FA.app.getBackupPayload().app,
      outreachPackCount: window.FA.outreachPack && window.FA.outreachPack.festivals.length,
      previewCreated: preview.created,
      previewMerged: preview.merged,
      previewRows: preview.rows.length,
      previewVerify: preview.verificationNeeded,
      verificationRows: verificationQueue.length
    };
  });
  assert(auditProbe.rows > 40, "audit should include seeded catalog");
  assert(auditProbe.reviewNeeded === 0, `source review queue should be empty, got ${auditProbe.reviewNeeded}`);
  assert(auditProbe.verificationNeeded >= auditProbe.nextConfirmed, "verification queue should include next-confirmed rows");
  assert(auditProbe.nextConfirmed >= 1, "audit should include next-confirmed rows");
  assert(auditProbe.crssdLabel === "Sep 26 - 27, 2026", `CRSSD label mismatch: ${auditProbe.crssdLabel}`);
  assert(String(auditProbe.crssdNote || "").includes("Fall 2026"), "CRSSD source note should render");
  assert(auditProbe.backupApp === "Festival Atlas", "backup payload should be labeled");
  assert(auditProbe.outreachPackCount === 20, `outreach pack should expose 20 festivals, got ${auditProbe.outreachPackCount}`);
  assert(auditProbe.previewCreated >= 6, "outreach preview should include created festivals");
  assert(auditProbe.previewMerged >= 10, "outreach preview should include merged festivals");
  assert(auditProbe.previewRows === 20, "outreach preview should include all pack rows");
  assert(auditProbe.previewVerify >= 1, "outreach preview should flag verification work");
  const outreachProbe = await audit.evaluate(() => {
    const result = window.FA.app.importFestivalPack(window.FA.outreachPack);
    const cma = window.FA.app.getParkById("cma-fest");
    const gov = window.FA.app.getParkById("governors-ball");
    const cmaScore = window.FA.app.getOpsOpportunityScore(cma);
    const northCoastRange = window.FA.app.getFestivalDateRange("north-coast-music-festival").label;
    const diagnosticsBeforeReset = window.FA.app.createDiagnostics();
    const septemberEvents = window.FA.app.getFestivalCalendarEvents({
      startDate: "2026-09-01",
      endDate: "2026-09-30"
    });
    window.FA.app.resetLocalData();
    return {
      created: result.created,
      merged: result.merged,
      cmaOps: cma && cma.ops && cma.ops.opsModel,
      govOps: gov && gov.ops && gov.ops.publicContact,
      cmaScore: cmaScore.score,
      cmaScoreTier: cmaScore.tier,
      northCoastRange,
      opsCount: diagnosticsBeforeReset.counts.opsIntelligence,
      verificationCount: diagnosticsBeforeReset.counts.sourceVerificationQueue,
      hasOceansCalling: septemberEvents.some((event) => event.festivalId === "oceans-calling")
    };
  });
  assert(outreachProbe.created >= 6, `outreach pack should create new festivals, got ${outreachProbe.created}`);
  assert(outreachProbe.merged >= 10, `outreach pack should merge existing festivals, got ${outreachProbe.merged}`);
  assert(String(outreachProbe.cmaOps || "").includes("Citywide"), "CMA ops intelligence should be preserved");
  assert(String(outreachProbe.govOps || "").includes("partners@govball.com"), "Gov Ball public contact should be preserved");
  assert(outreachProbe.cmaScore >= 60, `CMA ops score should be actionable, got ${outreachProbe.cmaScore}`);
  assert(["Prime", "Strong"].includes(outreachProbe.cmaScoreTier), "CMA ops tier should be Prime or Strong");
  assert(outreachProbe.northCoastRange === "Sep 4 - 6, 2026", `North Coast date range mismatch: ${outreachProbe.northCoastRange}`);
  assert(outreachProbe.opsCount >= 20, "diagnostics should count imported ops intelligence");
  assert(outreachProbe.verificationCount >= 1, "diagnostics should count source verification queue");
  assert(outreachProbe.hasOceansCalling, "outreach pack should add September calendar events");
  const importProbe = await audit.evaluate(() => {
    window.FA.app.importFestivalPack({
      festivals: [{
        id: "validation-fest",
        name: "Validation Fest",
        city: "Test City, TS",
        team: "Indie",
        officialUrl: "https://example.com/validation-fest",
        sessions: [
          { date: "2026-10-03", label: "Festival Day 1" },
          { date: "2026-10-04", label: "Festival Day 2" }
        ]
      }]
    });
    const park = window.FA.app.getParkById("validation-fest");
    const range = window.FA.app.getFestivalDateRange("validation-fest");
    const games = window.FA.app.getGamesByPark("validation-fest");
    const diagnosticsBeforeReset = window.FA.app.createDiagnostics();
    window.FA.app.resetLocalData();
    return {
      imported: Boolean(park),
      range: range.label,
      games: games.length,
      countBeforeReset: diagnosticsBeforeReset.counts.festivals,
      countAfterReset: window.FA.app.createDiagnostics().counts.festivals
    };
  });
  assert(importProbe.imported, "festival pack should import a custom festival");
  assert(importProbe.range === "Oct 3 - 4, 2026", `custom festival date range mismatch: ${importProbe.range}`);
  assert(importProbe.games === 2, `custom festival should expose two sessions, got ${importProbe.games}`);
  assert(importProbe.countBeforeReset > importProbe.countAfterReset, "reset should remove imported festival pack data");
  await audit.close();

  const calendar = await openPage("calendar.html");
  const calendarProbe = await calendar.evaluate(() => {
    const monthJump = document.getElementById("monthJump");
    const search = document.getElementById("calendarSearch");
    monthJump.value = "2026-06";
    monthJump.dispatchEvent(new Event("change", { bubbles: true }));
    search.value = "Bonnaroo";
    search.dispatchEvent(new Event("input", { bubbles: true }));
    const juneEvents = window.FA.app.getFestivalCalendarEvents({
      startDate: "2026-06-01",
      endDate: "2026-06-30"
    });
    const nextEvents = window.FA.app.getFestivalCalendarEvents({
      startDate: "2027-01-01",
      endDate: "2027-12-31",
      filter: "next-confirmed"
    });
    return {
      renderedEvents: document.querySelectorAll(".event-chip").length,
      statsTiles: document.querySelectorAll(".calendar-stat").length,
      monthValue: monthJump.value,
      searchValue: search.value,
      visibleText: document.getElementById("calendarGrid").textContent,
      juneEvents: juneEvents.length,
      hasBonnaroo: juneEvents.some((event) => event.festivalId === "bonnaroo"),
      nextEvents: nextEvents.length,
      hasCalendarNav: Boolean(document.querySelector('a[href="calendar.html"].is-active'))
    };
  });
  assert(calendarProbe.renderedEvents > 0, "calendar should render visible events");
  assert(calendarProbe.statsTiles === 5, "calendar should render stats tiles");
  assert(calendarProbe.monthValue === "2026-06", "calendar should support month jump");
  assert(calendarProbe.searchValue === "Bonnaroo", "calendar should support search");
  assert(calendarProbe.visibleText.includes("Bonnaroo"), "calendar search should show Bonnaroo");
  assert(calendarProbe.juneEvents > 0, "calendar helper should return June events");
  assert(calendarProbe.hasBonnaroo, "calendar helper should include Bonnaroo in June 2026");
  assert(calendarProbe.nextEvents >= 1, "calendar helper should include next-confirmed 2027 events");
  assert(calendarProbe.hasCalendarNav, "calendar nav should be active");
  await calendar.close();

  const festivals = await openPage("festivals.html");
  await festivals.click("[data-filter=\"review\"]");
  await festivals.waitForTimeout(100);
  assert((await festivals.textContent("#festivalList")).includes("No matches"), "review filter should be empty");
  await festivals.close();

  const route = await openPage("route.html");
  await route.evaluate(() => window.FA.app.saveRouteStore({ stops: ["crssd-festival", "boston-calling"] }));
  await route.reload({ waitUntil: "load" });
  await route.waitForTimeout(120);
  const routeText = await route.textContent("#routeGrid");
  assert(routeText.includes("Fall 2026"), "route should surface source notes");
  assert(routeText.includes("2027"), "route should surface next-confirmed dates");
  await route.evaluate(() => window.FA.app.setSetkeeperContext({ parkId: "boston-calling" }));
  await route.close();

  const setkeeper = await openPage("setkeeper.html");
  const setkeeperJson = await setkeeper.evaluate(() => JSON.parse(window.render_game_to_text()));
  assert(String(setkeeperJson.sourceNote || "").includes("2027"), "setkeeper export should include source note");
  await setkeeper.close();

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  for (const file of ["index.html", "calendar.html", "audit.html", "setkeeper.html"]) {
    const page = await mobileContext.newPage();
    page.on("pageerror", (error) => errors.push(`${file} mobile: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(`${file} mobile: console error: ${message.text()}`);
    });
    await page.goto(base + file, { waitUntil: "load" });
    await page.waitForTimeout(120);
    assert((await page.textContent("body")).trim().length > 200, `${file} mobile should render content`);
    const navProbe = await page.evaluate(() => {
      const nav = document.querySelector(".site-nav");
      const styles = nav ? getComputedStyle(nav) : null;
      return {
        hasNav: Boolean(nav),
        position: styles && styles.position,
        bottom: styles && styles.bottom,
        columns: document.querySelectorAll(".nav-link").length
      };
    });
    assert(navProbe.hasNav, `${file} mobile should keep nav visible`);
    assert(navProbe.position === "fixed", `${file} mobile nav should be fixed bottom tabs`);
    assert(navProbe.columns >= 6, `${file} mobile nav should include primary app tabs`);
    await page.close();
  }
  await mobileContext.close();

  await browser.close();

  if (errors.length) {
    throw new Error(`Browser errors:\n${errors.join("\n")}`);
  }
}

(async () => {
  ["data.js", "schedule.js", "app.js", "config.js", "sw.js"].forEach((file) => {
    run("node", ["--check", file]);
  });

  await validateBrowser();
  console.log("Festival Atlas production validation passed.");
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
