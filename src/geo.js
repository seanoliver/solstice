// Optional IP-based city detection for the local zone. Cached in
// localStorage with a TTL so the network is hit rarely, not per tab.
// Tries several providers; any total failure returns null → caller falls
// back to the timezone city. Logs each attempt under "[geo]" for debugging.

const KEY = "geoCity";
const TTL_MS = 24 * 60 * 60 * 1000; // 1 day

// Each: [url, (json) => cityString]. All are HTTPS, keyless, CORS-friendly.
const PROVIDERS = [
  ["https://ipwho.is/", (d) => d && d.city],
  ["https://ipapi.co/json/", (d) => d && d.city],
  ["https://get.geojs.io/v1/ip/geo.json", (d) => d && d.city],
];

export function readCachedCity(storage, now = Date.now()) {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const { city, ts } = JSON.parse(raw);
    if (!city || typeof ts !== "number") return null;
    if (now - ts > TTL_MS) return null; // stale → caller should refetch
    return city;
  } catch {
    return null;
  }
}

export function writeCachedCity(storage, city, now = Date.now()) {
  storage.setItem(KEY, JSON.stringify({ city, ts: now }));
}

export async function fetchCity(fetchImpl = fetch) {
  for (const [url, pick] of PROVIDERS) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3500);
      const res = await fetchImpl(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) {
        console.warn(`[geo] ${url} → HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const city = pick(data);
      if (city && typeof city === "string") {
        console.info(`[geo] ${url} → "${city.trim()}"`);
        return city.trim();
      }
      console.warn(`[geo] ${url} → no city in response`, data);
    } catch (e) {
      console.warn(`[geo] ${url} → ${e && e.name}: ${e && e.message}`);
    }
  }
  console.warn("[geo] all providers failed; using timezone city");
  return null;
}
