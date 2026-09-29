// Theme preference: "system" follows prefers-color-scheme; "light" and "dark"
// override it. newtab.js writes the resolved theme to <html data-theme>.
export const THEMES = ["system", "light", "dark"];

export function normalizeTheme(value) {
  return THEMES.includes(value) ? value : "system";
}

export function resolveTheme(pref, systemPrefersLight) {
  if (pref === "light" || pref === "dark") return pref;
  return systemPrefersLight ? "light" : "dark";
}
