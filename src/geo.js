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

// IP providers (HTTPS, keyless, CORS-friendly), tried in order. All three
// report coords as `latitude`/`longitude` (geojs as strings).
const IP_PROVIDERS = [
  "https://ipwho.is/",
  "https://ipapi.co/json/",
  "https://get.geojs.io/v1/ip/geo.json",
];

// {lat, lon} when both parse to finite numbers, else null.
function coordsPair(lat, lon) {
  const la = Number(lat), lo = Number(lon);
  return Number.isFinite(la) && Number.isFinite(lo) ? { lat: la, lon: lo } : null;
}

// Fresh cache entry {city, lat?, lon?} or null.
function readCached(storage, key, now) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const { city, lat, lon, ts } = JSON.parse(raw);
    if (!city || typeof ts !== "number") return null;
    if (now - ts > TTL_MS) return null;
    return { city, ...(coordsPair(lat, lon) ?? {}) };
  } catch {
    return null;
  }
}

// `entry` is {city, lat?, lon?}; coords are dropped unless both are finite.
export function writeCachedGeo(storage, entry, now = Date.now()) {
  storage.setItem(GEO_KEY, JSON.stringify({
    city: entry.city, ...(coordsPair(entry.lat, entry.lon) ?? {}), ts: now,
  }));
}

export function writeCachedIp(storage, entry, now = Date.now()) {
  storage.setItem(IP_KEY, JSON.stringify({
    city: entry.city, ...(coordsPair(entry.lat, entry.lon) ?? {}), ts: now,
  }));
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
    readCached(storage, GEO_KEY, now)?.city ||
    readCached(storage, IP_KEY, now)?.city ||
    fallback
  );
}

// Detected coords for the local zone's sun times: geo > IP > null (caller
// keeps seed coords). Manual home is label-only — the local card shows the
// user's physical location's daylight, whatever they named it.
export function resolveLocalCoords(storage, now = Date.now()) {
  for (const key of [GEO_KEY, IP_KEY]) {
    const c = readCached(storage, key, now);
    if (c && c.lat !== undefined) return { lat: c.lat, lon: c.lon };
  }
  return null;
}

// True when a network refresh is worthwhile (no manual home, no fresh geo
// cache with coords). Avoids re-prompting / re-fetching every new tab. A
// fresh label-only cache (pre-coords format) still refreshes once so the
// cache upgrades to include coords.
export function needsRefresh(storage, now = Date.now()) {
  if (readHome(storage)) return false;
  const geo = readCached(storage, GEO_KEY, now);
  if (geo && geo.lat !== undefined) return false;
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
      // Device coords, not the reverse-geocode's city centroid: they drive
      // the local zone's sunrise/sunset, so keep the precise pair.
      return {
        city: String(city).trim(),
        ...(coordsPair(latitude, longitude) ?? {}),
      };
    }
    console.warn("[geo] reverse-geocode: no city in response", d);
    return null;
  } catch (e) {
    console.warn(`[geo] geolocation ${(e && e.name) || "error"}: ${e && e.message}`);
    return null;
  }
}

export async function fetchCityIP(fetchImpl = fetch) {
  for (const url of IP_PROVIDERS) {
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
      const city = data && data.city;
      if (city && typeof city === "string") {
        console.info(`[geo] IP ${url} → "${city.trim()}"`);
        return {
          city: city.trim(),
          ...(coordsPair(data.latitude, data.longitude) ?? {}),
        };
      }
      console.warn(`[geo] IP ${url} → no city`, data);
    } catch (e) {
      console.warn(`[geo] IP ${url} → ${(e && e.name) || "error"}`);
    }
  }
  return null;
}

// Drives the network cascade and writes the right cache (city + coords).
// Returns the resolved city, or null if nothing detected (caller keeps tz
// fallback).
export async function refreshLocation(storage, deps = {}) {
  if (readHome(storage)) return null; // manual wins; no detection/network
  const geo = await resolveCity(deps);
  if (geo) {
    writeCachedGeo(storage, geo);
    return geo.city;
  }
  const ip = await fetchCityIP(deps.fetchImpl || fetch);
  if (ip) {
    writeCachedIp(storage, ip);
    return ip.city;
  }
  console.warn("[geo] all detection failed; using timezone city");
  return null;
}
