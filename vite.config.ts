// Static SPA build for GitHub Pages (https://ldanberger.github.io/ForestVR/).
// Lovable hosting is gone, so Nitro/Cloudflare is disabled and the app is pre-rendered as a single shell page.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  nitro: false,
  tanstackStart: {
    spa: { enabled: true },
  },
  vite: {
    base: "/ForestVR/",
  },
});
