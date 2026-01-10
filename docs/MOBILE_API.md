# Ontenna Mobile API Documentation

## Overview

This API provides mobile application access to the Ontenna platform. It reuses the existing web authentication, verification, and subscription systems.

**Base URL:** `https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1`

**Important:** Mobile uses the same auth and subscription source of truth as the web platform.

---

## Authentication Flow

1. User signs up → `POST /mobile-signup`
2. Verification code sent to email automatically
3. User verifies email → `POST /mobile-verify-email`
4. User logs in → `POST /mobile-login`
5. Use access token for authenticated requests
6. When token expires → `POST /mobile-refresh-token`

---

## Endpoints

### 1. Login

**POST** `/mobile-login`

Authenticates user using existing platform credentials.

#### Request

```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

#### Headers

```
Content-Type: application/json
apikey: <SUPABASE_ANON_KEY>
```

#### Success Response (200)

```json
{
  "ok": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "v1.xxx...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

#### Error Responses

**401 - Invalid credentials**
```json
{
  "ok": false,
  "error": {
    "code": "invalid_credentials",
    "message": "Invalid login credentials"
  }
}
```

**403 - Email not verified**
```json
{
  "ok": false,
  "error": {
    "code": "email_not_verified",
    "message": "Please verify your email before logging in"
  }
}
```

---

### 2. Signup

**POST** `/mobile-signup`

Creates a new user account using the same flow as the web platform.

#### Request

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "user@example.com",
  "password": "securepassword",
  "country": "US",
  "locale": "en"
}
```

#### Headers

```
Content-Type: application/json
apikey: <SUPABASE_ANON_KEY>
```

#### Success Response (201)

```json
{
  "ok": true,
  "message": "verification_required",
  "user_id": "uuid-of-new-user"
}
```

#### Error Responses

**409 - Email exists**
```json
{
  "ok": false,
  "error": {
    "code": "email_exists",
    "message": "Email already registered"
  }
}
```

**400 - Invalid request**
```json
{
  "ok": false,
  "error": {
    "code": "invalid_request",
    "message": "Missing required fields"
  }
}
```

---

### 3. Verify Email

**POST** `/mobile-verify-email`

Validates the 6-digit verification code sent to user's email.

#### Request

```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

#### Headers

```
Content-Type: application/json
apikey: <SUPABASE_ANON_KEY>
```

#### Success Response (200)

```json
{
  "ok": true,
  "message": "email_verified"
}
```

#### Error Responses

**400 - Invalid code**
```json
{
  "ok": false,
  "error": {
    "code": "invalid_code",
    "message": "Invalid verification code"
  }
}
```

**400 - Expired code**
```json
{
  "ok": false,
  "error": {
    "code": "expired_code",
    "message": "Verification code has expired"
  }
}
```

**404 - User not found**
```json
{
  "ok": false,
  "error": {
    "code": "user_not_found",
    "message": "User not found"
  }
}
```

---

### 4. Resend Verification Code

**POST** `/mobile-resend-code`

Resends a new verification code to the user's email.

#### Request

```json
{
  "email": "user@example.com"
}
```

#### Headers

```
Content-Type: application/json
apikey: <SUPABASE_ANON_KEY>
```

#### Success Response (200)

```json
{
  "ok": true,
  "message": "verification_code_sent"
}
```

#### Error Responses

**400 - Already verified**
```json
{
  "ok": false,
  "error": {
    "code": "already_verified",
    "message": "Email already verified"
  }
}
```

---

### 5. Refresh Token

**POST** `/mobile-refresh-token`

Refreshes an expired access token using a valid refresh token.

#### Request

```json
{
  "refresh_token": "v1.xxx..."
}
```

#### Headers

```
Content-Type: application/json
apikey: <SUPABASE_ANON_KEY>
```

#### Success Response (200)

```json
{
  "ok": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "v1.new-refresh-token...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

#### Error Response (401)

```json
{
  "ok": false,
  "error": {
    "code": "invalid_refresh_token",
    "message": "Failed to refresh token"
  }
}
```

---

### 6. Get User Profile & Subscription

**GET** `/mobile-me`

Returns authenticated user's profile and subscription status.

#### Headers

```
Authorization: Bearer <access_token>
apikey: <SUPABASE_ANON_KEY>
```

#### Success Response (200)

```json
{
  "ok": true,
  "user": {
    "id": "uuid",
    "first_name": "John",
    "last_name": "Doe",
    "email": "user@example.com",
    "avatar_url": "https://...",
    "email_verified": true,
    "account_type": "end_user",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "subscription": {
    "status": "active",
    "plan_key": "pro",
    "plan_name": "Premium",
    "price_id": "price_xxx",
    "current_period_start": "2024-01-01T00:00:00Z",
    "current_period_end": "2024-02-01T00:00:00Z",
    "cancel_at_period_end": false,
    "features": ["5 hours STT Included", "20 Active Alerts", ...]
  }
}
```

#### No Subscription Response

When user has no active subscription:

```json
{
  "ok": true,
  "user": { ... },
  "subscription": {
    "status": "none",
    "plan_key": "free",
    "plan_name": null,
    "price_id": null,
    "current_period_start": null,
    "current_period_end": null,
    "cancel_at_period_end": false,
    "features": []
  }
}
```

#### Error Response (401)

```json
{
  "ok": false,
  "error": {
    "code": "unauthorized",
    "message": "Invalid or expired token"
  }
}
```

---

### 7. Get Subscription Only

**GET** `/mobile-subscription`

Returns only the subscription status (lighter payload).

#### Headers

```
Authorization: Bearer <access_token>
apikey: <SUPABASE_ANON_KEY>
```

#### Success Response (200)

```json
{
  "ok": true,
  "subscription": {
    "status": "active",
    "plan_key": "pro",
    "plan_name": "Premium",
    "price_id": "price_xxx",
    "current_period_start": "2024-01-01T00:00:00Z",
    "current_period_end": "2024-02-01T00:00:00Z",
    "cancel_at_period_end": false,
    "features": [...]
  }
}
```

---

## Subscription Status Values

| Status | Description |
|--------|-------------|
| `active` | Subscription is active and paid |
| `trialing` | User is in trial period |
| `past_due` | Payment failed, grace period |
| `canceled` | Subscription was canceled |
| `none` | No subscription exists |

## Plan Key Values

| Plan Key | Description |
|----------|-------------|
| `free` | No subscription |
| `basic` | Standard plan |
| `pro` | Premium plan |

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `unauthorized` | 401 | Missing or invalid auth token |
| `invalid_credentials` | 401 | Wrong email/password |
| `email_not_verified` | 403 | User hasn't verified email |
| `invalid_code` | 400 | Wrong verification code |
| `expired_code` | 400 | Code has expired |
| `invalid_request` | 400 | Missing required fields |
| `email_exists` | 409 | Email already registered |
| `user_not_found` | 404 | User doesn't exist |
| `server_error` | 500 | Internal server error |

---

## Security Notes

- All tokens are JWT with same expiration as web platform
- Rate limiting is handled by Supabase
- HTTPS is mandatory for all requests
- Access tokens expire after 1 hour
- Use refresh token to get new access token

---

## Example: Complete Auth Flow

```bash
# 1. Signup
curl -X POST https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-signup \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"first_name":"John","last_name":"Doe","email":"john@example.com","password":"secret123"}'

# 2. Verify email (after receiving code)
curl -X POST https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-verify-email \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"email":"john@example.com","code":"123456"}'

# 3. Login
curl -X POST https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-login \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"email":"john@example.com","password":"secret123"}'

# 4. Get profile & subscription
curl -X GET https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "apikey: YOUR_ANON_KEY"
```
