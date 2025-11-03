# Cart Summary Sync APIs (Guest + Auth)

Purpose: keep the canonical cart fields `coupon_code`, `subtotal`, `discount_amount`, and `total` up-to-date on the server and load them from the server in the cart page for both guests and logged-in users.

- Base URL: `http://localhost:8080`
- Envelope: `{ data, meta, error }`

Key points
- Totals are always computed server-side based on current products, quantities, and coupon rules. The server persists `subtotal`, `discount_amount`, and `total` snapshots on each compute.
- PATCH endpoints optionally apply/remove a coupon via `code` and always recompute and persist the totals.
- GET endpoints return an authoritative `CartView` for rendering the cart page.

## Endpoints

### Guest

- Sync summary (apply/remove coupon, recompute or accept client snapshot)
  - `PATCH /api/carts/{cartId}/summary`
  - Auth: none
  - Body (optional):
```
{
  "code": "SPRING25",          // optional; omit or set to null/empty to remove
  "couponCode": "SPRING25",    // alias for code
  "subtotal": 123.45,           // optional; when provided, server persists these snapshot values
  "discountAmount": 12.34,      // optional
  "total": 111.11               // optional
}
```
  - Success: `200 OK`, `{ data: CartView, meta.message: "Summary synced" | "Summary synced (client)" }`
  - Errors: `404 NOT_FOUND` (cart/coupon), `400 BAD_REQUEST` (coupon not applicable)

- Get cart for rendering
  - `GET /api/carts/{cartId}`
  - Success: `200 OK`, `{ data: CartView }`

### Authenticated

- Sync summary (apply/remove coupon, recompute or accept client snapshot)
  - `PATCH /api/me/cart/summary`
  - Auth: Bearer token
  - Body (optional): same as guest
  - Success: `200 OK`, `{ data: CartView, meta.message: "Summary synced" | "Summary synced (client)" }`
  - Errors: `401 UNAUTHORIZED` (login required/user not found), `404 NOT_FOUND` (cart/coupon), `400 BAD_REQUEST` (coupon not applicable)

- Get cart for rendering
  - `GET /api/me/cart`
  - Auth: Bearer token

## Response Shape: `CartView`

```
{
  id: string,
  userId: string|null,
  items: [
    { id, productId, name, price, discountedPrice, stock, quantity, lineTotal }
  ],
  totalQuantity: number,
  subtotal: number,
  appliedCouponCode: string|null,
  discountAmount: number,
  total: number,
  updatedAt: string
}
```

Notes
- Item write endpoints now recompute and persist totals and return computed totals in the response, so the cart page can re-render immediately.
- The summary PATCH endpoints accept numeric snapshots. When `subtotal`, `discountAmount`, or `total` are provided, the server stores those values and responds using the stored snapshot. If not provided, the server computes totals and persists them.
- Reads will automatically clear a previously applied coupon if it is no longer applicable (e.g., items removed, expiration). The server persists this change.

## Frontend Implementation Guide

Guest flow
1) Ensure a guest cart exists (create via `POST /api/carts` if needed) and store `cartId` in `localStorage`.
2) On cart page load:
   - Call `PATCH /api/carts/{cartId}/summary` with the current coupon code input if present, or without a body to just recompute.
   - Render the returned `CartView` fields: `subtotal`, `discountAmount`, `total`, `appliedCouponCode`.
3) On coupon input change:
   - Call `PATCH /api/carts/{cartId}/summary` with `{ code }` to apply or with `{ code: null }` to remove.
   - Update UI from the returned `CartView`.
4) On item quantity changes/removals:
   - Perform the item write.
   - Then call `GET /api/carts/{cartId}` (or `PATCH /summary` without body) to refresh totals.

Authenticated flow
1) On login, merge any guest cart via `POST /api/me/cart/merge`.
2) On cart page load:
   - Call `PATCH /api/me/cart/summary` with the current coupon code input if present, or without a body to recompute.
   - Render from the returned `CartView`.
3) On coupon changes: call `PATCH /api/me/cart/summary` as above and update UI.
4) On item changes: perform the write, then call `GET /api/me/cart` (or `PATCH /summary` without body) to refresh totals.

## Examples

Guest apply and sync
```
curl -s -X PATCH -H "Content-Type: application/json" \
  -d '{"code":"SPRING25"}' \
  http://localhost:8080/api/carts/<cartId>/summary
```

Guest recompute (no coupon change)
```
curl -s -X PATCH http://localhost:8080/api/carts/<cartId>/summary
```

Auth apply and sync
```
curl -s -X PATCH -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"code":"SPRING25"}' \
  http://localhost:8080/api/me/cart/summary
```

Auth recompute (no coupon change)
```
curl -s -X PATCH -H "Authorization: Bearer <TOKEN>" \
  http://localhost:8080/api/me/cart/summary
```

## Rationale

- Frontend no longer calculates money; it only displays server-returned values.
- PATCH `summary` provides a single integration point to both apply/remove coupons and refresh totals in one round-trip, minimizing UI logic and ensuring DB snapshots stay current.
