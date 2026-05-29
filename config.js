// Default zones shown on first install. The local zone's IANA timezone is
// "local" (resolves to the user's system tz at runtime). Coords are used
// for offline sunrise/sunset; the geo cascade in src/geo.js may override
// the *label* with the detected city, but not these coords (see ROADMAP).
//
// Users add/remove zones at runtime via Edit mode; this list only seeds
// the first install.
export const ZONES = [
  { label: "You",      tz: "local",            lat: 40.7128, lon: -74.0060 },
  { label: "New York", tz: "America/New_York", lat: 40.7128, lon: -74.0060 },
  { label: "London",   tz: "Europe/London",    lat: 51.5074, lon: -0.1278  },
  { label: "Tokyo",    tz: "Asia/Tokyo",       lat: 35.6762, lon: 139.6503 },
];
