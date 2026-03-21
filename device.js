/* device.js — Festival Atlas
   Shim that delegates to quest-platform shared device detection.
   Preserves FA.device and FA.viewport API exactly. */
(function attachDeviceModule(global) {
  "use strict";

  var QP = global.__QUEST_PLATFORM__;
  if (!QP || !QP.device) {
    throw new Error("Load quest-platform/shared/js/core/device.js before festival device.js");
  }

  function initWhenReady() {
    QP.device.init(global.document);
  }

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", initWhenReady, { once: true });
  } else {
    initWhenReady();
  }

  global.FA = global.FA || {};
  global.FA.device = QP.device.detectDevice;
  global.FA.viewport = QP.device.detectViewport;
  global.FA.deviceApi = QP.device;
})(window);
