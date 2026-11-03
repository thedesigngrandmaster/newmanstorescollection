# Newman Stores Collections — E-commerce + Admin Dashboard

A fully responsive sneaker storefront with a live-editable admin dashboard, real-time stock, order tracking, staff roles, and downloadable account records. All content, colors, layout, and payment info are editable from the admin without touching code.

## Design direction

- **Palette (default, editable):** Buttermilk `#fff2bd` (background), Mid Blue `#285ccc` (primary/accent), deep near-black `#0b0b0d` (text on cream), soft white `#fffdf5` (cards on blue).
- **Type:** Editorial sans — `Space Grotesk` for headings, `Inter` for body (via `@fontsource`).
- **Icons:** Ionicons only (`ionicons/react`) for iOS-style feel.
- **Animation:** Framer Motion — subtle fade/slide on section enter, spring on cards, glassy nav blur transition on scroll, modal spring pop, WhatsApp button pulse.
- **Feel:** Editorial + luxe, generous whitespace, rounded-2xl cards, soft blue shadows.

## Storefront (`/`)

1. **Glassy Navbar** — `backdrop-blur-xl`, translucent buttermilk, condenses on scroll.
   - Left: logo + brand name • Middle: categories (with subcategory dropdown) • Right: cart icon + user icon → `/admin/login`.
   - Layout (logo position, hide categories/user icon) is admin-configurable.
2. **Hero** — Single centered headline + subheadline + primary CTA + secondary CTA. Full-bleed background slot that accepts **image OR video** (`<video>` with poster fallback). Editable copy, media, and overlay opacity.
3. **Products grid** — Filter by category/brand. Card shows image, name, price, "Sold out" badge when stock = 0. Framer stagger on load.
4. **CTA band** — Editable heading/sub/CTA.
5. **Footer** — Hero-footer layout from reference: brand block + newsletter, then Contact / Quick Links / Support / Resources columns, socials, copyright. Fully editable.

### Product detail (`/product/$slug`)

- Image slider (swipe on mobile, arrows on desktop). If only 1 image uploaded, auto-duplicate to 4 so slider still works.
- Title, description (auto-generated if empty), price, optional size selector, quantity, add-to-cart.
- **Ratings**: average of customer reviews; if no reviews, derived from purchase count (`min(5, 3 + log10(buyers+1))`) with label "Based on buyers".
- Review list + submit review form (name + rating + comment; stored in `reviews`).

### Cart + Checkout

- Slide-over cart.
- Checkout form: name, email, phone, address. On submit → creates `order` with unique `order_id` (e.g. `SL-7F3K2A`), decrements stock atomically in a Postgres RPC.
- **Payment modal** (spring-in): shows order ID, bank details pulled from Site Content settings, and a big **WhatsApp-green** (`#25D366`) button "Upload your receipt here after payment" → opens `https://wa.me/<number>?text=Order%20<id>`. WhatsApp number is stored in settings, not displayed as raw text (button opens chat directly).

## Admin (`/admin`)

- `/admin/login` — email/password (Lovable Cloud auth). Sign-in card, buttermilk/blue.
- `/admin/*` protected under `_authenticated/` with `has_role` check (admin OR staff).
- Sidebar (collapsible on mobile → sheet). Tabs:

1. **Site Content** — accordion sections for Header (logo upload, brand name, nav layout, category CRUD w/ subcategories), Hero (media upload, headline, sub, CTA text/link, overlay), Products section (heading), CTA band, Footer (all columns/links/socials/address/newsletter copy), Theme (color pickers writing to CSS vars live), Payment info (bank name, account name, account number, WhatsApp number).
2. **Products** — table + create/edit drawer. Fields: name, brand, category, subcategory, price, sizes[], description, stock (int), sold_out override, up to 4 images (uploaded to Storage). Live stock indicator.
3. **Orders** — table with status pill (pending / paid / shipped / delivered / cancelled), customer, total, date, thumbnail. Row click → modal with full customer info, itemized products, order ID, status changer.
4. **Staffs** — admin-only. Add staff (email + generated password), role tag (`admin` / `staff`), disable/delete. Password generation via Auth Admin API in a server fn guarded by `has_role('admin')`.
5. **Accounts** — admin-only. Revenue table (from paid orders). Filters by date range. Export **CSV, XLSX, PDF** (via `papaparse`, `xlsx`, `jspdf` + `jspdf-autotable`). Totals card.
6. **Notifications** — new-order feed via Supabase Realtime on `orders`. Toast + bell badge.

Staff role sees all tabs except Accounts; UI hides it AND server fn rejects.

## Real-time stock

- `orders.status` transition to `paid` triggers `decrement_stock(product_id, qty)` RPC (already-committed in checkout; status flip is idempotent).
- Storefront subscribes to `products` realtime → stock badge updates without refresh.
- When `stock <= 0`, "Sold Out" overlay + disabled add-to-cart.

## Data model (Lovable Cloud / Postgres)

```text
site_settings (singleton row: brand, logo_url, nav_layout jsonb, hero jsonb,
               cta jsonb, footer jsonb, theme jsonb, payment jsonb)
categories (id, name, slug, sort)
subcategories (id, category_id, name, slug)
products (id, name, slug, brand, category_id, subcategory_id, price_cents,
          description, sizes text[], stock int, sold_out bool, images text[])
reviews (id, product_id, name, rating, comment, created_at)
orders (id, order_id text unique, customer jsonb, items jsonb, total_cents,
        status text, created_at)
app_role enum ('admin','staff')
user_roles (id, user_id, role) + has_role() SECURITY DEFINER fn
```

Every `public` table gets `GRANT`s per platform rules; RLS enabled:

- `site_settings`, `categories`, `subcategories`, `products`, `reviews`: public SELECT; admin/staff write.
- `orders`: anon INSERT (checkout); admin/staff SELECT/UPDATE.
- `user_roles`: authenticated SELECT own; admin write.

## Tech notes

- Tailwind v4 tokens in `src/styles.css` for buttermilk/blue + WhatsApp green.
- Framer Motion for section enters, nav scroll condense, modal springs, WhatsApp pulse.
- `@ionic/react` icons.
- File uploads → Storage bucket `media` (public).
- Server fns for auth-scoped writes; `/api/public/*` not needed.
- Responsive: sidebar collapses to bottom sheet on mobile; admin tables become card lists < md.

## Build order

1. Enable Lovable Cloud + install deps (`framer-motion`, `@ionic/react`, `@fontsource/space-grotesk`, `@fontsource/inter`, `papaparse`, `xlsx`, `jspdf`, `jspdf-autotable`, `zod`).
2. Migrations (enums, tables, GRANTs, RLS, `has_role`, `decrement_stock` RPC, seed default `site_settings` + demo products/categories).
3. Theme tokens + fonts + Ionicon wrapper.
4. Storefront: nav, hero, products grid, product detail, cart, checkout, payment modal, footer — all reading from `site_settings` + `products`.
5. Admin shell + auth + role gate.
6. Admin tabs in order: Site Content, Products, Orders, Staffs, Accounts, Notifications.
7. Realtime stock + notifications.
8. Responsive polish, animations, empty states.
