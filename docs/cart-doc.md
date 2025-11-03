# Cart API (Guest + Auth)

Base URL: `http://localhost:8080`

All responses use the common envelope: `{ data, meta, error }`.
- Success: `data` populated, `error = null`.
- Failure: `error = { code, message, fields? }`, `data = null`.

## Data Models

- ItemView
```
{
  id: string,                // cart item id (uuid)
  productId: string,         // product uuid
  name: string,
  price: number,             // full price
  discountedPrice: number|null,
  stock: number,             // current product stock
  quantity: number,          // clamped to stock
  lineTotal: number          // (discountedPrice || price) * quantity
}
```

- CartView
```
{
  id: string,                // cart id (e.g., cart-uuid)
  userId: string|null,       // present for logged-in carts
  items: ItemView[],
  totalQuantity: number,     // sum of quantities
  subtotal: number,          // sum of lineTotals
  appliedCouponCode: string|null,
  discountAmount: number,    // 0 on item writes; computed on cart page endpoints
  total: number|null,        // null on item writes; computed on cart page endpoints
  updatedAt: ISO string
}
```

## Authorization

- Guest: `/api/carts/**` endpoints are public (no Authorization header).
- Logged-in: `/api/me/cart/**` require Bearer token. In Swagger, these show a lock; use `bearerAuth`.

## Guest Flow

1) Create/Bootstrap (idempotent)
- POST `/api/carts`
- Body: `{}` (JSON)
- Behavior:
    - If a valid `cartId` is provided via cookie or query (e.g., `?cartId=`), and exists → 200 `{ data: { cartId } }`
    - Otherwise → 201 `{ data: { cartId } }`
- Store `data.cartId` in `localStorage.cartId`.

2) Add Item (clamped to stock)
- POST `/api/carts/{cartId}/items`
- Body (accepts any of):
```
{ "productId": "prod-uuid", "quantity": 2 }
{ "productId": 123, "quantity": 2 }
{ "productId": { "id": "prod-uuid" }, "quantity": 2 } // also supports value|key
```
- Behavior:
    - If item exists → increments quantity
    - Clamps quantity to stock; if stock = 0 → 400 OUT_OF_STOCK
- Success: `200 { data: CartView }`
- Notes: response omits coupon/total for item writes:
    - `appliedCouponCode = null`, `discountAmount = 0`, `total = null`

3) Update Quantity (0 deletes)
- PATCH `/api/carts/{cartId}/items/{productId}`
- Body: `{ "quantity": <number> }`
- Behavior:
    - `quantity <= 0` → removes the item
    - Else clamps to stock
- Success: `200 { data: CartView }`
- Notes: `appliedCouponCode = null`, `discountAmount = 0`, `total = null`

4) Remove Item
- DELETE `/api/carts/{cartId}/items/{productId}`
- Success: `200 { data: CartView }`

5) Clear Cart
- DELETE `/api/carts/{cartId}`
- Success: `200 { data: CartView }` (items=[])

6) Cart Page (compute totals)
- GET `/api/carts/{cartId}`
- Success: `200 { data: CartView }` with `appliedCouponCode`, `discountAmount`, `total` computed.

7) Coupons (guest)
- Apply: POST `/api/carts/{cartId}/apply-coupon` `{ "code": "SPRING25" }`
- Remove: DELETE `/api/carts/{cartId}/coupon`
- Success: `200 { data: CartView, meta.message: "Coupon applied|removed" }`

## Authenticated Flow

1) Get My Cart (creates if missing; computes totals)
- GET `/api/me/cart`
- Success: `200 { data: CartView }`

2) Merge/Claim Guest Cart on Login
- POST `/api/me/cart/merge`
- Body: `{ "guestCartId": "cart-...", "strategy": "sum" | "replace" }`
- Behavior:
    - If user has no cart → claim guest cart (set `user_id`), keep cart id. `meta.message = "Cart claimed"`.
    - Else → merge items into user cart (stock-capped), delete guest cart. `meta.message = "Cart merged"`.
- Success: `200 { data: CartView }`

3) Coupons (user)
- Apply: POST `/api/me/cart/apply-coupon` `{ "code": "SPRING25" }`
- Remove: DELETE `/api/me/cart/coupon`
- Success: `200 { data: CartView }` (with totals)

## Checkout (Stock Reservation)

- POST `/api/carts/{cartId}/checkout`
- Behavior:
    - Attempts to decrement stock per line atomically: `UPDATE products SET stock = stock - qty WHERE id = ? AND stock >= qty`
    - If any item insufficient → rollback all decrements
- Success: `200 { data: { cartId }, meta: { message: "Stock reserved" } }`
- Failure: `409 { error: { code: "OUT_OF_STOCK", fields: { "<productId>": "<available>" } } }`
- UI pattern: read `error.fields`, clamp UI to `available`, refresh cart, retry

## Errors (Common)

- `400 BAD_REQUEST` — invalid body, missing productId, product not found, coupon not applicable
- `404 NOT_FOUND` — cart/item/coupon not found
- `401 UNAUTHORIZED` — calling `/api/me/cart/**` without bearer token
- `409 OUT_OF_STOCK` — add/update when stock=0 or checkout conflict (see `error.fields`)
- `500 INTERNAL_ERROR` — unexpected; share first log line for fast fix

## Integration Guide (Frontend)

- Guest
    - On load: if `localStorage.cartId` missing → `POST /api/carts {}` and save `cartId`.
    - Item writes: call `/api/carts/{cartId}/items...` then refresh cart state.
    - Cart page: `GET /api/carts/{cartId}` (shows subtotal, coupon, total).
    - Coupons: use guest coupon endpoints.

- Login
    - `POST /api/me/cart/merge { guestCartId, strategy }` with bearer token.
    - Clear `localStorage.cartId`; use `/api/me/cart` going forward.

- Logged-in
    - Render with `GET /api/me/cart`.
    - Apply/remove coupons on `/api/me/cart` endpoints.
    - Checkout with `POST /api/carts/{cartId}/checkout`; handle 409 via `error.fields`.

## Notes / Server Guarantees

- Quantities are stock-capped on all writes.
- New/claimed carts initialize server-side snapshot totals (subtotal, discount_amount, total) to 0.00.
- Item write responses intentionally omit coupon/total; cart page and coupon endpoints compute them.
- Guest cart creation is idempotent: returns 200 with existing id (from cookie/query) or 201 with new id.

## Examples (curl)

- Create guest cart
```
curl -s -X POST http://localhost:8080/api/carts \
  -H "Content-Type: application/json" -d '{}'
```

- Add item (guest)
```
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"productId":"prod-uuid","quantity":2}' \
  http://localhost:8080/api/carts/<cartId>/items
```

- Update quantity (guest)
```
curl -s -X PATCH -H "Content-Type: application/json" \
  -d '{"quantity":5}' \
  http://localhost:8080/api/carts/<cartId>/items/<prodId>
```

- Cart page (guest)
```
curl -s http://localhost:8080/api/carts/<cartId>
```

- Apply coupon (guest)
```
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"code":"SPRING25"}' \
  http://localhost:8080/api/carts/<cartId>/apply-coupon
```

- Merge after login (auth)
```
curl -s -X POST -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
  -d '{"guestCartId":"<cartId>","strategy":"sum"}' \
  http://localhost:8080/api/me/cart/merge
```

- Checkout
```
curl -s -X POST http://localhost:8080/api/carts/<cartId>/checkout
```

