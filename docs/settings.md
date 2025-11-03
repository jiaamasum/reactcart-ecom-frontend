# Store Settings API (Admin)

Base URL: `http://localhost:8080`

All endpoints below require admin authorization. In Swagger, click “Authorize”, paste the access token, and ensure your user has role ADMIN. All responses use the common envelope:

```
{
  "data": any | null,
  "meta": object | null,
  "error": { "code": string, "message": string, "fields": object | null } | null
}
```

Important notes

- A single row is maintained in table `store_settings` with id `settings-1`. If it does not exist, the backend creates it on first access.
- Currency: the frontend must send a 3‑letter ISO code (e.g., `USD`, `EUR`, `GBP`, `INR`). Even if users see symbols in the UI, your app must submit the ISO code to the API.

---

## Store Information

- Method: `GET`
- Path: `/api/admin/settings/store`
- Auth: Required (ADMIN)
- Success: `200 OK`
- Response `data`:
```
{
  "storeName": "ShopHub",
  "storeDescription": "Your trusted online marketplace",
  "storeEmail": "support@shophub.com",
  "storePhone": "+1 (555) 123-4567",
  "storeAddress": "123 Main Street, City, State 12345"
}
```

- Method: `PUT`
- Path: `/api/admin/settings/store`
- Auth: Required (ADMIN)
- Body:
```
{
  "storeName": string (1..200),
  "storeDescription": string (optional, up to ~5000),
  "storeEmail": string (email),
  "storePhone": string (~50),
  "storeAddress": string (~255)
}
```
- Success: `200 OK`, `meta.message = "Store settings updated"`
- Errors:
    - `401 UNAUTHORIZED` → `{ error: { code: "UNAUTHORIZED", message: "Authentication required" } }`
    - `403 FORBIDDEN` (non-admin)
    - `422 VALIDATION_ERROR` with field messages

---

## SEO Settings

- Method: `GET`
- Path: `/api/admin/settings/seo`
- Auth: Required (ADMIN)
- Success: `200 OK`
- Response:
```
{
  "metaTitle": "ShopHub - Premium E-commerce Platform",
  "metaDescription": "Shop premium products with secure checkout and fast shipping",
  "metaKeywords": "ecommerce, shopping, products, online store",
  "ogImageUrl": "https://example.com/og-image.jpg"
}
```

- Method: `PUT`
- Path: `/api/admin/settings/seo`
- Auth: Required (ADMIN)
- Body:
```
{
  "metaTitle": string (<=255),
  "metaDescription": string (<=~5000),
  "metaKeywords": string (<=512),
  "ogImageUrl": string URL (<=2048)
}
```
- Success: `200 OK`, `meta.message = "SEO settings updated"`
- Errors: same as Store Information

---

## Currency Settings

- Method: `GET`
- Path: `/api/admin/settings/currency`
- Auth: Required (ADMIN)
- Success: `200 OK`
- Response:
```
{ "defaultCurrency": "USD" }
```

- Method: `PUT`
- Path: `/api/admin/settings/currency`
- Auth: Required (ADMIN)
- Body:
```
{ "defaultCurrency": "USD" }
```
- Requirements:
    - `defaultCurrency` must be a 3‑letter ISO code (regex `^[A-Z]{3}$`).
    - Frontend: when a user selects a symbol (e.g., `$`), submit the corresponding ISO code (e.g., `USD`).
- Success: `200 OK`, `meta.message = "Currency settings updated"`
- Errors: same as Store Information

---

## Curl examples

- Get store info
```
curl -s -H "Authorization: Bearer <ADMIN_TOKEN>" \
  http://localhost:8080/api/admin/settings/store
```

- Update store info
```
curl -s -X PUT -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
        "storeName":"ShopHub",
        "storeDescription":"Your trusted online marketplace",
        "storeEmail":"support@shophub.com",
        "storePhone":"+1 (555) 123-4567",
        "storeAddress":"123 Main Street, City, State 12345"
      }' \
  http://localhost:8080/api/admin/settings/store
```

- Update SEO
```
curl -s -X PUT -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
        "metaTitle":"ShopHub - Premium E-commerce Platform",
        "metaDescription":"Shop premium products with secure checkout and fast shipping",
        "metaKeywords":"ecommerce, shopping, products, online store",
        "ogImageUrl":"https://example.com/og-image.jpg"
      }' \
  http://localhost:8080/api/admin/settings/seo
```

- Update currency (frontend must send ISO code)
```
curl -s -X PUT -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{ "defaultCurrency": "USD" }' \
  http://localhost:8080/api/admin/settings/currency
```

---

## Public Settings (for storefront)

- Method: `GET`
- Path: `/api/settings`
- Auth: None (public)
- Success: `200 OK`
- Response `data`:
```
{
  "storeName": "ShopHub",
  "storeDescription": "Your trusted online marketplace",
  "storeEmail": "support@shophub.com",
  "storePhone": "+1 (555) 123-4567",
  "storeAddress": "123 Main Street, City, State 12345",
  "metaTitle": "ShopHub - Premium E-commerce Platform",
  "metaDescription": "Shop premium products with secure checkout and fast shipping",
  "metaKeywords": "ecommerce, shopping, products, online store",
  "ogImageUrl": "https://example.com/og-image.jpg",
  "defaultCurrency": "USD"
}
```

Curl:
```
curl -s http://localhost:8080/api/settings
```

Notes:
- Use `defaultCurrency` across the storefront for price display. Admins manage it via `/api/admin/settings/currency`.
- The backend initializes defaults if no settings exist; you will always get a well-formed object.
