// Optional precise local-city detection via the browser Geolocation API
// (Wi-Fi/GPS-based), reverse-geocoded to a city name. Cached in
// localStorage with a TTL so it resolves rarely, not per tab. Any failure
// (denied, timeout, offline) returns null → caller falls back to the
// timezone city. Attempts log under "[geo]".
//
// Cache key is versioned (V2) so stale IP-era values are ignored.

const KEY = "geoCityV2";
const TTL_MS = 24 * 60 * 60 * 1000; // 1 day
const REVERSE = "https://api.bigdatacloud.net/data/reverse-geocode-client";

export function readCachedCity(storage, now = Date.now()) {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const { city, ts } = JSON.parse(raw);
    if (!city || typeof ts !== "number") return null;
    if (now - ts > TTL_MS) return null; // stale → caller should refresh
    return city;
  } catch {
    return null;
  }
}

export function writeCachedCity(storage, city, now = Date.now()) {
  storage.setItem(KEY, JSON.stringify({ city, ts: now }));
}

function getPosition(geo, opts) {
  return new Promise((resolve, reject) => {
    if (!geo || !geo.getCurrentPosition) {
      reject(new Error("geolocation unavailable"));
      return;
    }
    geo.getCurrentPosition(resolve, reject, opts);
  });
}

export async function resolveCity({
  geo = typeof navigator !== "undefined" ? navigator.geolocation : null,
  fetchImpl = fetch,
} = {}) {
  try {
    const pos = await getPosition(geo, {
      enableHighAccuracy: false, // city-level is enough; faster
      timeout: 8000,
      maximumAge: 6 * 60 * 60 * 1000,
    });
    const { latitude, longitude } = pos.coords;
    const url =
      `${REVERSE}?latitude=${latitude}&longitude=${longitude}` +
      `&localityLanguage=en`;
    const res = await fetchImpl(url);
    if (!res.ok) {
      console.warn(`[geo] reverse-geocode HTTP ${res.status}`);
      return null;
    }
    const d = await res.json();
    const city =
      (d && (d.city || d.locality || d.principalSubdivision)) || "";
    if (city) {
      console.info(`[geo] geolocation → "${String(city).trim()}"`);
      return String(city).trim();
    }
    console.warn("[geo] reverse-geocode: no city in response", d);
    return null;
  } catch (e) {
    console.warn(`[geo] ${(e && e.name) || "error"}: ${e && e.message}`);
    return null;
  }
}
