# Orders API (Guest + Auth)

Base URL: `http://localhost:8080`
Envelope: `{ data, meta, error }`.

Statuses
- `PENDING` (default)
- `CONFIRMED`
- `IN_PROCESS`
- `DELIVERED`
- `CANCELLED`

Payment methods
- `COD`
- `CARD` (cardNumber: exactly 16 digits; expiry: `MM/YY` and must be in the future; CVV: any input accepted — not validated)

## Create Order (Guest)
- POST `/api/orders`
- Auth: none
- Body
```
{
  "cartId": "<uuid>",
  "name": "Masum Jia",
  "email": "masumjiaa@gmail.com",
  "phone": "+8801...",
  "address": "Street, Area",
  "city": "Dhaka",
  "postalCode": "1205",
  "paymentMethod": "COD" | "CARD",
  "card": { "number": "4111 1111 1111 1111", "expiry": "12/28", "cvv": "123" } // required for CARD
}
```
- Success: `201 Created`
- Returns: `{ data: OrderView, meta.message: "Order created" }`
- Errors: `404 NOT_FOUND` (cart not found), `400 BAD_REQUEST` (empty cart, invalid payment/card), `409 OUT_OF_STOCK` (fields per product id remaining)

## Create Order (Authenticated)
- POST `/api/me/orders`
- Auth: Bearer token
- Body
```
{
  "name": "Checkout Name",          // captured on order even if logged-in
  "email": "checkout@example.com",  // captured on order even if logged-in
  "phone": "+8801...",              // optional; captured on order
  "address": "Street, Area",
  "city": "Dhaka",
  "postalCode": "1205",
  "paymentMethod": "COD"|"CARD",
  "card": { ... }                    // for CARD
}
```
- Behavior: userId is linked to the order, and the provided name/email/phone are stored on the order (`guestName`, `guestEmail`, `guestPhone`) to reflect the checkout data.
- Cart is inferred from the authenticated user.
- Responses/Errors same as guest.

## Get Order
- GET `/api/orders/{id}`
- Auth: guest orders are public by id; for user-linked orders, only the owner can view.
- Returns `{ data: OrderView }` or 404/403.

## Get Order By Number
- GET `/api/orders/number/{orderNumber}`
- Auth: same visibility as above.
- Returns `{ data: OrderView }`.

## List My Orders
- GET `/api/me/orders`
- Auth: Bearer token
- Returns `{ data: OrderView[] }`

## My Order Stats
- GET `/api/me/orders/stats`
- Auth: Bearer token
- Returns `{ data: { totalOrders, completedOrders, totalSpent } }`
- Definitions:
  - `totalOrders`: all orders placed by the user
  - `completedOrders`: orders with status `DELIVERED`
  - `totalSpent`: sum of `total` for `DELIVERED` orders

## Cancel My Order
- PATCH `/api/me/orders/{id}/cancel`
- Also accepts: POST `/api/me/orders/{id}/cancel` (for clients that cannot send PATCH)
- Auth: Bearer token
- Rules:
  - Only orders placed by the current user.
  - Must be within 12 hours of `createdAt`.
  - Not allowed if already `CANCELLED` or `DELIVERED`.
- Success: `200 OK`, `{ data: OrderView, meta.message: "Order cancelled" }`
- Errors:
  - `401 UNAUTHORIZED` — missing/invalid token
  - `403 FORBIDDEN` — order not owned by user
  - `404 NOT_FOUND` — unknown order
  - `400 BAD_REQUEST` — `Order already cancelled` | `Delivered orders cannot be cancelled` | `CANCEL_WINDOW_EXPIRED`

Notes:
- CORS is enabled for all origins/methods/headers; browsers can call this endpoint cross-origin without additional preflight setup.
- Body: not required; server ignores body if sent. Sending `{}` with `Content-Type: application/json` is OK.
- Example:
```
curl -X PATCH -H "Authorization: Bearer <TOKEN>" \
  http://localhost:8080/api/me/orders/<id>/cancel
```

## Admin: Update Status
- PATCH `/api/admin/orders/{id}/status`
- Auth: ADMIN
- Body: `{ "status": "CONFIRMED" | "IN_PROCESS" | "DELIVERED" | "CANCELLED" }`
- Returns `{ data: { id, status } }`

## OrderView
```
{
  id: string,
  orderNumber: number,
  orderNumberFormatted: string,  // e.g. "001"
  userId: string|null,
  status: "PENDING"|"CONFIRMED"|"IN_PROCESS"|"DELIVERED"|"CANCELLED",
  paymentMethod: "COD"|"CARD",
  shippingAddress: string,
  guestName: string|null,
  guestEmail: string|null,
  guestPhone: string|null,
  subtotal: number,
  discount: number,
  total: number,
  couponCode: string|null,
  createdAt: string,
  items: [ { productId, name, price, quantity } ],
  coupon: { code: string|null, discountAmount: number }
}
```

## Flow and Notes
- Always make sure the cart page has synced totals via the cart summary APIs before placing an order; the server uses the cart’s persisted `subtotal/discount/total` snapshot.
- When the order is created, stock is decremented atomically; if any item fails, the whole operation is aborted and available quantities are reported per product.
- On success, the server snapshots line items with effective price at order time and clears the cart (items removed, coupon cleared, totals reset to 0 on server).
- Frontend should clear its cart state after a successful order:
  - Guest: remove `localStorage.cartId` and clear client cart state; next visit, call `POST /api/carts` to bootstrap a new cart.
  - Auth: clear client cart state and call `GET /api/me/cart` to load the now-empty server cart.
- Card payments are not charged; only format checks above are enforced.

### Frontend: Cancel Order UX
- Show Cancel button on order detail when:
  - User is owner AND `status` in `PENDING | CONFIRMED | IN_PROCESS` AND `now - createdAt < 12 hours`.
- On click: `PATCH /api/me/orders/{id}/cancel` with Bearer token.
- If `200`, update status in UI to `CANCELLED` and surface `meta.message`.
- If `400 CANCEL_WINDOW_EXPIRED`, disable the button and show explanation.
