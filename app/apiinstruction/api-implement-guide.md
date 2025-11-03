# Auth and User Details API

Base URL: `http://localhost:8080`

All responses follow the envelope:

```
{
  "data": any | null,
  "meta": object | null,
  "error": {
    "code": string,
    "message": string,
    "fields": { [field: string]: string } | null
  } | null
}
```

Authentication:
- Access token is a JWT with subject = userId.
- Delivered in both places on successful login/registration:
    - HTTP-only cookie `RC_ACCESS` (default) and
    - JSON field `accessToken` in the response body.
- Clients can authenticate by either:
    - Sending the cookie as-is on subsequent requests, or
    - Setting header `Authorization: Bearer <accessToken>`.

Errors:
- 400: validation/semantic errors → `error.code` examples: `VALIDATION_ERROR`, `BAD_REQUEST`.
- 401: unauthenticated (missing/invalid token).
- 403: forbidden (not used for endpoints listed here except admin ones).
- 404: resource not found.

---

## Registration

- Method: `POST`
- Path: `/api/auth/register`
- Auth: None
- Body JSON:
```
{
  "email": "user@example.com",
  "name": "Jane Doe",
  "password": "StrongPassword123"
}
```
- Success: `201 Created`
- Response:
```
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Jane Doe",
      "role": "CUSTOMER",
      "isBanned": false,
      "phone": null,
      "address": null,
      "profileImageUrl": null
    },
    "accessToken": "<jwt>",
    "refreshToken": "<refresh>"
  },
  "meta": { "message": "Registration successful" },
  "error": null
}
```
- Sets cookie `RC_ACCESS=<jwt>; HttpOnly; Path=/; Max-Age=<minutes>`.

## Login

- Method: `POST`
- Path: `/api/auth/login`
- Auth: None
- Body JSON:
```
{
  "email": "user@example.com",
  "password": "StrongPassword123"
}
```
- Success: `200 OK`
- Response body and cookie behavior are identical to Registration.

## Logout

- Method: `POST`
- Path: `/api/auth/logout`
- Auth: Not required (endpoint is public). If authenticated, server also invalidates refresh tokens.
- Body: none
- Success: `204 No Content`
- Side effect: Sets an empty `RC_ACCESS` cookie to clear the client cookie.

Example curl:
```
curl -i -X POST http://localhost:8080/api/auth/logout
```

## Reset Password (no old password)

- Method: `POST`
- Path: `/api/auth/reset-password`
- Auth: None
- Body JSON:
```
{
  "email": "user@example.com",
  "newPassword": "NewPassword!234",
  "confirmPassword": "NewPassword!234"
}
```
- Success: `200 OK`
- Response:
```
{ "data": null, "meta": { "message": "Password reset successful" }, "error": null }
```

## Change Password (with old password)

- Method: `POST`
- Path: `/api/auth/forgot-password`
- Auth: None
- Body JSON:
```
{
  "email": "user@example.com",
  "oldPassword": "OldPass",
  "newPassword": "NewPass"
}
```
- Success: `204 No Content`

---

## User Details: Get current user

- Method: `GET`
- Path: `/api/user-details`
- Auth: Required (cookie `RC_ACCESS` or `Authorization: Bearer ...`).
- Success: `200 OK`
- Response:
```
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "Jane Doe",
    "role": "CUSTOMER",
    "banned": false,
    "phone": "+12025550123",
    "address": "123 Main St",
    "profileImageUrl": "https://.../me.jpg",
    "createdAt": "2025-10-28T19:10:00",
    "updatedAt": "2025-10-28T20:15:00"
  },
  "meta": null,
  "error": null
}
```
- 404 when the authenticated user record is not found.

Example curl (cookie auth):
```
curl -b "RC_ACCESS=<jwt>" http://localhost:8080/api/user-details
```

Example curl (bearer auth):
```
curl -H "Authorization: Bearer <jwt>" http://localhost:8080/api/user-details
```

## User Details: Update

- Method: `PUT` (preferred) or `PATCH` (alias)
- Path: `/api/user-details`
- Auth: Required
- Body JSON (all fields optional; only provided fields are updated):
```
{
  "name": "Jane K. Doe",
  "phone": "+1 202 555 0123",
  "address": "456 Park Ave",
  "profileImageUrl": "https://cdn.example.com/u/123.jpg"
}
```
- Validation:
    - `name`: 1–100 chars
    - `phone`: `^[+0-9 ()-]{7,20}$`
    - `address`: max 255 chars
    - `profileImageUrl`: max 2048 chars
- Success: `200 OK` with updated user in `data`.
- Error example (validation):
```
{
  "data": null,
  "meta": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "fields": { "phone": "Invalid phone number" }
  }
}
```

---

## Implementation Tips for Frontend

- Persist tokens: prefer relying on the `RC_ACCESS` HttpOnly cookie for requests. Do not store the access token in localStorage if you can avoid it.
- For non-browser clients or when you need explicit control, take `data.accessToken` from login/register and set an `Authorization` header on each request.
- Handle `401` by redirecting to login. Handle `403` by showing a permission error. Parse validation errors from `error.fields` and surface per-field messages.
- After login/register, the server returns user profile in `data.user`; cache it in your app’s auth state.

