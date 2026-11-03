# Newman Stores Collections Project Status

Last updated: 2026-11-02. Read this + `IMPLEMENTATION_PLAN.md` before continuing work. Update this file after every milestone.

## What exists and works today

### Storefront (Lovable Cloud + TanStack Start + Tailwind v4)

- Palette: `#212121` dark / `#F4EEE8` cream / `#D4FF00` lime accent. Headings **Space Grotesk**, body **Montserrat**. Sharp edges, Neo-Industrial styling.
- Home: glassy navbar (Shop / About Newman Stores Collections / Contact, active states, mobile menu-left + brand-center + cart-right) → hero (video bg `hero-video.mp4`) → **Latest Drop** section → WhatsApp channel CTA → **Featured products** → CTA band (`e.png`) → full-width footer with contact icons (location/phone/email), Instagram + WhatsApp channel links, `Copyright (c) 2026 Newman Stores Collections. All rights reserved.`
- Shop page with search + category filters. Categories: Sneakers, Corporate, Crocs, Slippers ("Leather slippers").
- Product detail `/product/$slug`: image slider (1 image auto-duplicated to 4), desktop hover/tap zoom, mobile pinch zoom, size + color selectors (color required when `has_other_colors`), thumbnails only shown when other colors exist, reviews, "Sold out" tag only (no stock numbers shown to customers).
- Cart page, checkout (required-field `*` marks, friendly validation errors, Lagos ₦2,000 / outside-Lagos delivery fee selector, location = house number + street + landmark/bustop + optional zip, secondary phone), payment modal (bank details from Site Content, WhatsApp receipt upload button opens prefilled `wa.me` message incl. order ID — customer must tap Send), thank-you page (receipt icon).
- Public pages: FAQ, About, Contact, Shipping & Returns, Track Order (works for any visitor by exact order ID), Care Instructions, Size Guide, Customer Care, custom 404.
- Currency: display-currency detection by visitor location (defaults ₦ NGN), editable default in Site Content.

### Admin dashboard (`/admin`, login at `/auth`)

- Lovable Cloud auth. First registered account = admin; `selorahealth@gmail.com` is admin. Roles in `user_roles` (`admin`/`staff`) with per-staff `permissions` array.
- Full sidebar tabs: Site Content, Products, Orders, Staffs (admin-only), Accounts (admin-only), Notifications.
- Site Content: brand/logo upload from device, nav layout, hero media, theme colors, payment info (bank + WhatsApp number), WhatsApp channel link, currency, delivery fees.
- Products: full CRUD with `cc` internal store code, price input in naira (not cents), other-colors checkbox + color editor, up to 4 images.
- Orders: list, detail modal with `cc`, status changes, delete, invoice/receipt generation.
- Receipts: **pdf-lib**-based (fixed 2026-09-14; `@react-pdf/renderer` broke on `paid` status with `Cannot find module '#standard-fonts/Helvetica'`). Receipt generated + uploaded + link stored on the order (`receipt_url`) when status → `paid`.
- Backend: Lovable Cloud (Supabase ref cjqcxesojbtqrftwpnqd). RLS tightened; permission-aware server fns for products/orders; public RPCs (`create_order_public`, `track_order_public`, `upload_receipt_public`); stock decrements on paid.
- `BACKEND_SETUP_EXPORT.md` = guide to migrate to a personal Supabase project (user asked; live switch intentionally NOT done).

### Known gaps / open items from earlier requests

- WhatsApp confirmation is prefilled, not auto-sent (platform limitation of wa.me).
- Email notifications via Lovable Emails were requested; email-domain setup was pending — verify before claiming it works.
- External Supabase switch remains an export-guide only.

## In progress (this task) — Simplified offline-first admin redesign

Full details in `IMPLEMENTATION_PLAN.md`. Milestones:

- [x] M1: Plan + this status doc written to repo
- [x] M2: PWA manifest + guarded service-worker registration (offline shell; SW emitted to `.output/public` with 111 precached assets)
- [x] M3: `SimpleAdmin` app grid (Overview, Products, Accounts, Logout; no Staffs) wired into `/admin` by role
- [x] M4: Add Product WhatsApp-chat flow (text + 1–4 images, client-side parser, confirmation bubble with product link)
- [x] M5: Offline queue (IndexedDB) + sync + offline/pending/synced indicators
- [x] M6: Accounts (revenue) + `getSimpleStats` server fn
- [x] M7: Subscription banner at ₦250,000 revenue (₦100,000 / 3 months, Renew action, 90-day ack), on simplified + super admin
- [x] M8: Typecheck/build green + verify flows

## Implementation summary (2026-11-02)

- `/admin`: Super Admin (role `admin`) keeps the existing sidebar dashboard and gains a **Simple view**
  toggle + the subscription banner; staff always get `SimpleAdmin` (no Staffs tile). Choice persists
  in `localStorage`.
- Products app: Add / View / Modify / Delete. Add is a WhatsApp-style chat that parses name, price,
  sizes (including `40-45` ranges), colours and stock fully client-side.
- Offline: IndexedDB queue stores text + image Blobs + parsed snapshot. Sync runs on mount, on
  `online`, and every 60s from both the dashboard shell and the chat. Status chips show
  Saved / Sending / ✓ Sent / Not sent (retry). Last stats and product list are cached for offline reads.
- Product links now use `/products/[slug]` (new alias route) while `/product/[slug]` still works.
- Subscription banner appears at ≥ ₦250,000 lifetime revenue with ₦100,000 / 3 months (≈ $75), a
  WhatsApp renew link (falls back to Contact), and a 90-day "I've renewed" acknowledgement.
- Verified: `tsc --noEmit` clean and `bun run build` successful (PWA precache generated in
  `.output/public/sw.js`).

## Rules for whoever continues

- Never show stock numbers to customers; only a "Sold out" tag.
- Never expose `cc` or admin-only data to storefront visitors.
- Keep all styling on Tailwind v4 semantic tokens in `src/styles.css` — no raw color utilities.
- Icons: Lucide via the project's `Icon` mapping only.
- Service worker must never register in dev/preview (guarded wrapper `src/pwa/register.ts`).
- Currency: `src/lib/currency.tsx` handles display conversion; admin expects naira inputs.
- Order IDs are `NSC-…`.
