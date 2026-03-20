(function () {
  const STORAGE_KEY = "app-theme";
  const FALLBACK_THEME = "sunset";

  const THEME_REGISTRY = [
    { key: "sunset", label: "Sunset", swatch: "#E8501A" },
    { key: "midnight", label: "Midnight", swatch: "#132448" },
    { key: "ocean", label: "Ocean", swatch: "#005A9C" },
    { key: "neon", label: "Neon", swatch: "#6B1FCC" },
    { key: "twilight", label: "Twilight", swatch: "#002D72" }
  ];

  const themeKeys = new Set(THEME_REGISTRY.map((theme) => theme.key));

  function getStoredTheme() {
    try {
      const storedTheme = localStorage.getItem(STORAGE_KEY);
      return themeKeys.has(storedTheme) ? storedTheme : FALLBACK_THEME;
    } catch (error) {
      return FALLBACK_THEME;
    }
  }

  function updateThemeColor(themeKey) {
    const meta = document.querySelector('meta[name="theme-color"]');
    const theme = THEME_REGISTRY.find((entry) => entry.key === themeKey);
    if (meta && theme) {
      meta.setAttribute("content", theme.swatch);
    }
  }

  function applyTheme(themeKey) {
    const nextTheme = themeKeys.has(themeKey) ? themeKey : FALLBACK_THEME;
    document.documentElement.setAttribute("data-theme", nextTheme);
    updateThemeColor(nextTheme);
    return nextTheme;
  }

  function setTheme(themeKey) {
    const nextTheme = applyTheme(themeKey);
    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch (error) {
      // Local storage is optional for static use
    }
    document.dispatchEvent(new CustomEvent("themechange", {
      detail: { theme: nextTheme }
    }));
    return nextTheme;
  }

  const initialTheme = applyTheme(getStoredTheme());

  window.THEME_REGISTRY = THEME_REGISTRY;
  window.getTheme = function getTheme() {
    return document.documentElement.getAttribute("data-theme") || initialTheme;
  };
  window.setTheme = setTheme;
})();
