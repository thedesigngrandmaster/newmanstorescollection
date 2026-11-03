# Newman Stores Collections — Sneakers, Elevated

**Live store**: [https://newmanstorescollection.vercel.app](https://newmanstorescollection.vercel.app)

A full-stack, production-ready e-commerce platform for curated branded & unbranded footwear, built specifically for the Nigerian market (Lagos • Abuja • Ibadan).

Newman Stores Collections is **not** a template or a simple landing page. It is a complete commerce system with:

- Public storefront (product catalog, cart, checkout, real-time order tracking)
- Full admin dashboard (content CMS, inventory, orders, staff roles, accounting, notifications)
- Payment integrations (Paystack + bank transfer + receipt upload)
- Invoice / receipt generation
- Multi-staff permission system
- Exportable data (CSV / XLSX / PDF)

---

## Tech Stack

| Layer              | Technology                                         |
| ------------------ | -------------------------------------------------- |
| Frontend           | React 19 + TanStack Start / TanStack Router        |
| Styling            | Tailwind CSS v4 + Radix UI + Framer Motion         |
| Backend / DB       | Supabase (Auth + Postgres) + Drizzle ORM           |
| Payments           | Paystack (`react-paystack`) + Manual bank transfer |
| File / PDF         | jsPDF, pdf-lib, xlsx, papaparse                    |
| Build & Deploy     | Vite 8 + Vercel                                    |
| Package Manager    | Bun                                                |
| Forms & Validation | React Hook Form + Zod                              |

### Why Drizzle + Supabase?

Supabase provides the hosted Postgres database, Auth, and infrastructure.
**Drizzle ORM** sits on top of that same database as the type-safe query layer.

This combination gives:

- Full TypeScript inference and schema-as-code
- Cleaner complex queries, joins, and transactions (especially useful for the admin panel)
- Controlled migrations via Drizzle Kit

Auth still runs through Supabase. Drizzle is only used for data access.

Originally scaffolded with Lovable / modern AI-assisted tooling and then heavily customized into a real commerce system.

---

## Key Features

### Customer-Facing

- Modern dark-themed storefront with lime accent branding
- Product catalog with categories, search, size & color selection
- Cart + multi-step checkout (delivery details + summary)
- Paystack (card, bank transfer, USSD, OPay, etc.)
- Manual bank transfer with receipt upload requirement
- Real-time order tracking (`PENDING → PAID → PROCESSING → SHIPPED → DELIVERED`)
- Protected routes: thank-you page, cart details, and order info are not accessible without a valid purchase flow
- Automatic receipt / invoice PDF generation

### Admin Dashboard

- **Site Content** — Edit brand name, tagline, logo, navigation, hero, CTA band, etc. without touching code
- **Products** — Full CRUD, stock levels, categories/subcategories, images
- **Orders** — View full customer details + delivery address, change status, download receipt, delete
- **Staffs** — Add staff/admin accounts with granular permissions (Content, Products, Orders, Accounts, Notifications)
- **Accounts** — Revenue overview, pending amount, date-range filters, export CSV / XLSX / PDF
- **Notifications** — Real-time new order alerts

### Security & Business Logic Notes

- Customers must upload a payment receipt before an order can be marked as paid and before the official invoice is issued.
- Thank-you page, cart state, and sensitive account information are protected — outsiders cannot access them by URL alone.
- Staff permissions are enforced at the dashboard level.

---

## Getting Started (Local Development)

### Prerequisites

- Node.js 20+ or Bun
- Supabase project (or existing credentials)
- Paystack test/live keys

### 1. Clone & Install

```bash
git clone https://github.com/thedesigngrandmaster/newmanstorescollection.git
cd newmanstorescollection
bun install
```

### 2. Environment Variables

Create a `.env` file in the root with at least:

```env
# Supabase (browser)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key

# Supabase (server-side only — never prefix these with VITE_)
SUPABASE_URL=your_supabase_url
SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database (Drizzle)
LOVABLE_DB_MIGRATION_URL=your_postgres_connection_string
DATABASE_URL=your_postgres_connection_string

# Paystack
VITE_PAYSTACK_PUBLIC_KEY=pk_test_... or pk_live_...

# Optional: public URL of the receipt logo
BRAND_LOGO_URL=https://your-project.supabase.co/storage/v1/object/public/brand/newman-stores-receipt-logo.png
```

> `.env`, `.env.*` and `env.txt` are ignored by git. Never commit live keys.

### 3. Database

```bash
# Generate / run migrations (Drizzle)
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

### 4. Run

```bash
bun run dev
```

The app will be available at `http://localhost:5173` (or the port Vite assigns).

### 5. Build for Production

```bash
bun run build
bun run preview
```

---

## Project Structure

```text
├── drizzle/                 # Schema & migrations
├── public/                  # Static assets, fonts, hero video
├── src/
│   ├── components/
│   │   ├── admin/           # AccountsTab, OrdersTab, ProductsTab, StaffsTab, etc.
│   │   ├── checkout/        # PaystackButton
│   │   ├── site/            # CartDrawer, CheckoutModal, Hero, Navbar, ProductCard...
│   │   └── ui/              # Radix-based design system
│   ├── hooks/
│   ├── integrations/        # Supabase client, etc.
│   ├── lib/
│   └── routes/              # TanStack Router pages
├── supabase/                # Supabase config & migrations
├── package.json
├── drizzle.config.ts
├── vite.config.ts
└── vercel.json
```

---

## Deployment

The project is configured for **Vercel**.

### 1. Connect the repository

- Import `https://github.com/thedesigngrandmaster/newmanstorescollection` into Vercel.
- Framework Preset: Vite (or leave as Other — it will detect correctly).

### 2. Environment Variables

Add these in the Vercel project settings → Environment Variables:

```env
# Supabase (browser)
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

# Supabase (server-side only — never prefix these with VITE_)
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Database (Drizzle / Postgres)
DATABASE_URL=
LOVABLE_DB_MIGRATION_URL=

# Paystack
VITE_PAYSTACK_PUBLIC_KEY=

# Optional
BRAND_LOGO_URL=
```

> Use the **same** values that are currently working on the live site.
> Never commit real keys to the repository.

### 3. Apply the rebrand migration

Before placing orders with the new `NSC-` prefix, run this file in the Supabase SQL Editor:

```text
supabase/migrations/20261103090000_rebrand_newman_stores_collections.sql
```

It updates `site_settings` to the Newman Stores Collections branding and replaces the order-ID functions. Historical `A01L-` orders remain trackable; new orders use `NSC-`.

### 4. Build & Output Settings

- Build Command: `bun run build` (or `npm run build`)
- Output Directory: `dist` (Vite default)
- Install Command: `bun install` (recommended) or `npm install`

### 5. Deploy

Click **Deploy**. The included `vercel.json` rewrite rule ensures client-side routing (TanStack Router) works correctly on all routes.

### 6. Post-deploy checklist

- Confirm the admin login still works
- Place a test order and verify Paystack + order tracking
- Check that receipt PDF generation and status updates function

### Transferring the live project

When selling, you can transfer the existing Vercel project ownership to the buyer so they keep the current deployment, domain settings, and environment variables without rebuilding from scratch.

---

## Transferable Assets

The following can be handed over to a buyer for an immediate head-start:

- Full source code + this repository
- Live Vercel deployment (transfer project ownership)
- Supabase project (or database export)
- Paystack account configured for the business
- Email: `care.newmanstorescollections@gmail.com`
- Instagram: [https://instagram.com/newmanstorescollections](https://instagram.com/newmanstorescollections)
- WhatsApp Channel: [https://www.whatsapp.com/channel/0029Vb8KvuA4NViqiVNKfU2t](https://www.whatsapp.com/channel/0029Vb8KvuA4NViqiVNKfU2t)
- Product & order data (exportable)
- Optional: vendor contacts (with prior permission)

**Note on bank account**: There is currently no formal business bank account. A business name registration + bank account can typically be completed in under 48 hours in Nigeria. Until then, the system already supports personal account + receipt upload flow.

---

## Current Business Status (as of sale)

- Inventory is live and stock-tracked
- Orders have been placed (examples exist in the system)
- Revenue shown in admin may still be low / pending while early orders are processed
- No customer testimonials yet
- Buyer will need to add their own staff and can expand the product catalog

---

## License / Ownership

All rights currently belong to the repository owner. Full ownership and IP transfer will be provided upon sale.

---

## Support during handover

A live Zoom or Google Meet call will be provided to walk the buyer through the admin dashboard and answer questions. Additional reasonable support is available for a limited period after transfer.
