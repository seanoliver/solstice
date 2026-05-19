// Local-city label resolution with a cascade of fallbacks:
//
//   1. Manual "home" label  (user-entered, no TTL, wins over everything,
//      honored verbatim even if it isn't the detected timezone)
//   2. Browser Geolocation  (Wi-Fi/GPS, reverse-geocoded; cached 24h)
//   3. IP geolocation       (approximate; cached 24h) — used when (2) is
//      denied/unavailable
//   4. Timezone city        (offline default; supplied by the caller)
//
// All network is optional and cached so it resolves rarely, not per tab.
// Attempts log under "[geo]".

const TTL_MS = 24 * 60 * 60 * 1000; // 1 day
const GEO_KEY = "geoCityV2";
const IP_KEY = "ipCityV1";
const HOME_KEY = "homeCity";
const REVERSE = "https://api.bigdatacloud.net/data/reverse-geocode-client";

// IP providers (HTTPS, keyless, CORS-friendly), tried in order.
const IP_PROVIDERS = [
  ["https://ipwho.is/", (d) => d && d.city],
  ["https://ipapi.co/json/", (d) => d && d.city],
  ["https://get.geojs.io/v1/ip/geo.json", (d) => d && d.city],
];

function readCached(storage, key, now) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const { city, ts } = JSON.parse(raw);
    if (!city || typeof ts !== "number") return null;
    if (now - ts > TTL_MS) return null;
    return city;
  } catch {
    return null;
  }
}

export function writeCachedGeo(storage, city, now = Date.now()) {
  storage.setItem(GEO_KEY, JSON.stringify({ city, ts: now }));
}

export function writeCachedIp(storage, city, now = Date.now()) {
  storage.setItem(IP_KEY, JSON.stringify({ city, ts: now }));
}

export function readHome(storage) {
  const v = storage.getItem(HOME_KEY);
  return v && v.trim() ? v.trim() : null;
}

export function writeHome(storage, value) {
  const v = (value || "").trim();
  if (v) storage.setItem(HOME_KEY, v);
  else if (storage.removeItem) storage.removeItem(HOME_KEY);
  else storage.setItem(HOME_KEY, "");
}

// Synchronous cascade for rendering. `fallback` is the timezone city.
export function resolveLocalLabel(storage, fallback = null, now = Date.now()) {
  return (
    readHome(storage) ||
    readCached(storage, GEO_KEY, now) ||
    readCached(storage, IP_KEY, now) ||
    fallback
  );
}

// True when a network refresh is worthwhile (no manual home, no fresh
// geo cache). Avoids re-prompting / re-fetching every new tab.
export function needsRefresh(storage, now = Date.now()) {
  if (readHome(storage)) return false;
  if (readCached(storage, GEO_KEY, now)) return false;
  return true;
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
      enableHighAccuracy: false,
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
    console.warn(`[geo] geolocation ${(e && e.name) || "error"}: ${e && e.message}`);
    return null;
  }
}

export async function fetchCityIP(fetchImpl = fetch) {
  for (const [url, pick] of IP_PROVIDERS) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3500);
      const res = await fetchImpl(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) {
        console.warn(`[geo] IP ${url} → HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const city = pick(data);
      if (city && typeof city === "string") {
        console.info(`[geo] IP ${url} → "${city.trim()}"`);
        return city.trim();
      }
      console.warn(`[geo] IP ${url} → no city`, data);
    } catch (e) {
      console.warn(`[geo] IP ${url} → ${(e && e.name) || "error"}`);
    }
  }
  return null;
}

// Drives the network cascade and writes the right cache. Returns the
// resolved city, or null if nothing detected (caller keeps tz fallback).
export async function refreshLocation(storage, deps = {}) {
  if (readHome(storage)) return null; // manual wins; no detection/network
  const geoCity = await resolveCity(deps);
  if (geoCity) {
    writeCachedGeo(storage, geoCity);
    return geoCity;
  }
  const ipCity = await fetchCityIP(deps.fetchImpl || fetch);
  if (ipCity) {
    writeCachedIp(storage, ipCity);
    return ipCity;
  }
  console.warn("[geo] all detection failed; using timezone city");
  return null;
}
