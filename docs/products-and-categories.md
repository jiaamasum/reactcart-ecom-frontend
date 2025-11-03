# Products and Categories API

Base URL: `http://localhost:8080`

All responses use the common envelope:

```
{
  "data": any | null,
  "meta": object | null,
  "error": { "code": string, "message": string, "fields": object | null } | null
}
```

Auth model

- Public endpoints do not require authorization and appear unlocked in Swagger.
- Admin endpoints require role `ADMIN` (use �Authorize� with an admin token in Swagger)..

ID format

- Products: `prod-1`, `prod-2`, ...
- Categories: `cat-1`, `cat-2`, ...

Price/currency

- Product payloads use numeric `price` and optional `discountedPrice` only. Currency is managed globally through Store Settings (see settings.md). Do not send currency in product requests.

Images

- `primaryImageUrl`: main image URL string.
- `images`: array of additional image URLs (strings). Uploading files is out of scope; send absolute or CDN URLs.

---

## Public: Products

### List products

- Method: `GET`
- Path: `/api/products`
- Auth: None
- Query params (optional):
    - `search`: substring match on name (case-insensitive)
    - `categoryId`: filter by category id `cat-*`
    - `inStockOnly`: `true` to return only products with `stock > 0`
- Success: `200 OK`
- Response `data`: `ProductSummary[]`
    - ProductSummary fields: `id`, `name`, `description`, `categoryId`, `categoryName`, `price`, `discountedPrice`, `discount`, `stock`, `primaryImageUrl`
```
{
  "id": "prod-1",
  "name": "USB-C Cable",
  "description": "Durable USB-C charging cable...",
  "categoryId": "cat-2",
  "categoryName": "Accessories",
  "price": 19.99,
  "discountedPrice": 14.99,
  "discount": 25,
  "stock": 200,
  "primaryImageUrl": "https://cdn.example.com/p/usb-c.jpg"
}
```

### Get product details

- Method: `GET`
- Path: `/api/products/{id}`
- Auth: None
- Success: `200 OK`
- Response `data`: `ProductDetail`
    - ProductDetail adds: `images` (array of URLs)
```
{
  "id": "prod-1",
  "name": "USB-C Cable",
  "description": "Durable USB-C charging cable...",
  "categoryId": "cat-2",
  "categoryName": "Accessories",
  "price": 19.99,
  "discountedPrice": 14.99,
  "discount": 25,
  "stock": 200,
  "primaryImageUrl": "https://cdn.example.com/p/usb-c.jpg",
  "images": [
    "https://cdn.example.com/p/usb-c-1.jpg",
    "https://cdn.example.com/p/usb-c-2.jpg"
  ]
}
```
- Errors:
    - `404 NOT_FOUND`: `"Product not found"`

---

## Admin: Products

### List products (admin)

- Method: `GET`
- Path: `/api/admin/products`
- Auth: ADMIN
- Success: `200 OK`
- Response `data`: `ProductSummary[]` (same shape as public list)

### Create product

- Method: `POST`
- Path: `/api/admin/products`
- Auth: ADMIN
- Body:
```
{
  "name": string (1..200),
  "description": string,
  "categoryId": "cat-1",
  "price": number (>0),
  "discountedPrice": number (>0, optional; must be < price when provided),
  "stock": integer (>=0),
  "primaryImageUrl": string (<=2048),
  "images": [string...]  // optional list of URLs
}
```
- Success: `201 Created`, `meta.message = "Product created"`
- Response `data`: `ProductDetail`
- Errors:
    - `400 BAD_REQUEST` `"Category not found"`
    - `400 BAD_REQUEST` `"Discounted price must be less than price"`
    - `422 VALIDATION_ERROR` for invalid fields

### Update product (replace)

- Method: `PUT`
- Path: `/api/admin/products/{id}`
- Auth: ADMIN
- Body: same fields as Create
- Success: `200 OK`, `meta.message = "Product updated"`
- Errors: same as Create; plus `404 NOT_FOUND` `"Product not found"`

### Update product (partial)

- Method: `PATCH`
- Path: `/api/admin/products/{id}`
- Auth: ADMIN
- Body: any subset of Create fields
- Success: `200 OK`, `meta.message = "Product updated"`
- Errors: same as above

### Delete product

- Method: `DELETE`
- Path: `/api/admin/products/{id}`
- Auth: ADMIN
- Success: `200 OK`, `meta.message = "Product deleted"`
- Errors: `404 NOT_FOUND` `"Product not found"`

Notes

- `discount` is computed server-side from `price` and `discountedPrice`. If `discountedPrice` is omitted, `discount` is `0`.

---

## Public: Categories

### List categories

- Method: `GET`
- Path: `/api/categories`
- Auth: None
- Success: `200 OK`
- Response `data`:
```
[{ "id": "cat-1", "name": "Electronics", "slug": "electronics" }]
```

---

## Admin: Categories

### List categories with product counts

- Method: `GET`
- Path: `/api/admin/categories`
- Auth: ADMIN
- Success: `200 OK`
- Response `data` (array of maps):
```
[{ "id": "cat-1", "name": "Electronics", "slug": "electronics", "productsCount": 6 }]
```

### Create category (slug auto-generate)

- Method: `POST`
- Path: `/api/admin/categories`
- Auth: ADMIN
- Body:
```
{ "name": "Accessories" }
```
- Behavior:
    - Slug is generated from name; `-2`, `-3`, ... appended when slug already exists.
- Success: `201 Created`, `meta.message = "Category created"`
- Errors:
    - `400 BAD_REQUEST` `"Slug already exists"` (rare; triggered only if a race occurs)
    - `422 VALIDATION_ERROR` if name is invalid

### Update category (partial)

- Method: `PATCH`
- Path: `/api/admin/categories/{id}`
- Auth: ADMIN
- Body:
```
{ "name": "Audio" }  // or { "slug": "audio" }
```
- Slug uniqueness validated when supplied
- Success: `200 OK`, `meta.message = "Category updated"`
- Errors:
    - `400 BAD_REQUEST` `"Slug already exists"`
    - `404 NOT_FOUND` `"Category not found"`
    - `422 VALIDATION_ERROR` for invalid inputs

### Delete category

- Method: `DELETE`
- Path: `/api/admin/categories/{id}`
- Auth: ADMIN
- Success: `200 OK`, `meta.message = "Category deleted"`
- Errors: `404 NOT_FOUND` `"Category not found"`

---

## Curl examples

- Public products
```
curl -s http://localhost:8080/api/products
```

- Public product details
```
curl -s http://localhost:8080/api/products/prod-1
```

- Admin create product
```
curl -s -X POST -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"USB-C Cable",
    "description":"Durable USB-C cable",
    "categoryId":"cat-2",
    "price":19.99,
    "discountedPrice":14.99,
    "stock":200,
    "primaryImageUrl":"https://cdn.example.com/p/usb-c.jpg",
    "images":["https://cdn.example.com/p/usb-c-1.jpg"]
  }' \
  http://localhost:8080/api/admin/products
```

- Admin list categories with counts
```
curl -s -H "Authorization: Bearer <ADMIN_TOKEN>" \
  http://localhost:8080/api/admin/categories
```






