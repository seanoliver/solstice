# Chrome Web Store — listing copy & submission guide

Everything needed to publish Solstice. Copy/paste the listing fields, upload
the prepared assets, and follow the submission steps. Items marked **(you)**
require Sean's developer account and can't be automated.

## Package

Upload artifact: `solstice-1.0.0.zip` (repo root, git-ignored — rebuild any time):

```bash
rm -f solstice-1.0.0.zip
zip -rq solstice-1.0.0.zip \
  manifest.json newtab.html newtab.css newtab.js config.js cities.js \
  src assets/icons -x '*.DS_Store'
```

Contains only runtime files + icons — no docs, tests, screenshots, or README.

## Listing fields

- **Name:** `Solstice`
- **Summary** (short description, ≤132 chars):
  `A calm new tab that visualizes daylight and working hours across all your time zones, at a glance.`
- **Category:** Workflow & Planning _(alternate: Tools)_
- **Language:** English

### Detailed description

```
Solstice replaces Chrome's new tab with a single, quiet world clock. A big
local time up top, a card for every place you care about, and a 24-hour
timeline that makes the whole day legible at once.

Every clock is shaded by where the sun actually is — sunrise and sunset are
computed for each city's real coordinates — so you can tell at a glance who's
asleep, who's mid-morning, and who's wrapping up their day.

• Glanceable — one screen answers "what time is it for them, and is now a good
  time to ping?"
• Day & night, for real — colored bands reflect the actual day, not a guess.
• Plan across zones — drag any timeline marker and every clock jumps to that
  moment, so you can find an hour that's civil for everyone.
• Yours in seconds — add or remove cities, drag to reorder, rename a zone to a
  person's name, flip the whole page between 12h and 24h.
• Quiet by design — muted palette, monospace numerals, nothing blinking for
  your attention.

No accounts, no feeds, no analytics, no tracking. Your settings live in your
browser. Open a tab, get your bearings, move on.
```

## Assets (all prepared in `assets/store/`)

- **Store icon:** `assets/icons/icon-128.png` (128×128).
- **Screenshots** (1280×800, upload 2–3):
  - `assets/store/store-hero.png` — the default view.
  - `assets/store/store-scrub.png` — scrubbed to noon (the timeline-scrub feature).
  - `assets/store/store-edit.png` — edit panel + add-a-city search.
- **Small promo tile** (440×280, optional): `assets/store/store-promo.png`.
  Minimal icon-on-dark tile; only needed if Chrome features the extension.

## Privacy tab (required before submission)

- **Single purpose:** "A new-tab page that displays the current time across
  multiple time zones, with sunrise/sunset-based day-night shading."
- **Permission justifications:**
  - `geolocation` — Optional. Used only to label the user's local card with a
    nearby city name. The user is never forced to grant it; the card falls back
    to the browser's time-zone name. Coordinates are cached locally and sent
    only to the reverse-geocoding endpoint to resolve a city name.
  - Host `api.bigdatacloud.net` — reverse-geocode granted coordinates → city name.
  - Hosts `ipwho.is`, `ipapi.co`, `get.geojs.io` — IP-based city fallback when
    geolocation is denied or unavailable (tried in order).
  - Host `geocoding-api.open-meteo.com` — city search when adding a zone whose
    name isn't in the bundled dataset.
- **Data usage disclosures:** Does NOT collect or transmit personal or usage
  data. No analytics, no remote logging. Location (if granted) is used
  ephemerally to look up a city name and cached locally only.
- **Privacy policy URL:** `https://github.com/seanoliver/solstice/blob/main/PRIVACY.md`

## Submission steps **(you)**

1. Go to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
   If this is the first publish, pay the one-time **$5** developer registration.
2. **New item** → upload `solstice-1.0.0.zip`.
3. Fill the **Store listing** tab with the fields above; upload the icon and
   2–3 screenshots (and the promo tile if you want).
4. Fill the **Privacy practices** tab with the single-purpose statement, the
   per-permission justifications, the data-usage disclosures, and the policy URL.
5. Set **Distribution** (Public) and visibility.
6. **Submit for review.** New-tab overrides get extra scrutiny — review can take
   a few days. If rejected, the reason is usually a permission justification;
   tighten the wording above and resubmit.

## Notes

- The 5 remote host permissions are the most likely review question. They're all
  small, single-call geocoding/IP lookups with no data collection — the
  justifications above map each host to its one job. If review pushes back, the
  fallback is to drop the IP-geolocation hosts (`ipwho.is`, `ipapi.co`,
  `get.geojs.io`) and rely on the browser geolocation prompt alone.
- Version stays `1.0.0` for the first publish; bump on each subsequent upload.
```
