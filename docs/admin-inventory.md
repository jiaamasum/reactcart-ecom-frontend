# Admin Inventory API

Base URL: `http://localhost:8080`

Envelope:
```
{ "data": any | null, "meta": object | null, "error": { "code": string, "message": string, "fields": object | null } | null }
```

## Search Inventory

- Method: `GET`
- Path: `/api/admin/products/search`
- Auth: ADMIN (Bearer token)
- Query params (optional):
  - `search`: substring match on name (case-insensitive)
  - `categoryId`: filter by category id `cat-*`
  - `inStockOnly`: `true` to return only products with `stock > 0`
  - `sort`: repeatable, format `field,dir` (e.g., `sort=updatedAt,desc`)
  - `limit`: limit number of returned rows (e.g., `limit=500`)
- Success: `200 OK`
- Response `data`: `ProductSummary[]`

## Update Product Stock

- Method: `PATCH`
- Path: `/api/admin/products/{id}/stock`
- Auth: ADMIN (Bearer token)
- Body:
```
{ "stock": 120 }
```
- Success: `200 OK`, `meta.message = "Stock updated"`
- Errors:
  - `404 NOT_FOUND` `"Product not found"`
