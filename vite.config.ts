// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      // Offline support for the simplified admin. Registration happens only
      // through the guarded wrapper src/pwa/register.ts (injectRegister: null).
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        devOptions: { enabled: false },
        // Nitro serves the published app from .output/public, so the generated
        // service worker and its precache manifest must live there too.
        outDir: ".output/public",
        includeAssets: ["favicon.ico", "manifest.webmanifest"],
        manifest: false, // manifest is a hand-written file in public/
        workbox: {
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          globPatterns: ["**/*.{js,css,ico,png,woff,woff2,ttf}"],
          navigateFallbackDenylist: [/^\/~oauth/],
          runtimeCaching: [
            {
              // Offline-first app shell for page loads: try network, fall back to cache.
              urlPattern: ({ request, url }) =>
                request.mode === "navigate" &&
                url.origin === self.location.origin &&
                !url.pathname.startsWith("/~oauth"),
              handler: "NetworkFirst",
              options: {
                cacheName: "nsc-pages",
                networkTimeoutSeconds: 6,
                expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              // Product photos (Supabase signed URLs) so the saved product list
              // still shows images offline.
              urlPattern:
                /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/(?:sign|public)\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "nsc-media",
                expiration: { maxEntries: 160, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
    ],
  },
});
