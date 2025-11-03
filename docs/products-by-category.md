# Products By Category (Public)

Base URL: `http://localhost:8080`
Auth: None (public).

Envelope:
{ "data": any | null, "meta": object | null, "error": { "code", "message", "fields"? } | null }

---

## List products by category ID
- Method: `GET`
- Path: `/api/categories/{categoryId}/products`
- Query (optional):
  - `search`: substring match on name (case-insensitive)
  - `inStockOnly`: `true` to include only products with `stock > 0`
- Success: `200 OK`
- Data: `ProductSummary[]` (fields `id,name,description,categoryId,categoryName,price,discountedPrice,discount,stock,primaryImageUrl`)
- Errors: `404 NOT_FOUND` when category does not exist

## List products by category slug
- Method: `GET`
- Path: `/api/categories/slug/{slug}/products`
- Same query params, response, and errors as above.

Examples

GET http://localhost:8080/api/categories/cat-1/products?inStockOnly=true
GET http://localhost:8080/api/categories/slug/electronics/products?search=headphones