/* config.js — Festival Atlas
   Registers product config against quest-platform shared config core. */
(function attachFestivalConfigModule(global) {
  "use strict";

  var QP = global.__QUEST_PLATFORM__;
  if (!QP || !QP.config) {
    throw new Error("Load quest-platform/shared/js/core/config.js before festival config.js");
  }

  var config = QP.config.createProductConfig({
    productId: "festival",
    productCode: "FA",
    appName: "Festival Atlas",
    namespace: "FA",
    storage: {
      version: 1,
      keys: {
        visits: "visits",
        routeLegs: "routeLegs",
        activeTrip: "activeTrip",
        planningNotes: "planningNotes",
        entityScratchpads: "entityScratchpads",
        theme: "theme",
        context: "context",
        shortlistFestivalIds: "shortlistFestivalIds",
        festivalJournalEntries: "festivalJournalEntries",
        sharedTripImports: "sharedTripImports",
        setkeeperDraft: "setkeeperDraft"
      }
    },
    entities: {
      labelSingular: "festival",
      labelPlural: "festivals",
      categoryField: "genre",
      venueField: "setting"
    },
    schedule: {
      eventLabel: "sessions",
      daysAheadDefault: 45
    },
    route: {
      stopLabel: "festivals",
      routeLabel: "trip"
    },
    theme: {
      defaultTheme: "atlas-night"
    },
    features: {
      scorekeeper: false,
      shortlist: true,
      logisticsLinks: true,
      scheduleImport: false,
      tripShare: true
    },
    ui: {
      homePage: "home",
      explorerPage: "festivals",
      routePage: "route",
      journalPage: "setkeeper"
    }
  });

  global.FA = global.FA || {};
  global.FA.config = QP.config.registerProduct("festival", config);
})(window);
