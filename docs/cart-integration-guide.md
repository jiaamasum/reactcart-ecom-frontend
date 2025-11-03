# Cart Integration Guide (Guest + Auth)

This guide describes the complete cart model and API surface for both guest and authenticated users, the intended UX flow, and step‑by‑step frontend integration. It reflects the latest behavior where authenticated cart endpoints identify the user by JWT subject (`userId`).

## Goal

- Let users add to cart and manage their cart without logging in.
- Persist guest carts on the server and use `localStorage.cartId` as the client handle.
- When a user logs in, claim/merge the guest cart into the user’s server cart, then remove the local `cartId` and operate fully from the server on `/api/me/cart/**` endpoints.
- Apply coupons for both guest and authenticated carts with consistent calculations server‑side.

The design ensures guests can freely manage carts, while login seamlessly promotes that state to the user’s account with predictable server authority over totals, coupon validation, and stock checks.

## Data Model (DB)

Tables used:

- `carts(id, user_id, updated_at, coupon_code, subtotal, discount_amount, total)` (id is a 36‑char UUID)
- `cart_items(id, cart_id, product_id, quantity)`

Notes:
- `user_id` is nullable for guest carts.
- Server initializes monetary snapshot fields to `0.00`; totals are recomputed as needed on read endpoints.

## Authentication Model

- JWT subject is the `userId`.
- Authenticated endpoints use `Authentication.getName()` as `userId`.
- Public endpoints (guest) do not require Authorization.

Key files for reference:
- Security config allows public guest cart routes and protects user routes: `src/main/java/org/masumjia/reactcartecom/security/SecurityConfig.java:21`
- Controller uses `userId` from the authentication principal for all `/api/me/cart/**` handlers: `src/main/java/org/masumjia/reactcartecom/cart/CartController.java:1`

## API Surface

Base URL: `http://localhost:8080`
All responses use `{ data, meta, error }` where `error = { code, message, fields? }`.

### Public Coupons APIs (no auth)

For details and examples, see `docs/api/public-coupons.md`. Summary:

- Validate by code: `GET /api/coupons/{code}/validate`
    - Optional params: `customerId`, repeatable `productIds`, repeatable `categoryIds`, `subtotal` for previewing `discountAmount`.
    - Returns validity, reason, discount type/value, scoped applicability, and usage metadata.

- Redeem: `POST /api/coupons/{code}/redeem`
    - Body: `{ customerId?, productIds?, categoryIds? }` (fields required when coupon assignments demand them)
    - Validates and increments usage; response includes `{ code, usedCount }` and a success message.

### Guest Cart (no auth)

- Create/Bootstrap (idempotent)
- POST `/api/carts`
    - Body: `{}`
    - Returns `{ data: { cartId } }` with 200 if provided/valid `cartId` exists, else 201 for new.
- Store `data.cartId` into `localStorage.cartId` (36‑char UUID).

- Add Item
    - POST `/api/carts/{cartId}/items`
    - Body variants: `{ "productId":"uuid", "quantity":2 }`, `{ "productId":123 }`, `{ "productId": { "id":"uuid" } }`
    - Increments if exists; clamps to stock; `OUT_OF_STOCK` if stock <= 0.
    - Returns `CartView` where coupon/total are omitted on write (`appliedCouponCode=null`, `discountAmount=0`, `total=null`).

- Update Quantity
    - PATCH `/api/carts/{cartId}/items/{productId}`
    - Body: `{ "quantity": number }`; `<=0` deletes.

- Remove Item
    - DELETE `/api/carts/{cartId}/items/{productId}`

- Clear Cart
    - DELETE `/api/carts/{cartId}`

- Cart Page (compute totals)
    - GET `/api/carts/{cartId}`
    - Returns `CartView` with `appliedCouponCode`, `discountAmount`, `total`.

- Coupons (guest)
    - Apply: POST `/api/carts/{cartId}/apply-coupon` `{ "code": "SPRING25" }`
    - Remove: DELETE `/api/carts/{cartId}/coupon`

- Checkout (stock reservation)
    - POST `/api/carts/{cartId}/checkout`
    - Attempts atomic decrement; 409 with `error.fields` for per‑product available quantities if any line fails.

### Authenticated Cart (requires Bearer token)

- Get My Cart (creates if missing; computes totals)
    - GET `/api/me/cart`

- Merge/Claim Guest Cart on Login
    - POST `/api/me/cart/merge`
    - Body: `{ "guestCartId":"cart-...", "strategy":"sum" | "replace" }`
    - If user has no cart → claim guest cart (keep id). Else merge items stock‑capped and delete guest cart.

- Coupons (user)
    - Apply: POST `/api/me/cart/apply-coupon` `{ "code": "SPRING25" }`
    - Remove: DELETE `/api/me/cart/coupon`

## Computation Rules

- Item writes clamp quantities to product `stock`.
- Write endpoints do not compute coupon totals; cart/read and coupon endpoints do.
- Coupon applicability:
    - Valid, not expired, not over max uses.
    - Assignment matches any of: customer, product, or category; `*` means all.
    - Discount applied on subtotal of matched items only.

## Coupons on Cart (Detailed)

This section documents the cart-scoped coupon APIs in detail for both guest and authenticated flows. These endpoints set or clear the coupon on the cart and return a recomputed `CartView` when appropriate.

- Base: `http://localhost:8080`
- Envelope: `{ data, meta, error }`
- Related: Public coupon validation/redeem endpoints are documented in `docs/api/public-coupons.md`. Applying a coupon to a cart does not increment usage; redemption is separate (typically at order placement).

### Guest Cart Coupon APIs

- Apply coupon
    - Method: `POST`
    - Path: `/api/carts/{cartId}/apply-coupon`
    - Auth: none
    - Body:
        - `{ "code": string }` (required)
    - Success: `200 OK`
    - Response: `{ data: CartView, meta: { message: "Coupon applied" }, error: null }`
    - Errors:
        - `400 BAD_REQUEST` — `Code is required` | `Coupon not applicable`
        - `404 NOT_FOUND` — `Cart not found` | `Coupon not found`
    - Notes:
        - Idempotent for the same code; re-applying replaces the same value without error.
        - Applying a different code replaces any existing coupon.

- Remove coupon
    - Method: `DELETE`
    - Path: `/api/carts/{cartId}/coupon`
    - Auth: none
    - Success: `200 OK`
    - Response: `{ data: CartView, meta: { message: "Coupon removed" }, error: null }`
    - Errors:
        - `404 NOT_FOUND` — `Cart not found`
    - Notes:
        - Idempotent; removing when none is applied results in a no-op with a consistent response.

### Authenticated Cart Coupon APIs

- Apply coupon (me)
    - Method: `POST`
    - Path: `/api/me/cart/apply-coupon`
    - Auth: Bearer token required
    - Body:
        - `{ "code": string }` (required)
    - Success: `200 OK`
    - Response: `{ data: CartView, meta: { message: "Coupon applied" }, error: null }`
    - Errors:
        - `400 BAD_REQUEST` — `Code is required` | `Coupon not applicable`
        - `401 UNAUTHORIZED` — `Login required` | `User not found`
        - `404 NOT_FOUND` — `Cart not found` | `Coupon not found`

- Remove coupon (me)
    - Method: `DELETE`
    - Path: `/api/me/cart/coupon`
    - Auth: Bearer token required
    - Success: `200 OK`
    - Response: `{ data: CartView, meta: { message: "Coupon removed" }, error: null }`
    - Errors:
        - `401 UNAUTHORIZED` — `Login required` | `User not found`
        - `404 NOT_FOUND` — `Cart not found`

### Response Shape: `CartView`

Fields returned by cart endpoints when computing coupon totals (read endpoints and coupon mutation endpoints compute totals):

- `id`: cart id (UUID)
- `userId`: present for authenticated carts
- `items`: array of `{ id, productId, name, price, discountedPrice, stock, quantity, lineTotal }`
- `totalQuantity`: aggregated quantity across items
- `subtotal`: sum of line totals at effective item prices
- `appliedCouponCode`: string or null
- `discountAmount`: number (0.00 when not applicable)
- `total`: `subtotal - discountAmount` (null on write endpoints unrelated to coupons)
- `updatedAt`: ISO timestamp

Note on write endpoints:
- Item write endpoints (add/update/remove/merge) return `appliedCouponCode = null`, `discountAmount = 0`, and `total = null`. Always re-fetch the cart page (`GET /api/carts/{cartId}` or `GET /api/me/cart`) for authoritative totals.

### Applicability Rules (Server Logic)

- Coupon must be active and not expired by date; must not exceed max uses.
- Assignments determine scope; if none exist, coupon applies to the entire cart.
- A coupon is applicable if any assignment matches:
    - `CUSTOMER` — matches current `userId` (authenticated only). `*` matches any logged-in user. Guest carts never satisfy `CUSTOMER` assignments.
    - `PRODUCT` — matches at least one product in the cart. `*` matches all products.
    - `CATEGORY` — matches at least one item whose product category matches. `*` matches all categories.
- Discount is computed only over the applicable subset subtotal:
    - `PERCENT` — `discount = applicableSubtotal * (discountValue / 100)`, capped to `applicableSubtotal`.
    - `FIXED` — `discount = discountValue`, capped to `applicableSubtotal`.

Automatic invalidation on read:
- If a stored `appliedCouponCode` is no longer applicable (e.g., item removal, assignment no longer matches, expiration/usage), reads will clear the coupon and persist that change so clients reflect the current state.

### Examples

Apply (guest)
```
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"code":"SPRING25"}' \
  http://localhost:8080/api/carts/<cartId>/apply-coupon
```

Remove (guest)
```
curl -s -X DELETE http://localhost:8080/api/carts/<cartId>/coupon
```

Apply (auth)
```
curl -s -X POST \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"code":"SPRING25"}' \
  http://localhost:8080/api/me/cart/apply-coupon
```

Remove (auth)
```
curl -s -X DELETE -H "Authorization: Bearer <TOKEN>" \
  http://localhost:8080/api/me/cart/coupon
```

## Frontend Integration

### Guest Lifecycle
1) On app start:
    - If no `localStorage.cartId`, `POST /api/carts {}` and store `data.cartId`.
2) Add/update/remove items using `/api/carts/{cartId}/items…` endpoints.
3) Render cart page using `GET /api/carts/{cartId}` for accurate totals and coupon info.
4) Apply/remove coupons with guest endpoints.
5) Checkout using guest checkout; if 409, clamp UI to `error.fields[productId]`, refresh and retry.

### Login Flow
1) User logs in and receives access token.
2) If a guest `cartId` exists, call `POST /api/me/cart/merge` with `{ guestCartId, strategy }` and bearer token.
3) On success, remove `localStorage.cartId` — the user’s cart is now server‑associated.
4) Use `/api/me/cart` for rendering and `/api/me/cart/*` for coupons.

### Adding Items While Authenticated
- You can keep using the guest item endpoints with the user’s server cart id, but recommended approach is to operate via `/api/me/cart` read + server cart id. After login, the cart id is fully server‑owned.

### Error Handling Patterns
- `OUT_OF_STOCK` on add/update/checkout: read `error.fields` (on checkout) or message, clamp UI quantity to available, and re‑fetch cart.
- `NOT_FOUND` cart/item/coupon: refresh cart id or cart state; for guests create a new cart if missing.
- `UNAUTHORIZED` on `/api/me/cart/**`: ensure Bearer token present and not expired.

## Implementation Checklist

- Token handling
    - JWT subject is `userId`; server uses it for `/api/me/cart/**`.
    - After login, always merge guest cart, then drop `localStorage.cartId`.

- Cart state
    - For guests, maintain `cartId` in localStorage; for authenticated, fetch `/api/me/cart`.
    - After any item write, re‑fetch the cart page endpoint for accurate totals.

- Coupons
    - Use guest coupon endpoints with guest `cartId`.
    - Use `/api/me/cart/*` coupon endpoints when authenticated.

## Example Requests

Create guest cart
```
curl -s -X POST http://localhost:8080/api/carts \
  -H "Content-Type: application/json" -d '{}'
```

Add item (guest)
```
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"productId":"prod-uuid","quantity":2}' \
  http://localhost:8080/api/carts/<cartId>/items
```

Cart page (guest)
```
curl -s http://localhost:8080/api/carts/<cartId>
```

Apply coupon (guest)
```
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"code":"SPRING25"}' \
  http://localhost:8080/api/carts/<cartId>/apply-coupon
```

Merge after login (auth)
```
curl -s -X POST \
  -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"guestCartId":"<cartId>","strategy":"sum"}' \
  http://localhost:8080/api/me/cart/merge
```

Get my cart (auth)
```
curl -s -H "Authorization: Bearer <TOKEN>" http://localhost:8080/api/me/cart
```

## Notes and Pitfalls

- If products change price or stock, server computations apply at read/check‑out time; always re‑fetch cart data after writes.
- When a coupon is no longer applicable, server clears it on read; front‑end should reflect that and notify the user.
- Duplicate clicks can be tamed by disabling buttons during request and re‑rendering from the returned cart.

## Recent Update

- Authenticated cart endpoints now resolve user using userId (JWT subject) instead of email. This ensures `/api/me/cart/**` works correctly with your current token format.
