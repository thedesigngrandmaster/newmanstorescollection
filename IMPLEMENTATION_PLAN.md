# Implementation Plan — Simplified Offline-First Admin Dashboard + Subscription Reminder

Source of truth: user brief "I need you to redesign and enhance the admin dashboard (pasted).md"
Status tracker: see `PROJECT_STATUS.md` in the repo root. **Update PROJECT_STATUS.md after every milestone.**

## Goal

Two admin experiences on the existing Newman Stores Collections store:

1. **Simplified Mobile-First Admin** (non-technical users, e.g. staff) — Android-style app grid, WhatsApp-style product creation, offline-first, revenue-based subscription reminder.
2. **Super Admin** — keep the existing full-featured dashboard unchanged; optionally surface the same subscription reminder.

Keep existing backend logic, auth, product model, and API structure. Frontend UX work + offline layer + revenue threshold notification.

## Part 1 — Simplified dashboard

Route: `/admin` stays; render decision inside `src/routes/admin.tsx`:

- `role === "admin"` → existing full dashboard (unchanged), plus a small "Simple view" link/switch.
- `role !== "admin"` (staff, or admin choosing simple view) → new `SimpleAdmin` component.
- Persist the view choice in `localStorage` so the user returns to the same view.

### App grid (navigation)

Large tiles, big touch targets, plain language, no jargon:

- **Overview** — today's snapshot: total money in, pending orders, products listed.
- **Products** — opens 4 clear actions: Add Product / View Products / Modify Products / Delete Products.
- **Accounts** — clean total revenue view ("Money that has come in").
- **Logout** — tile in the grid (plus sign-out).

**Do NOT show Staffs on the simplified version.** Existing permission gating still applies server-side.

Files:

- `src/components/simple/SimpleAdmin.tsx` — grid shell + Overview + Logout.
- `src/components/simple/SimpleProducts.tsx` — action chooser, view/modify/delete lists (reuse existing product server fns).
- `src/components/simple/SimpleAccounts.tsx` — revenue.

### Add Product flow (most important)

WhatsApp-chat-style interface (`src/components/simple/AddProductChat.tsx`):

- Chat bubbles; bot prompts ("What's the product? Type the name and price...").
- Input box + attach button: **1–4 images** (reject 0 and >4).
- Parser (`src/lib/simple-admin/parseProduct.ts`) extracts from free text:
  - **name** — first meaningful line minus price/size/color tokens
  - **price** — `₦`/`ngn`-prefixed or bare thousands number (e.g. `₦45,000`, `45000`)
  - **sizes** — numeric 35–48 or S/M/L/XL/XXL
  - **colors** — known color word list + `colours:` / `colors:` lines
- If something is missing, the bot asks for exactly the missing piece in chat (no error toasts).
- After creation: WhatsApp-style confirmation bubble with the public link in the format
  `https://[site-domain]/products/[product-slug]`. A `/products/$slug` alias route was added so
  this exact URL works; the original `/product/$slug` route remains for old links.
- Single image → reused for the 4-image slider (existing product-detail behavior already supports this).

### Offline-first (critical)

- **Service worker** via `vite-plugin-pwa` (`generateSW`, `registerType: "autoUpdate"`, `injectRegister: null`).
  - App shell + hashed assets cached; navigations NetworkFirst.
  - Registration only from the guarded wrapper `src/pwa/register.ts` (never in dev, iframe, or Lovable preview hosts; `?sw=off` kill switch; unregister in refused contexts).
  - Manifest `public/manifest.webmanifest` + icons + head tags in `src/routes/__root.tsx`.
- **Queue** in IndexedDB (`src/lib/simple-admin/offlineQueue.ts`): each queued item = { text, images (Blobs), parsed, status: pending | syncing | synced | failed, createdAt, error }.
- **Offline reads**: last known stats + product list cached in `localStorage` (`src/lib/simple-admin/localCache.ts`); offline role/permission cache in `src/lib/auth.tsx` keeps a signed-in device able to open the dashboard without a network round-trip.
- **Sync** (`src/lib/simple-admin/syncQueue.ts`): on `online` event + 60s interval + app open: upload images to Storage → create product via existing `saveAdminProduct` server fn → mark synced → show confirmation bubble with product link on next open.
- **Status indicators**: per-message chip (Offline queued / Sending… / Synced ✓ / Failed — tap to retry) and a global "X pending" bar.

### Accounts app

- Total revenue = sum of `total_cents` for orders with status in (paid, shipped, delivered) — reuse/same rule as the full dashboard's Accounts tab.

### Subscription renewal reminder (important)

`src/components/simple/SubscriptionBanner.tsx`:

- Monitor total revenue. When it passes **₦250,000**, show a prominent, un-dismissable-by-scroll banner:
  "Your website management subscription is due — ₦100,000 for 3 months" with a clear **Renew Subscription** button.
- Renew button → opens WhatsApp chat to the store's WhatsApp number (from Site Content settings) prefilled with a renewal request.
- Acknowledged renewals hide the banner for 90 days (localStorage timestamp), then it returns if revenue still qualifies.
- Also surface the banner on the Super Admin dashboard (secondary).

Server side: new `getSimpleStats` server fn (in `src/lib/simple-admin/simple.functions.ts`) with `requireSupabaseAuth` that returns `{ revenueCents, pendingOrders, productCount }` for any user that has a role (admin or staff). No `cc` or other private fields leak.

## Part 2 — Super Admin

- No layout changes. Add the same `SubscriptionBanner` above the admin header when revenue ≥ threshold.
- Optional "Simple view" switch link in the admin header.

## Technical notes

- No backend schema changes required. Product model (`cc`, `colors`, `has_other_colors`, `images`, etc.) is reused as-is.
- Offline parsing must never call the network; parsing is pure client-side regex/wordlist.
- Blobs stored in IndexedDB survive reloads; on sync failure, item stays `failed` with retry.
- Do not register the service worker in Lovable preview/dev (guarded wrapper only). Offline works in the published app.
- Slug generation: `slugify(name)` + short suffix on collision, checked client-side, uniqueness enforced by retry on sync.
