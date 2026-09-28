import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://solstice.seanoliver.dev",
  output: "static",
  vite: {
    // The live demo imports the extension's modules from the repo root.
    server: { fs: { allow: [".."] } },
  },
});
