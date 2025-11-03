# Admin Users API

Base URL: `http://localhost:8080`
Auth: Bearer token with role `ADMIN`. Send header: `Authorization: Bearer <accessToken>`

Envelope:
{ "data": any | null, "meta": object | null, "error": { "code", "message", "fields"? } | null }

---

## List users
- Method: `GET`
- Path: `/api/admin/users`
- Query (optional):
    - `role`: `ADMIN` or `CUSTOMER`
    - `search`: matches name or email (case-insensitive substring)
- Success: `200 OK`
- Data: `UserView[]`

`UserView` fields:
- `id`, `email`, `name`, `role` (ADMIN|CUSTOMER), `banned` (boolean),
- `phone`, `address`, `profileImageUrl`,
- `createdAt`, `updatedAt`

## Get user by id
- Method: `GET`
- Path: `/api/admin/users/{id}`
- Success: `200 OK` | `404 NOT_FOUND`

## Create user
- Method: `POST`
- Path: `/api/admin/users`
- Body:
```
{
  "email": "john@example.com",
  "name": "John Doe",
  "password": "secret123",
  "role": "ADMIN" | "CUSTOMER" (optional, default CUSTOMER),
  "phone": "+1 555 1234",
  "address": "...",
  "profileImageUrl": "https://...",
  "banned": false
}
```
- Success: `201 Created`, `meta.message = "User created"`
- Errors: `400 BAD_REQUEST` duplicate email; `422 VALIDATION_ERROR`

## Update user (partial)
- Method: `PATCH`
- Path: `/api/admin/users/{id}`
- Body (any subset):
```
{
  "name": "...",
  "phone": "+1 555 6789",
  "address": "...",
  "profileImageUrl": "...",
  "banned": true,
  "role": "ADMIN" | "CUSTOMER",
  "newPassword": "new-secret"   // if provided, password is reset
}
```
- Success: `200 OK`, `meta.message = "User updated"`
- Errors: `404 NOT_FOUND`, `422 VALIDATION_ERROR`

## Ban / Unban
- Method: `POST`
- Path: `/api/admin/users/{id}/ban`  ? sets `banned=true`
- Path: `/api/admin/users/{id}/unban` ? sets `banned=false`
- Success: `200 OK`, `data = { id, banned }`
- Errors: `404 NOT_FOUND`
## Promote / Demote
- Method: `POST`
- Path: `/api/admin/users/{id}/promote` ? sets `role=ADMIN`
- Path: `/api/admin/users/{id}/demote`  ? sets `role=CUSTOMER`
- Success: `200 OK`, `data = { id, role }`
- Errors: `404 NOT_FOUND`