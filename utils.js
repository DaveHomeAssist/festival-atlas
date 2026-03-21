/* utils.js — Festival Atlas
   Shim that delegates to quest-platform shared utils.
   Preserves FA.utils API and keeps the map helpers available. */
(function attachUtilsModule(global) {
  "use strict";

  var QP = global.__QUEST_PLATFORM__;
  if (!QP || !QP.utils) {
    throw new Error("Load quest-platform/shared/js/core/utils.js before festival utils.js");
  }

  global.FA = global.FA || {};
  global.FA.utils = {
    distanceMiles: QP.utils.distanceMiles,
    formatDate: QP.utils.formatDate,
    minutesToReadable: QP.utils.minutesToReadable,
    projectPoint: QP.utils.projectPoint,
    buildUsBasemap: QP.utils.buildUsBasemap,
    escapeHtml: QP.utils.escapeHtml,
    safeToken: QP.utils.safeToken,
    safeColor: QP.utils.safeColor,
    projectLine: QP.utils.projectLine,
    normalizeDate: QP.utils.normalizeDate,
    parseDateRange: QP.utils.parseDateRange
  };
})(window);
