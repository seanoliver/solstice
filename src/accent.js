// Accent color presets. Colors live in newtab.css under [data-accent="…"],
// with dark and light values; this module only names and validates them.
export const ACCENTS = ["teal", "blue", "violet", "amber", "rose"];

export function normalizeAccent(value) {
  return ACCENTS.includes(value) ? value : "teal";
}
