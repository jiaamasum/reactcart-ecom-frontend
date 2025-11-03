# Auth and User Details API

Base URL: `http://localhost:8080`

All responses use this envelope:

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

Security Model

- Access token is a JWT; subject is the user ID.
- Token is returned only in the response body as `accessToken`.
- For protected endpoints, send header `Authorization: Bearer <accessToken>`.
- In Swagger UI, click “Authorize” and paste the raw token (no “Bearer ”).
- Auth endpoints are public (unlocked). User Details endpoints are protected (locked).

Error Codes

- 400/422: validation/semantic errors (e.g., `VALIDATION_ERROR`, `BAD_REQUEST`).
- 401: unauthenticated (missing/invalid token).
- 403: forbidden.
- 404: resource not found.

---

Registration

- Method: `POST`
- Path: `/api/auth/register`
- Auth: None
- Body:
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
    "accessToken": "<jwt>"
  },
  "meta": { "message": "Registration successful" },
  "error": null
}
```

- Errors:
    - `400 BAD_REQUEST` when the email already exists.
        - Body: `{ "data": null, "meta": null, "error": { "code": "BAD_REQUEST", "message": "Email already registered", "fields": null } }`

Login

- Method: `POST`
- Path: `/api/auth/login`
- Auth: None
- Body:
```
{
  "email": "user@example.com",
  "password": "StrongPassword123"
}
```
- Success: `200 OK`
- Response (same shape as Registration, with new `accessToken`).

- Errors (all return `400 BAD_REQUEST` with clear messages):
    - Email not found: `"Email not registered"`
    - Account banned: `"Account is banned"`
    - Wrong password: `"Incorrect password"`
    - Examples:
```
{ "data": null, "meta": null, "error": { "code": "BAD_REQUEST", "message": "Email not registered", "fields": null } }
{ "data": null, "meta": null, "error": { "code": "BAD_REQUEST", "message": "Account is banned", "fields": null } }
{ "data": null, "meta": null, "error": { "code": "BAD_REQUEST", "message": "Incorrect password", "fields": null } }
```

Logout

- Method: `POST`
- Path: `/api/auth/logout`
- Auth: None
- Body: none
- Success: `204 No Content`
- Note: Client should discard the access token.

- Errors: none (always returns `204`)

Reset Password

- Method: `POST`
- Path: `/api/auth/reset-password`
- Auth: None
- Body:
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

- Errors (`400 BAD_REQUEST`):
    - Email not found: `"User not found"`
    - Password mismatch: `"Password and confirm password do not match"`
    - Examples:
```
{ "data": null, "meta": null, "error": { "code": "BAD_REQUEST", "message": "User not found", "fields": null } }
{ "data": null, "meta": null, "error": { "code": "BAD_REQUEST", "message": "Password and confirm password do not match", "fields": null } }
```

---

User Details: Get Current User

- Method: `GET`
- Path: `/api/user-details`
- Auth: Required (`Authorization: Bearer <accessToken>`)
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
  "meta": { "message": "Fetched user details" },
  "error": null
}
```

- Errors:
    - `401 UNAUTHORIZED` when missing/invalid token.
        - Body: `{ "data": null, "meta": null, "error": { "code": "UNAUTHORIZED", "message": "Authentication required", "fields": null } }`
    - `404 NOT_FOUND` if the authenticated user record is missing.
        - Body: `{ "data": null, "meta": null, "error": { "code": "NOT_FOUND", "message": "User not found", "fields": null } }`

User Details: Update

- Method: `PUT` (preferred) or `PATCH` (partial update)
- Path: `/api/user-details`
- Auth: Required
- Body (all fields optional):
```
{
  "name": "Jane K. Doe",
  "phone": "+1 202 555 0123",
  "address": "456 Park Ave",
  "profileImageUrl": "https://cdn.example.com/u/123.jpg"
}
```
- Success: `200 OK`
- Response: updated user in `data`, meta: `{ "message": "Updated user details" }`

- Errors:
    - `401 UNAUTHORIZED` when missing/invalid token.
    - `422 UNPROCESSABLE_ENTITY` validation errors with per-field messages:
        - Examples:
```
{ "data": null, "meta": null, "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "fields": { "name": "Name must be 1-100 characters" } } }
{ "data": null, "meta": null, "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "fields": { "phone": "Invalid phone number" } } }
{ "data": null, "meta": null, "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "fields": { "address": "Address too long" } } }
{ "data": null, "meta": null, "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "fields": { "profileImageUrl": "Profile image URL too long" } } }
```

---

Curl Examples

- Register:
```
curl -s -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","name":"Jane","password":"StrongPassword123"}'
```

- Login and capture token:
```
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"StrongPassword123"}' | jq -r .data.accessToken)
```

- Get user details:
```
curl -s http://localhost:8080/api/user-details -H "Authorization: Bearer $TOKEN"
```

- Update user details:
```
curl -s -X PATCH http://localhost:8080/api/user-details \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane K. Doe"}'
```
