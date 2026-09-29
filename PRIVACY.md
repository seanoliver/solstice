# Privacy Policy

_Last updated: 2026-09-28_

Solstice is a Chrome new-tab extension that displays a world clock, and a
website that runs the same page in your browser. The extension has
**no servers, no accounts, no analytics, no tracking, and no advertising.**
Neither the extension nor the website sends your settings or location to the
developer. The website is served by Vercel, which receives standard request
data (see "The Solstice website" below).

This document describes exactly what the extension does with information,
because it requests location access and contacts a few third-party
services. Everything below is verifiable in the source code.

## What stays on your device

All of your settings are stored locally in your browser
(`localStorage`) and never leave your machine:

- Your list of timezones/cities.
- Your 12h/24h preference and other view settings.
- Your manually entered "home" label, if you set one.
- The most recently detected city name and coordinates for your local card
  (cached for 24 hours to avoid repeated lookups and to calculate local
  sunrise/sunset times).

Uninstalling the extension, or clearing the site data, removes all of it.

## Location

To label your local card with a city name and calculate its daylight accurately,
the extension tries, in order:

1. **A "home" label you typed yourself** — fully local, no network, and it
   takes priority over everything below. If you set this, no location
   detection or network request happens at all.
2. **Your browser's Geolocation** — only if you grant the permission Chrome
   prompts for. Your approximate coordinates are sent **once** to
   BigDataCloud's reverse-geocoding API to turn them into a city name. The
   city name and coordinates are cached locally for 24 hours so Solstice can
   calculate accurate sunrise/sunset times without asking again. They are not
   sent anywhere else.
3. **Approximate IP-based location** — used only if Geolocation is denied
   or unavailable. The extension requests your city from one of
   ipwho.is, ipapi.co, or get.geojs.io. As with any web request, these
   services can see your IP address; that is how they estimate your city.
   The returned city and approximate coordinates are cached locally for 24
   hours.
4. **Your system timezone** — a fully offline fallback (e.g.
   `America/New_York` → "New York") if everything above fails.

Sunrise/sunset times for the day-night bands are computed **locally** from
each zone's coordinates using an astronomical formula — no network involved.

## Adding a city

When you search for a city to add, your search text is sent to Open-Meteo's
free geocoding API to return matching cities and their coordinates. The
query is only sent while you are actively typing in the add-city box.

## The Solstice website

The website at https://solstice.seanoliver.dev runs the same new tab in your
browser, so you can try and customize it without installing anything.

- Your settings (timezones, 12h/24h, home label) are stored in that site's
  `localStorage`, separate from the extension. The site also remembers
  whether you dismissed its "Add to Chrome" banner.
- The website does **not** detect your location. It never asks for
  Geolocation and never makes an IP lookup. The local card uses your system
  timezone, or a home label you type.
- City search works as described above: your search text goes to Open-Meteo.
- The site is hosted on Vercel, which receives standard request data such as
  your IP address when you load the page. The site has no analytics.

## Third-party services

These services are contacted only as described above. Each has its own
privacy policy:

- **BigDataCloud** (reverse-geocoding) — https://www.bigdatacloud.com/privacy-policy
- **ipwho.is**, **ipapi.co**, **get.geojs.io** (IP geolocation fallback)
- **Open-Meteo** (city search) — https://open-meteo.com/en/terms
- **Vercel** (website hosting only) — https://vercel.com/legal/privacy-policy

The extension sends them only the minimum needed for the feature: your
coordinates (BigDataCloud), an implicit IP address (IP providers), or your
typed search query (Open-Meteo). It does not send any identifier, account,
or browsing history, because it has none.

## Permissions

- **`geolocation`** — used solely to label your local card with a city and
  calculate its daylight accurately. You can deny it; the extension falls back
  to IP or timezone city.
- **Host permissions** for the five domains listed above — required so the
  extension may contact those geolocation/geocoding APIs.

## Contact

Questions or concerns: email [solstice@seanoliver.dev](mailto:solstice@seanoliver.dev)
or open an issue on the project's GitHub repository.
