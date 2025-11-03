# Admin Orders API

Base URL: `http://localhost:8080`
Envelope: `{ data, meta, error }`.
Auth: All endpoints require `ROLE_ADMIN` (already enforced for `/api/admin/**`).

## Endpoints

- List Orders (with filters)
    - GET `/api/admin/orders`
    - Query params (all optional):
        - `status`: `ALL|PENDING|CONFIRMED|IN_PROCESS|DELIVERED|CANCELLED` (default ALL)
        - `search`: matches guestName, guestEmail, couponCode, userId; numeric matches `orderNumber`
        - `minTotal`, `maxTotal`: numeric filters
        - `page` (default 0), `size` (default 20)
        - `sort` (default `createdAt,DESC`) — format `field,ASC|DESC`
    - Returns: `{ data: OrderView[], meta: { total, page, size, totalPages } }`

- Get Order Details
    - GET `/api/admin/orders/{id}`
    - Returns: `{ data: OrderView }`

- Update Status
    - PATCH `/api/admin/orders/{id}/status`
    - Body: `{ "status": "PENDING"|"CONFIRMED"|"IN_PROCESS"|"DELIVERED"|"CANCELLED" }`
    - Returns: `{ data: { id, status } }`

- Delete Order
    - DELETE `/api/admin/orders/{id}`
    - Returns: `{ data: { id }, meta.message: "Order deleted" }`

## OrderView
```
{
  id: string,
  orderNumber: number,
  orderNumberFormatted: string,  // e.g., "001"
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

## Frontend Guidance

- Orders List View
    - Columns: `orderNumberFormatted`, `createdAt`, `status`, `paymentMethod`, `total`, `customer` (guestName/email or userId), `couponCode`.
    - Row click navigates to details.
    - Optional filters: status filter, text search by `orderNumber` or `couponCode`.

- Order Detail View
    - Show summary: `orderNumberFormatted`, `status`, `createdAt`, `paymentMethod`.
    - Customer: `guestName`, `guestEmail`, `guestPhone` or user id.
    - Shipping address.
    - Items table: `name`, `price`, `quantity`, line total (`price * quantity`).
    - Totals: `subtotal`, `coupon.discountAmount` (or `discount`), `total`.
    - Coupon badge: `coupon.code`.

- Status Management
    - Allow transition to any of: `PENDING`, `CONFIRMED`, `IN_PROCESS`, `DELIVERED`, `CANCELLED` via PATCH `/api/admin/orders/{id}/status`.
    - After update, refresh details or optimistically update status from response.

- Delete Order
    - DELETE `/api/admin/orders/{id}`; show confirm modal.
    - Note: deleting an order does not restock inventory (by design). If you need restock, coordinate a separate flow.

## Examples

List orders
```
curl -s -H "Authorization: Bearer <ADMIN_TOKEN>" \
  http://localhost:8080/api/admin/orders
```

Update status
```
curl -s -X PATCH -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" \
  -d '{"status":"CONFIRMED"}' \
  http://localhost:8080/api/admin/orders/<id>/status
```

Delete order
```
curl -s -X DELETE -H "Authorization: Bearer <ADMIN_TOKEN>" \
  http://localhost:8080/api/admin/orders/<id>
```
