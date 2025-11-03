# Public Coupons API (No Auth)

Base URL: `http://localhost:8080`

All responses use the envelope:
`{ data: any|null, meta: object|null, error: { code, message, fields? }|null }`

Authentication: Not required. These endpoints are public and can be called by both guests and logged-in users.

## Endpoints

### Validate by Code
- GET `/api/coupons/{code}/validate`
- Query params (all optional):
    - `customerId` — user id if known; omit for guests
    - `productIds` — repeatable; example: `?productIds=prod-1&productIds=prod-2`
    - `categoryIds` — repeatable; example: `?categoryIds=cat-1`
    - `subtotal` — numeric cart subtotal to preview `discountAmount`
- Success: `200 OK`
- Data shape:
```
{
  code: string,
  valid: boolean,
  reason: string|null,
  discountType: "PERCENT"|"FIXED",
  discount: number,
  discountAmount: number,          // present when subtotal provided
  appliedScope: "GLOBAL"|"CUSTOMER"|"PRODUCT"|"CATEGORY"|"NONE",
  expiryDate: string|null,
  maxUses: number|null,
  usedCount: number|null
}
```
- Rules:
    - Must be active, not expired by date, and not exceed max uses.
    - If assignments exist, any of customer/product/category must match; `*` means all.
    - If no assignments, scope is `GLOBAL` (applies to full cart).

### Redeem (Increment Usage)
- POST `/api/coupons/{code}/redeem`
- Body:
```
{
  "customerId": "<user-id>",    // required when coupon is assigned to a specific customer
  "productIds": ["prod-1"],     // required when coupon is assigned to products (unless assignment is "*")
  "categoryIds": ["cat-1"]      // required when coupon is assigned to categories (unless assignment is "*")
}
```
- Behavior: validates like `validate` (subtotal not needed) and increments usage if still valid and under limit.
- Success: `200 OK`, `{ data: { code, usedCount }, meta.message: "Coupon redeemed" }`
- Errors: `404 NOT_FOUND`, `400 BAD_REQUEST` (reason or usage limit)

## Examples

Validate
```
curl -s "http://localhost:8080/api/coupons/SPRING25/validate?productIds=prod-1&subtotal=100"
```

Redeem
```
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"orderId":"ord-1","customerId":"user-1","productIds":["prod-1"]}' \
  http://localhost:8080/api/coupons/SPRING25/redeem
```

## Notes
- Use `validate` to preview discount alongside cart totals. Use `redeem` when an order is placed, or perform the increment inside your order creation transaction and keep `validate` only.
- Assignments are configured via Admin Coupons APIs and control the `appliedScope`.
