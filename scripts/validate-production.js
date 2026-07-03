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
  const homeFestivalCount = await home.evaluate(() => window.FA.app.getParks().length);
  assert(homeFestivalCount === 95, `home should auto-load the 95-festival canonical baseline, got ${homeFestivalCount}`);
  await home.close();

  const audit = await openPage("audit.html");
  const auditProbe = await audit.evaluate(() => {
    const rows = window.FA.app.getSourceAuditRows();
    const diagnostics = window.FA.app.createDiagnostics();
    const crssd = rows.find((row) => row.id === "crssd-festival");
    const nextConfirmed = rows.filter((row) => row.dataStatus === "next-confirmed").length;
    const verificationQueue = window.FA.app.getSourceVerificationQueue();
    const preview = window.FA.app.previewFestivalPack(window.FA.outreachPack);
    const researchPreview = window.FA.app.previewFestivalPack(window.FA.deepResearchPack);
    const internationalPreview = window.FA.app.previewFestivalPack(window.FA.internationalResearchPack);
    const canonicalState = window.FA.app.getCanonicalPackImportState();
    return {
      rows: rows.length,
      festivals: diagnostics.counts.festivals,
      reviewNeeded: diagnostics.counts.sourceReviewNeeded,
      verificationNeeded: diagnostics.counts.sourceVerificationQueue,
      nextConfirmed,
      crssdLabel: crssd && crssd.dateRangeLabel,
      crssdNote: crssd && crssd.sourceNote,
      backupApp: window.FA.app.getBackupPayload().app,
      outreachPackCount: window.FA.outreachPack && window.FA.outreachPack.festivals.length,
      researchPackCount: window.FA.deepResearchPack && window.FA.deepResearchPack.festivals.length,
      internationalPackCount: window.FA.internationalResearchPack && window.FA.internationalResearchPack.festivals.length,
      hasResearchButton: Boolean(document.getElementById("importResearchPack")),
      hasInternationalButton: Boolean(document.getElementById("importInternationalPack")),
      previewCreated: preview.created,
      previewMerged: preview.merged,
      previewRows: preview.rows.length,
      previewVerify: preview.verificationNeeded,
      researchPreviewCreated: researchPreview.created,
      researchPreviewMerged: researchPreview.merged,
      researchPreviewRows: researchPreview.rows.length,
      researchPreviewVerify: researchPreview.verificationNeeded,
      researchPreviewScheduleWrites: researchPreview.scheduleWrites,
      internationalPreviewCreated: internationalPreview.created,
      internationalPreviewMerged: internationalPreview.merged,
      internationalPreviewUnchanged: internationalPreview.unchanged,
      internationalPreviewRows: internationalPreview.rows.length,
      internationalPreviewVerify: internationalPreview.verificationNeeded,
      internationalPreviewScheduleWrites: internationalPreview.scheduleWrites,
      canonicalPackCount: Object.keys(canonicalState.applied || {}).length,
      verificationRows: verificationQueue.length
    };
  });
  assert(auditProbe.rows === 95, `audit should include the canonical 95-festival baseline, got ${auditProbe.rows}`);
  assert(auditProbe.festivals === 95, `diagnostics should count 95 canonical festivals, got ${auditProbe.festivals}`);
  assert(auditProbe.canonicalPackCount === 2, `canonical pack migration should record 2 packs, got ${auditProbe.canonicalPackCount}`);
  assert(auditProbe.reviewNeeded === 0, `source review queue should be empty, got ${auditProbe.reviewNeeded}`);
  assert(auditProbe.verificationNeeded >= auditProbe.nextConfirmed, "verification queue should include next-confirmed rows");
  assert(auditProbe.nextConfirmed >= 1, "audit should include next-confirmed rows");
  assert(auditProbe.crssdLabel === "Sep 26 - 27, 2026", `CRSSD label mismatch: ${auditProbe.crssdLabel}`);
  assert(String(auditProbe.crssdNote || "").includes("Fall 2026"), "CRSSD source note should render");
  assert(auditProbe.backupApp === "Festival Atlas", "backup payload should be labeled");
  assert(auditProbe.outreachPackCount === 20, `outreach pack should expose 20 festivals, got ${auditProbe.outreachPackCount}`);
  assert(auditProbe.researchPackCount === 36, `Deep Research pack should expose 36 festivals, got ${auditProbe.researchPackCount}`);
  assert(auditProbe.internationalPackCount === 29, `International research pack should expose 29 festivals, got ${auditProbe.internationalPackCount}`);
  assert(auditProbe.hasResearchButton, "audit should include Deep Research pack preview control");
  assert(auditProbe.hasInternationalButton, "audit should include international research pack preview control");
  assert(auditProbe.previewCreated >= 3, "outreach preview should include remaining created festivals after canonical baseline");
  assert(auditProbe.previewMerged >= 17, "outreach preview should merge canonical baseline festivals");
  assert(auditProbe.previewRows === 20, "outreach preview should include all pack rows");
  assert(auditProbe.previewVerify >= 1, "outreach preview should flag verification work");
  assert(auditProbe.researchPreviewCreated === 0, "Deep Research preview should be no-op after auto baseline");
  assert(auditProbe.researchPreviewMerged === 0, "Deep Research preview should not merge after auto baseline");
  assert(auditProbe.researchPreviewRows === 36, "Deep Research preview should include all pack rows");
  assert(auditProbe.researchPreviewVerify === 0, "canonical Deep Research preview should not add source verification work");
  assert(auditProbe.researchPreviewScheduleWrites === 0, "Deep Research preview should not rewrite schedules after auto baseline");
  assert(auditProbe.internationalPreviewCreated === 0, `international preview should create 0 festivals after auto baseline, got ${auditProbe.internationalPreviewCreated}`);
  assert(auditProbe.internationalPreviewMerged === 0, "international preview should not merge after auto baseline");
  assert(auditProbe.internationalPreviewUnchanged === 29, "international preview should find all canonical international rows unchanged");
  assert(auditProbe.internationalPreviewRows === 29, "international preview should include all pack rows");
  assert(auditProbe.internationalPreviewVerify === 0, "canonical international preview should not add source verification work");
  assert(auditProbe.internationalPreviewScheduleWrites === 0, "international preview should not rewrite schedules after auto baseline");
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
  assert(outreachProbe.created >= 3, `outreach pack should create remaining non-canonical festivals, got ${outreachProbe.created}`);
  assert(outreachProbe.merged >= 17, `outreach pack should merge existing canonical festivals, got ${outreachProbe.merged}`);
  assert(String(outreachProbe.cmaOps || "").includes("Citywide"), "CMA ops intelligence should be preserved");
  assert(String(outreachProbe.govOps || "").includes("partners@govball.com"), "Gov Ball public contact should be preserved");
  assert(outreachProbe.cmaScore >= 60, `CMA ops score should be actionable, got ${outreachProbe.cmaScore}`);
  assert(["Prime", "Strong"].includes(outreachProbe.cmaScoreTier), "CMA ops tier should be Prime or Strong");
  assert(outreachProbe.northCoastRange === "Sep 4 - 6, 2026", `North Coast date range mismatch: ${outreachProbe.northCoastRange}`);
  assert(outreachProbe.opsCount >= 65, "diagnostics should count canonical ops intelligence plus outreach rows");
  assert(outreachProbe.verificationCount >= 1, "diagnostics should count source verification queue");
  assert(outreachProbe.hasOceansCalling, "outreach pack should add September calendar events");
  const researchProbe = await audit.evaluate(() => {
    const pack = window.FA.deepResearchPack;
    const result = window.FA.app.importFestivalPack(pack);
    const mountain = window.FA.app.getParkById("mountain-music-festival");
    const arc = window.FA.app.getParkById("arc-music-festival");
    const gov = window.FA.app.getParkById("governors-ball");
    const elements = window.FA.app.getParkById("elements-music-arts-festival");
    const diagnosticsBeforeReset = window.FA.app.createDiagnostics();
    const juneEvents = window.FA.app.getFestivalCalendarEvents({
      startDate: "2026-06-01",
      endDate: "2026-06-30"
    });
    const septemberEvents = window.FA.app.getFestivalCalendarEvents({
      startDate: "2026-09-01",
      endDate: "2026-09-30"
    });
    const mountainRange = window.FA.app.getFestivalDateRange("mountain-music-festival").label;
    const arcRange = window.FA.app.getFestivalDateRange("arc-music-festival").label;
    const duplicateElementsId = Boolean(window.FA.app.getParkById("elements-music-and-arts-festival"));
    const duplicateSeaId = Boolean(window.FA.app.getParkById("sea-hear-now-festival"));
    const countBeforeReset = diagnosticsBeforeReset.counts.festivals;
    window.FA.app.resetLocalData();
    return {
      created: result.created,
      merged: result.merged,
      sessions: result.sessions,
      mountainImported: Boolean(mountain),
      arcImported: Boolean(arc),
      mountainRange,
      arcRange,
      govResearchSource: Boolean(gov && gov.ops && (gov.ops.sources || []).some((source) => String(source.url || "").includes("notion.so"))),
      elementsMerged: Boolean(elements && elements.ops && elements.ops.packId === pack.id),
      duplicateElementsId,
      duplicateSeaId,
      opsCount: diagnosticsBeforeReset.counts.opsIntelligence,
      verificationCount: diagnosticsBeforeReset.counts.sourceVerificationQueue,
      hasMountainJune: juneEvents.some((event) => event.festivalId === "mountain-music-festival"),
      hasArcSeptember: septemberEvents.some((event) => event.festivalId === "arc-music-festival"),
      countBeforeReset,
      countAfterReset: window.FA.app.createDiagnostics().counts.festivals
    };
  });
  assert(researchProbe.created === 0, `Deep Research pack should already be baseline, got ${researchProbe.created} created`);
  assert(researchProbe.merged === 36, `Deep Research pack should re-merge existing baseline rows, got ${researchProbe.merged}`);
  assert(researchProbe.sessions >= 70, `Deep Research pack should create custom schedule sessions, got ${researchProbe.sessions}`);
  assert(researchProbe.mountainImported, "Deep Research pack should import Mountain Music Festival");
  assert(researchProbe.arcImported, "Deep Research pack should import ARC Music Festival");
  assert(researchProbe.mountainRange === "Jun 4 - 6, 2026", `Mountain Music Festival date range mismatch: ${researchProbe.mountainRange}`);
  assert(researchProbe.arcRange === "Sep 4 - 7, 2026", `ARC Music Festival date range mismatch: ${researchProbe.arcRange}`);
  assert(researchProbe.govResearchSource, "Deep Research pack should merge Gov Ball source intelligence");
  assert(researchProbe.elementsMerged, "Deep Research pack should merge Elements by seeded app ID");
  assert(!researchProbe.duplicateElementsId, "Deep Research pack should not create duplicate Elements IDs");
  assert(!researchProbe.duplicateSeaId, "Deep Research pack should not create duplicate Sea.Hear.Now IDs");
  assert(researchProbe.opsCount >= 30, "diagnostics should count Deep Research ops intelligence");
  assert(researchProbe.verificationCount === auditProbe.verificationNeeded, "canonical Deep Research import should not add source verification rows");
  assert(researchProbe.hasMountainJune, "Deep Research pack should add June calendar events");
  assert(researchProbe.hasArcSeptember, "Deep Research pack should add September calendar events");
  assert(researchProbe.countBeforeReset === 95, `canonical baseline before reset should be 95, got ${researchProbe.countBeforeReset}`);
  assert(researchProbe.countAfterReset === 95, `reset should restore the 95-festival canonical baseline, got ${researchProbe.countAfterReset}`);
  const internationalProbe = await audit.evaluate(() => {
    const pack = window.FA.internationalResearchPack;
    const result = window.FA.app.importFestivalPack(pack);
    const download = window.FA.app.getParkById("download-2026");
    const mawazine = window.FA.app.getParkById("mawazine-2026");
    const diagnosticsBeforeReset = window.FA.app.createDiagnostics();
    const juneEvents = window.FA.app.getFestivalCalendarEvents({
      startDate: "2026-06-01",
      endDate: "2026-06-30"
    });
    const septemberEvents = window.FA.app.getFestivalCalendarEvents({
      startDate: "2026-09-01",
      endDate: "2026-09-30"
    });
    const downloadRange = window.FA.app.getFestivalDateRange("download-2026").label;
    const tomorrowlandRange = window.FA.app.getFestivalDateRange("tomorrowland-belgium-w2-2026").label;
    const countBeforeReset = diagnosticsBeforeReset.counts.festivals;
    window.FA.app.resetLocalData();
    return {
      created: result.created,
      merged: result.merged,
      sessions: result.sessions,
      downloadImported: Boolean(download),
      downloadRange,
      tomorrowlandRange,
      downloadCity: download && download.city,
      downloadLatitude: download && download.coordinates && download.coordinates.lat,
      mawazineCanonical: Boolean(mawazine && mawazine.ops && mawazine.ops.status === "Canonical ChatGPT Deep Research record" && mawazine.dateConfidence === "canonical"),
      opsCount: diagnosticsBeforeReset.counts.opsIntelligence,
      verificationCount: diagnosticsBeforeReset.counts.sourceVerificationQueue,
      hasDownloadJune: juneEvents.some((event) => event.festivalId === "download-2026"),
      hasRockInRioSeptember: septemberEvents.some((event) => event.festivalId === "rock-in-rio-rio-w1-2026"),
      countBeforeReset,
      countAfterReset: window.FA.app.createDiagnostics().counts.festivals
    };
  });
  assert(internationalProbe.created === 0, `international pack should already be baseline, got ${internationalProbe.created} created`);
  assert(internationalProbe.merged === 29, `international pack should re-merge existing baseline rows, got ${internationalProbe.merged}`);
  assert(internationalProbe.sessions === 105, `international pack should create 105 custom schedule sessions, got ${internationalProbe.sessions}`);
  assert(internationalProbe.downloadImported, "international pack should import Download Festival");
  assert(internationalProbe.downloadRange === "Jun 10 - 14, 2026", `Download Festival date range mismatch: ${internationalProbe.downloadRange}`);
  assert(internationalProbe.tomorrowlandRange === "Jul 24 - 26, 2026", `Tomorrowland Weekend 2 date range mismatch: ${internationalProbe.tomorrowlandRange}`);
  assert(internationalProbe.downloadCity === "Donington, United Kingdom", "international pack should preserve country in city labels");
  assert(internationalProbe.downloadLatitude && internationalProbe.downloadLatitude !== 39.5, "international pack should provide non-default coordinates");
  assert(internationalProbe.mawazineCanonical, "international pack should import Mawazine as canonical");
  assert(internationalProbe.opsCount >= 29, "diagnostics should count international ops intelligence");
  assert(internationalProbe.verificationCount === auditProbe.verificationNeeded, "canonical international import should not add source verification rows");
  assert(internationalProbe.hasDownloadJune, "international pack should add June calendar events");
  assert(internationalProbe.hasRockInRioSeptember, "international pack should add September calendar events");
  assert(internationalProbe.countBeforeReset === 95, `canonical baseline before reset should be 95, got ${internationalProbe.countBeforeReset}`);
  assert(internationalProbe.countAfterReset === 95, `reset should restore the 95-festival canonical baseline, got ${internationalProbe.countAfterReset}`);
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
  ["data.js", "schedule.js", "app.js", "config.js", "sw.js", "outreach-pack.js", "deep-research-pack.js", "international-research-pack.js"].forEach((file) => {
    run("node", ["--check", file]);
  });

  await validateBrowser();
  console.log("Festival Atlas production validation passed.");
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
