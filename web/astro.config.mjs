import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://solstice.seanoliver.dev",
  output: "static",
  vite: {
    // The home page imports the extension's new tab from the repo root.
    server: { fs: { allow: [".."] } },
  },
});
