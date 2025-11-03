# ReactCart — E‑commerce Platform (Frontend)

ReactCart is a full‑featured e‑commerce frontend built with Next.js 16, React 19, TypeScript, and Tailwind CSS. It integrates with a backend via a simple JSON API with cookie/Bearer authentication and includes an admin area for store management.


## Features

- Customer storefront: home, shop, category pages, product detail, cart, checkout, order confirmation, and order history
- Authentication: register, login, logout, reset/forgot password, profile management
- Cart system: guest and authenticated carts, quantity updates, coupon apply/remove, server‑computed totals
- Admin panel: dashboard metrics, products CRUD, categories, orders, customers, and store/SEO/currency settings
- Media: image gallery, uploads endpoint, and product image sliders
- Theming and UX: Tailwind CSS v4, Radix UI primitives, responsive layout, toast notifications
- Charts and analytics: Recharts for admin insights; Vercel Analytics wired
- API proxy: optional same‑origin proxy to avoid CORS during local development


## Tech Stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4, Radix UI, shadcn‑style UI components
- Recharts, lucide‑react icons


## Repository Layout

- `app/` — routes and pages (App Router)
  - Customer: `page.tsx`, `shop/`, `product/[id]/`, `category/[category]/`, `cart/`, `checkout/`, `orders/`, `order/[number]/`, `order-confirmation/[id]/`
  - Auth: `login/`, `register/`, `forgot-password/`, `profile/`
  - Admin: `admin/dashboard/`, `admin/products/`, `admin/categories/`, `admin/orders/`, `admin/customers/`, `admin/settings/`
  - API proxy & helpers: `api/[...all]/route.ts`, `api/upload/`, `api/coupons/`
- `components/` — UI components and building blocks (Radix/shadcn‑style)
- `lib/` — API client, auth/cart/currency contexts, utilities
- `hooks/` — UI hooks (`use-toast`, `use-mobile`)
- `public/` — static assets and placeholder/product images


## Getting Started

Prerequisites:

- Node.js 18.18+ (or Node 20+ recommended)
- npm or pnpm installed
- A backend API running locally at `http://localhost:8080` (see API section)

Install dependencies:

```
npm install
# or
pnpm install
```

Create `.env.local` at the repo root (recommended defaults for local dev):

```
# Frontend reads directly from the backend base URL (used when not proxying)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080

# Force client calls to go through Next.js same‑origin proxy (avoids CORS during local dev)
NEXT_PUBLIC_USE_API_PROXY=true

# Used by the catch‑all proxy at app/api/[...all]/route.ts
API_PROXY_TARGET=http://localhost:8080
# Optional: prefix appended between target and path
API_PROXY_PATH_PREFIX=

# Optional: enable a local in‑browser cart when backend is unavailable
NEXT_PUBLIC_ENABLE_LOCAL_FALLBACK=false
```

Run the app in development mode:

```
npm run dev
```

Build and start in production mode:

```
npm run build
npm run start
```


## How It Works

Authentication and users:

- On successful login/registration, the backend returns a JWT (`accessToken`) and also sets an HTTP‑only cookie `RC_ACCESS`.
- The frontend stores the token in memory (mirrored to `localStorage`) and sends it as `Authorization: Bearer <token>` when present.
- User session hydration happens on mount via `/api/user-details`.

Cart lifecycle:

- Guests receive a generated cart ID stored in `localStorage` (normalized to a UUID).
- When a user logs in, carts are merged and server totals (subtotal, discounts, coupon effects) are synchronized.
- Coupon operations are supported for both guest and authenticated carts.

API access:

- The API client in `lib/api.ts` talks to either:
  - The backend directly using `NEXT_PUBLIC_API_BASE_URL`, or
  - The same‑origin proxy at `app/api/[...all]/route.ts` when `NEXT_PUBLIC_USE_API_PROXY=true` (recommended for local dev).
- Proxy target is configured with `API_PROXY_TARGET` and optional `API_PROXY_PATH_PREFIX`.

State management:

- `AuthProvider`, `CartProvider`, and `CurrencyProvider` (in `lib/`) expose app state via React Context.

UI and styling:

- Tailwind CSS v4 utilities, Radix UI primitives, shadcn‑style components under `components/ui/`.


## Available Scripts

- `npm run dev` — start Next.js development server (default on port 3000)
- `npm run build` — production build
- `npm run start` — start production server
- `npm run lint` — run ESLint


## API Documentation

- Quick reference for auth and user endpoints: `app/apiinstruction/api-implement-guide.md`
- In‑app backend spec viewer: `app/docs/backend-spec/page.tsx` reads `docs/backend-spec-v2.md` at runtime (optional). If you maintain backend docs, place that file under `docs/` for the viewer to render.

Base URL (local): `http://localhost:8080`

Response envelope used by the backend:

```
{
  "data": any | null,
  "meta": object | null,
  "error": { "code": string, "message": string, "fields": { [field: string]: string } | null } | null
}
```


## Key Routes (Front Office)

- `/` — Home with hero, hot products
- `/shop` — Product listing with filters
- `/category/[category]` — Category listing
- `/product/[id]` — Product details with gallery
- `/cart` — Shopping cart
- `/checkout` — Checkout flow
- `/orders` — Order history (requires auth)
- `/order/[number]` — Order details
- `/order-confirmation/[id]` — Post‑checkout confirmation
- `/login`, `/register`, `/forgot-password`, `/profile` — Auth and profile


## Key Routes (Admin)

- `/admin/dashboard` — Metrics and charts
- `/admin/products` — Product management (create/edit/list)
- `/admin/categories` — Category management
- `/admin/orders` — Orders and statuses
- `/admin/customers` — Customer list
- `/admin/settings` — Store, SEO, and currency settings


## Configuration Notes

- SEO and store metadata are generated in `app/layout.tsx` via `apiGetPublicSettings()`; defaults fall back to “ShopHub” if settings are not available.
- Image uploads are handled under `app/api/upload/` and product images live in `public/` for development.
