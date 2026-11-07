# Promo video

Source for the Solstice promo video. `stage.html` lays out the copy, a
browser-window frame, and the real new tab (`../../newtab.html`) in an iframe.
`record.mjs` drives the app, captures a Chrome screencast, and encodes
`out/solstice-promo.mp4` at 1920×1080, 60 fps.

## Render

Needs Node and ffmpeg.

```bash
cd assets/promo
npm install
npx playwright install chromium
npm run render
```

The recorder serves the repository root itself, freezes the clock at
Wed, Oct 21, 2026, 10:00 in Los Angeles (so London shows the daylight saving
chip), and blocks the location lookups. On-screen text lives in `COPY` at the
top of `record.mjs`.

The video file is not committed. Upload it to YouTube and paste the link into
the Chrome Web Store listing's promo video field.
