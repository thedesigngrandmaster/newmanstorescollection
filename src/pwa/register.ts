// The ONLY service-worker registrar in the app. vite-plugin-pwa is configured
// with injectRegister: null so nothing else ever calls navigator.serviceWorker.
//
// Refuses to register (and unregisters any matching app SW) in dev, iframes,
// Lovable preview hosts, and when ?sw=off is present — per the platform PWA rules.

const SW_PATH = "/sw.js";

function hostnameMatchesPreview(): boolean {
  const hostname = window.location.hostname.toLowerCase();
  const previewLabel = /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/;
  if (
    (hostname.endsWith(".lovable.app") || hostname.endsWith(".gpt-eng.com") || hostname.endsWith(".gptengineer.run")) &&
    previewLabel.test(hostname.split(".")[0])
  ) {
    return true;
  }
  if (hostname === "project--2aa01051-e61d-4ee9-8ee3-bbdb15836886-dev.lovable.app") return true;
  if (hostname === "lovableproject.com" || hostname.endsWith(".lovableproject.com")) return true;
  if (hostname === "lovableproject-dev.com" || hostname.endsWith(".lovableproject-dev.com")) return true;
  if (hostname === "beta.lovable.dev" || hostname.endsWith(".beta.lovable.dev")) return true;
  return false;
}

export async function registerServiceWorker(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!import.meta.env.PROD) return unregisterAppSw();
  if (window.location.hostname === window.parent?.location?.hostname && window.self !== window.top) {
    return unregisterAppSw();
  }
  if (window.location.hostname.toLowerCase().includes("gptengineer.site")) return unregisterAppSw();
  if (hostnameMatchesPreview()) return unregisterAppSw();
  if (new URLSearchParams(window.location.search).has("sw=off") || window.location.search.includes("sw=off")) {
    return unregisterAppSw();
  }
  if (!("serviceWorker" in navigator)) return;

  try {
    await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
  } catch {
    // Registration failures must never break the app.
  }
}

async function unregisterAppSw(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.filter((r) => r.scope.endsWith("/")).map((r) => r.unregister()));
  } catch {
    // ignore
  }
}
