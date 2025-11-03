# Coupons (Admin)

Base URL: `http://localhost:8080`

Envelope:
```
{ "data": any | null, "meta": object | null, "error": { "code": string, "message": string, "fields": object | null } | null }
```

## Summary Counts
- GET `/api/admin/coupons/summary`
- Returns: `{ total, active, expired }`

## List Coupons
- GET `/api/admin/coupons`
- Query:
    - `search` (code contains)
    - `sort` repeatable param: `field,dir` (e.g., `sort=updatedAt,desc`)
    - `limit` optional integer to cap results
- Data: `CouponView[]`

`CouponView` fields:
```
{
  id, code,
  discountType: "PERCENT" | "FIXED",
  discount: number,
  expiryDate: ISO datetime | null,
  maxUses: number | null,
  usedCount: number,
  active: boolean,
  productIds: string[],
  categoryIds: string[],
  customerIds: string[],
  createdAt, updatedAt
}
```

## Create Coupon
- POST `/api/admin/coupons`
- Body:
```
{
  "code": "SPRING25",
  "discountType": "PERCENT",
  "discount": 25,
  "expiryDate": "2025-12-31T23:59:59",          // accepts: YYYY-MM-DDTHH:mm:ss, YYYY-MM-DD, ISO offset (Z / +hh:mm), or epoch millis
  "maxUses": 500,
  "active": true,
  "global": true,                           // optional; true = applies to all products
  "productIds": ["prod-1", "prod-2"],          // or objects: [{"id":"prod-1"}], numbers are also accepted
  "categoryIds": ["cat-3"],                       // send exactly one of these three lists
  "customerIds": ["<user-id>"]
}
```
- Rules:
    - `PERCENT`: `0 < discount <= 100`
    - `FIXED`: `discount > 0`
- Assignments/global:
    - If `global=true`, do not send any of the three lists — coupon applies to all products.
    - Otherwise, provide at most one of `productIds`, `categoryIds`, or `customerIds`. If none are provided, it is also treated as GLOBAL (all products) for backward compatibility.
    - To target ALL within a single type explicitly, you can pass a single item "*" in that list, e.g. `productIds: ["*"]`.
- Success: `201 Created`, `meta.message = "Coupon created"`
- Errors: `400 Code already exists`, `400 Invalid discount value for type`

## Update Coupon (Partial)
- PATCH `/api/admin/coupons/{id}`
- Body: any subset of create fields. If `productIds`/`categoryIds`/`customerIds` are supplied, they replace existing assignments entirely.
- Assignments: same rule as create — supply at most one of the three arrays. None means GLOBAL (all products). You can use a single "*" to target all of that type. Supplying more than one will be rejected.
- Success: `200 OK`, `meta.message = "Coupon updated"`
- Errors: `404 Coupon not found`, `400 Code already exists`, `400 Invalid discount value for type`

## Get Coupon Details
- GET `/api/admin/coupons/{id}`
- Returns `CouponView`

## Delete Coupon
- DELETE `/api/admin/coupons/{id}`
- Success: `200 OK`, `meta.message = "Coupon deleted"`

## Activate / Deactivate
- POST `/api/admin/coupons/{id}/activate`
- POST `/api/admin/coupons/{id}/deactivate`
- Returns updated `CouponView`. Use to toggle availability without deleting.

## Related Lookups
- Customers: `GET /api/admin/users?role=CUSTOMER&search=...`
- Products: `GET /api/admin/products/search?search=...&page=0&size=20`
- Categories: `GET /api/admin/categories`

---

# SQL (add/align tables)

DDL-auto is disabled; apply these SQL statements in MySQL:

```
CREATE TABLE IF NOT EXISTS coupons (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,
  discount_type VARCHAR(20) NOT NULL,
  discount DECIMAL(12,2) NOT NULL,
  expiry_date DATETIME NULL,
  max_uses INT NULL,
  used_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

-- Optional: if the existing coupons table already has assigned_type/assigned_id columns, keep them; they are unused.

CREATE TABLE IF NOT EXISTS coupon_assignments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  coupon_id VARCHAR(64) NOT NULL,
  assigned_type VARCHAR(20) NOT NULL, -- PRODUCT | CATEGORY | CUSTOMER
  assigned_id VARCHAR(64) NOT NULL,
  CONSTRAINT fk_coupon_assignments_coupon FOREIGN KEY (coupon_id)
    REFERENCES coupons(id) ON DELETE CASCADE
);

CREATE INDEX idx_coupon_assignments_coupon ON coupon_assignments(coupon_id);
CREATE INDEX idx_coupon_assignments_type_id ON coupon_assignments(assigned_type, assigned_id);
```

If you already have a `coupons` table similar to the screenshot, align it with:

```
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) NOT NULL DEFAULT 'PERCENT';
ALTER TABLE coupons MODIFY COLUMN discount DECIMAL(12,2) NOT NULL;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS updated_at DATETIME NULL;
ALTER TABLE coupons ADD UNIQUE KEY uq_coupons_code (code);

-- Assignment rows should live in coupon_assignments (created above). Existing assigned_type/assigned_id in coupons can remain unused.
```
