// Remote city search via Open-Meteo's free geocoding API (no key required).
// Returns the same shape as cities.js entries so callers can treat both alike.
const API = "https://geocoding-api.open-meteo.com/v1/search";

export async function searchCitiesRemote(query, signal) {
  const q = String(query ?? "").trim();
  if (q.length < 2) return [];
  const url = `${API}?name=${encodeURIComponent(q)}&count=8&language=en&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`geocoding ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.results)) return [];
  return data.results
    .filter((c) => c.timezone && c.latitude != null && c.longitude != null)
    .map((c) => ({
      name: c.name,
      tz: c.timezone,
      lat: c.latitude,
      lon: c.longitude,
      // Disambiguates "Springfield, IL" from "Springfield, MO".
      // admin1 is state/province; country fills in otherwise.
      where: c.admin1 || c.country || "",
    }));
}
