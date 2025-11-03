# ReactCart Platform — Implementation Overview

This document summarizes what the app does today, the APIs it uses, how major flows work (guest vs. authenticated), and a short, traceable changelog of improvements and code cleanup completed during this pass.

## App Structure (High‑Level)
- Next.js App Router under `app/` with page routes for storefront, cart, checkout, orders, order confirmation, admin, and docs.
- API client and data types in `lib/api.ts`.
- UI and state contexts: `lib/auth-context.tsx`, `lib/cart-context.tsx`, `lib/currency-context.tsx`.
- Shared UI components under `components/` and `components/ui/`.

## Authentication
- Login: `POST /api/auth/login` → stores `accessToken` and mirrors to localStorage.
- Registration: `POST /api/auth/register`.
- Logout: clears token; Navbar redirects to `/` and shows toast.
- Role: `ApiUser.role` → `admin` vs `customer` for route guards and admin UI.

## Public Settings and Currency
- Public settings: `GET /api/settings` (docs/settings.md).
- `CurrencyProvider` loads `defaultCurrency` and exposes `formatPrice()`.
- Used across storefront, orders, admin dashboard/orders.

## Catalog
- Products: `GET /api/products`, `GET /api/products/:id`.
- Categories: `GET /api/categories`.
- Admin Products/Categories/Inventory per docs in `docs/admin-*.md`.

## Cart — Guest and Auth (docs/cart-integration-guide.md, docs/cart-summary-sync.md)
- Guest cart lifecycle
  - Create/ensure: `POST /api/carts` → `{ cartId }` saved to `localStorage.RC_GUEST_CART_ID`.
  - Add item: `POST /api/carts/{cartId}/items`.
  - Update item: `PATCH /api/carts/{cartId}/items/{productId}`.
  - Remove item: `DELETE /api/carts/{cartId}/items/{productId}`.
  - Clear cart: `DELETE /api/carts/{cartId}`.
  - Read/summary: `GET /api/carts/{cartId}` (authoritative totals).
- Authenticated cart lifecycle
  - Merge guest cart on login: `POST /api/me/cart/merge { guestCartId, strategy }`.
  - Read/summary: `GET /api/me/cart` or `PATCH /api/me/cart/summary` (relative proxy helpers).
  - Coupons: `POST /api/me/cart/apply-coupon`, `DELETE /api/me/cart/coupon`.
- Coupon summary sync helpers (relative proxy)
  - Guest: `apiCartSyncSummaryRelative(cartId, code?, snapshot?)`.
  - Auth: `apiMeCartSyncSummaryRelative(code?, snapshot?)`.
- Frontend `CartProvider` highlights
  - Maintains `cart` and `cartCount` in context; mirrors server after writes.
  - Unified add‑to‑cart flow resolves the effective cart id (auth uses `/api/me/cart`) and posts to `/api/carts/{id}/items`, then refetches authoritative summary for totals and counter.
  - Coupon apply/remove uses server endpoints and refetches summary.

## Coupons (docs/cart-integration-guide.md, docs/public-coupons.md)
- Guest apply/remove: `/api/carts/{cartId}/apply-coupon`, `/api/carts/{cartId}/coupon`.
- Auth apply/remove: `/api/me/cart/apply-coupon`, `/api/me/cart/coupon`.
- Public validate: `GET /api/coupons/{code}/validate` (used to preview validity/amount in Cart page).

## Checkout and Orders (docs/orders.md)
- Authenticated checkout now includes name/email/phone/address on the order payload (guest fields) while still linking `userId`:
  - Guests: `POST /api/orders { cartId, name, email, phone?, address, city, postalCode, paymentMethod, card? }`.
  - Auth: `POST /api/me/orders { name, email, phone?, address, city, postalCode, paymentMethod, card? }`.
  - Payment method `CARD` accepts any details (client-accepted; server normalizes in this project’s setup).
- After successful order:
  - Client clears cart context and guest `cartId` storage, re-provisions if needed.
  - Redirects to pretty order number route when available.
- My Orders page `/orders`
  - Loads `GET /api/me/orders`, newest-first, currency formatted.
  - Cancel flow attempts `PATCH /api/me/orders/{id}/cancel` (no body) with single POST fallback to avoid multiple calls; shows toasts.

## Admin — Orders (docs/admin-orders.md)
- Search/filter/sort/paging: `GET /api/admin/orders` with params `{ status, search, minTotal, maxTotal, page, size, sort }`.
- Update status: `PATCH /api/admin/orders/{id}/status { status }`.
- Delete: `DELETE /api/admin/orders/{id}`.
- Display logic for customer identity
  - Prefer submitted contact fields (now provided for both guest and auth orders): `guestName/guestEmail/guestPhone`.
  - Fall back to `userName/userEmail/userId` for registered users if guest fields are absent.
  - Coupon code badge shown when present.
  - Address supports either a single string or structured object.
- Currency formatting via `useCurrency()`.

## Admin — Dashboard (docs/admin-dashboard.md)
- GET `/api/admin/dashboard` returns overview tiles, status distribution, monthly revenue trend, quick stats, and recent orders.
- UI features
  - Revenue Trend toggle: By Date (client aggregates last delivered orders), By Month (server trend), By Year (client-aggregated months).
  - Recent Orders shows guest/user names, email, currency totals, and is scrollable to keep the card compact.

## Auth — Routing
- On login: redirect to home (or admin dashboard for admins per previous requirements).
- On logout: redirect to `/` with a toast (implemented in `components/navbar.tsx`).

## Files and Key Functions
- API client: `lib/api.ts` — typed wrappers for all endpoints used above.
- Carts: `lib/cart-context.tsx` — unified add/update/remove, merge, summary sync, coupon flows, and `cartCount` for navbar.
- Currency: `lib/currency-context.tsx` — loads public settings and exposes `formatPrice()`.
- Admin Orders: `app/admin/orders/page.tsx` — filters, paging, status updates, delete, address/coupon/customer display.
- Admin Dashboard: `app/admin/dashboard/page.tsx` — metrics, charts, recent orders.
- Checkout: `app/checkout/page.tsx` — captures name/email/phone/address, creates order for guest/auth, clears cart.
- Orders (user): `app/orders/page.tsx` — lists orders, cancel flow.
- Navbar: `components/navbar.tsx` — shows `cartCount`, logout redirect.

## Recent Fixes (Functional)
- Coupons: guest/auth apply/remove aligned with backend and synchronized totals.
- Realtime cart counter: add‑to‑cart updates `cartCount` instantly for logged‑in users.
- Authenticated checkout: includes name/email/phone/address on order (guest fields), while linking userId.
- Customer identity: admin orders/dashboard use guestName/guestEmail/guestPhone for guests (and for auth orders as provided), else userName/userEmail/userId.
- Currency: applied across dashboard and admin orders via public settings (`/api/settings`).

## Cleanup (Non‑breaking)
The following were removed because they were not referenced anywhere in the codebase (validated via project‑wide search):

1) `app/page.tsx.bak`
   - Old backup of the home page. No imports reference this file; the active home page is `app/page.tsx`.

2) `components/ui/sonner.tsx`
   - Wrapper for the `sonner` toaster. Not imported by any page or component — the app uses `hooks/use-toast` and `components/ui/toaster.tsx`.

Both removals are safe and do not affect runtime behavior.

If you want a deeper static analysis pass (e.g., unused exports), we can add a temporary CI lint task or use TS project references; for now, the cleanup targets only unreferenced top‑level files.

## Known Follow‑ups / Nice‑to‑haves
- Admin Orders: currency formatting for per‑item unit prices (currently totals/subtotal/discount are formatted).
- Remove a stray non‑ASCII character in the Admin Orders items list line label (cosmetic).
- Optional optimistic increment on add‑to‑cart pre‑network for even snappier UX.

## Support
If any backend param names change (e.g., admin search filters), adjust `lib/api.ts` mapping in `apiAdminSearchOrders()`.

