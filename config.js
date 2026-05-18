// Each zone: label, IANA tz (or "local"), and lat/lon for offline
// sunrise/sunset computation. Add a row to add a city.
export const ZONES = [
  { label: "You",       tz: "local",                lat: 37.7749,  lon: -122.4194 },
  { label: "SF/LA",     tz: "America/Los_Angeles",  lat: 37.7749,  lon: -122.4194 },
  { label: "London",    tz: "Europe/London",        lat: 51.5074,  lon: -0.1278  },
  { label: "Berlin",    tz: "Europe/Berlin",        lat: 52.5200,  lon: 13.4050  },
  { label: "Singapore", tz: "Asia/Singapore",       lat: 1.3521,   lon: 103.8198 },
  { label: "Beijing",   tz: "Asia/Shanghai",        lat: 39.9042,  lon: 116.4074 },
  { label: "Sydney",    tz: "Australia/Sydney",     lat: -33.8688, lon: 151.2093 },
];
