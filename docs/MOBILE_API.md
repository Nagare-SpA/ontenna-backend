# Ontenna Mobile API Documentation

## Overview

This API provides mobile application access to the Ontenna platform. It reuses the existing web authentication, verification, and subscription systems.

| Property | Value |
|----------|-------|
| **Base URL** | `https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1` |
| **API Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZnJqdm51ZXBma2VmZnNxeGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMzAwNDEsImV4cCI6MjA4MzYwNjA0MX0.6wEnk2OSRaCxHLQ-iUabA2_n-klE2HTl5niMwiptLnA` |
| **Protocol** | HTTPS (required) |
| **Content-Type** | `application/json` |

> **Important:** Mobile uses the same auth and subscription source of truth as the web platform.

---

## Quick Reference

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/mobile-signup` | POST | No | Create new user account |
| `/mobile-verify-email` | POST | No | Verify email with 6-digit code |
| `/mobile-resend-code` | POST | No | Resend verification code |
| `/mobile-login` | POST | No | Authenticate user |
| `/mobile-forgot-password` | POST | No | Request password reset email |
| `/mobile-refresh-token` | POST | No | Refresh expired access token |
| `/mobile-me` | GET | Yes | Get user profile & subscription |
| `/mobile-subscription` | GET | Yes | Get subscription status only |

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    NEW USER REGISTRATION                        │
├─────────────────────────────────────────────────────────────────┤
│  1. POST /mobile-signup                                         │
│     └─> Returns: verification_required                          │
│                                                                 │
│  2. User receives 6-digit code via email                        │
│                                                                 │
│  3. POST /mobile-verify-email                                   │
│     └─> Returns: email_verified                                 │
│                                                                 │
│  4. POST /mobile-login                                          │
│     └─> Returns: access_token + refresh_token                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    EXISTING USER LOGIN                          │
├─────────────────────────────────────────────────────────────────┤
│  1. POST /mobile-login                                          │
│     └─> Returns: access_token + refresh_token                   │
│                                                                 │
│  2. Use access_token in Authorization header                    │
│     └─> Authorization: Bearer <access_token>                    │
│                                                                 │
│  3. When token expires (after 1 hour):                          │
│     POST /mobile-refresh-token                                  │
│     └─> Returns: new access_token + refresh_token               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    PASSWORD RESET FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│  1. POST /mobile-forgot-password                                │
│     └─> Returns: password_reset_sent                            │
│                                                                 │
│  2. User receives reset link via email                          │
│                                                                 │
│  3. User resets password via web link                           │
│                                                                 │
│  4. POST /mobile-login with new password                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Required Headers

### For Public Endpoints (No Auth)

```http
Content-Type: application/json
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZnJqdm51ZXBma2VmZnNxeGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMzAwNDEsImV4cCI6MjA4MzYwNjA0MX0.6wEnk2OSRaCxHLQ-iUabA2_n-klE2HTl5niMwiptLnA
```

### For Protected Endpoints (Auth Required)

```http
Content-Type: application/json
Authorization: Bearer <access_token>
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZnJqdm51ZXBma2VmZnNxeGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMzAwNDEsImV4cCI6MjA4MzYwNjA0MX0.6wEnk2OSRaCxHLQ-iUabA2_n-klE2HTl5niMwiptLnA
```

---

## Endpoints

### 1. Signup

**`POST`** `https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-signup`

Creates a new user account. Triggers verification email automatically.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `first_name` | string | ✅ | User's first name |
| `last_name` | string | ✅ | User's last name |
| `email` | string | ✅ | Valid email address |
| `password` | string | ✅ | Minimum 6 characters |
| `country` | string | ❌ | Country code (e.g., "US") |
| `locale` | string | ❌ | Locale code (e.g., "en") |

#### Example Request

```bash
curl -X POST "https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-signup" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZnJqdm51ZXBma2VmZnNxeGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMzAwNDEsImV4cCI6MjA4MzYwNjA0MX0.6wEnk2OSRaCxHLQ-iUabA2_n-klE2HTl5niMwiptLnA" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "password": "securePassword123",
    "country": "US",
    "locale": "en"
  }'
```

#### Success Response (201)

```json
{
  "ok": true,
  "message": "verification_required",
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `invalid_request` | Missing required fields |
| 409 | `email_exists` | Email already registered |
| 500 | `server_error` | Internal server error |

```json
{
  "ok": false,
  "error": {
    "code": "email_exists",
    "message": "Email already registered"
  }
}
```

---

### 2. Verify Email

**`POST`** `https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-verify-email`

Validates the 6-digit verification code sent to user's email.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ | User's email address |
| `code` | string | ✅ | 6-digit verification code |

#### Example Request

```bash
curl -X POST "https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-verify-email" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZnJqdm51ZXBma2VmZnNxeGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMzAwNDEsImV4cCI6MjA4MzYwNjA0MX0.6wEnk2OSRaCxHLQ-iUabA2_n-klE2HTl5niMwiptLnA" \
  -d '{
    "email": "john@example.com",
    "code": "123456"
  }'
```

#### Success Response (200)

```json
{
  "ok": true,
  "message": "email_verified"
}
```

#### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `invalid_code` | Wrong verification code |
| 400 | `expired_code` | Code has expired |
| 400 | `invalid_request` | Missing required fields |
| 404 | `user_not_found` | User doesn't exist |

---

### 3. Resend Verification Code

**`POST`** `https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-resend-code`

Resends a new verification code to the user's email.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ | User's email address |

#### Example Request

```bash
curl -X POST "https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-resend-code" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZnJqdm51ZXBma2VmZnNxeGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMzAwNDEsImV4cCI6MjA4MzYwNjA0MX0.6wEnk2OSRaCxHLQ-iUabA2_n-klE2HTl5niMwiptLnA" \
  -d '{
    "email": "john@example.com"
  }'
```

#### Success Response (200)

```json
{
  "ok": true,
  "message": "verification_code_sent"
}
```

#### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `already_verified` | Email already verified |
| 400 | `invalid_request` | Missing email field |
| 404 | `user_not_found` | User doesn't exist |

---

### 4. Login

**`POST`** `https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-login`

Authenticates user and returns access tokens.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ | User's email address |
| `password` | string | ✅ | User's password |

#### Example Request

```bash
curl -X POST "https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-login" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZnJqdm51ZXBma2VmZnNxeGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMzAwNDEsImV4cCI6MjA4MzYwNjA0MX0.6wEnk2OSRaCxHLQ-iUabA2_n-klE2HTl5niMwiptLnA" \
  -d '{
    "email": "john@example.com",
    "password": "securePassword123"
  }'
```

#### Success Response (200)

```json
{
  "ok": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "v1.MjE0NjM5NDUtYTQ2Zi00YjE5LTk0OTAtZmM2...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

#### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `invalid_request` | Missing email or password |
| 401 | `invalid_credentials` | Wrong email/password |
| 403 | `email_not_verified` | Email not verified yet |

---

### 5. Forgot Password

**`POST`** `https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-forgot-password`

Triggers password reset email. User will receive a link to reset their password.

> **Security Note:** This endpoint always returns success, even if the email doesn't exist, to prevent email enumeration attacks.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ | User's email address |

#### Example Request

```bash
curl -X POST "https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-forgot-password" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZnJqdm51ZXBma2VmZnNxeGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMzAwNDEsImV4cCI6MjA4MzYwNjA0MX0.6wEnk2OSRaCxHLQ-iUabA2_n-klE2HTl5niMwiptLnA" \
  -d '{
    "email": "john@example.com"
  }'
```

#### Success Response (200)

```json
{
  "ok": true,
  "message": "password_reset_sent"
}
```

---

### 6. Refresh Token

**`POST`** `https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-refresh-token`

Refreshes an expired access token using a valid refresh token.

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `refresh_token` | string | ✅ | Refresh token from login |

#### Example Request

```bash
curl -X POST "https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-refresh-token" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZnJqdm51ZXBma2VmZnNxeGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMzAwNDEsImV4cCI6MjA4MzYwNjA0MX0.6wEnk2OSRaCxHLQ-iUabA2_n-klE2HTl5niMwiptLnA" \
  -d '{
    "refresh_token": "v1.MjE0NjM5NDUtYTQ2Zi00YjE5LTk0OTAtZmM2..."
  }'
```

#### Success Response (200)

```json
{
  "ok": true,
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "v1.newRefreshToken...",
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

### 7. Get User Profile & Subscription

**`GET`** `https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-me`

Returns the authenticated user's profile and subscription status.

#### Example Request

```bash
curl -X GET "https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-me" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZnJqdm51ZXBma2VmZnNxeGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMzAwNDEsImV4cCI6MjA4MzYwNjA0MX0.6wEnk2OSRaCxHLQ-iUabA2_n-klE2HTl5niMwiptLnA"
```

#### Success Response (200) - With Active Subscription

```json
{
  "ok": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "avatar_url": "https://example.com/avatar.jpg",
    "email_verified": true,
    "account_type": "end_user",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-15T12:30:00.000Z"
  },
  "subscription": {
    "status": "active",
    "plan_key": "pro",
    "plan_name": "Premium",
    "price_id": "price_1234567890",
    "current_period_start": "2024-01-01T00:00:00.000Z",
    "current_period_end": "2024-02-01T00:00:00.000Z",
    "cancel_at_period_end": false,
    "features": [
      "5 hours STT Included",
      "20 Active Alerts",
      "Priority Support"
    ]
  }
}
```

#### Success Response (200) - No Subscription

```json
{
  "ok": true,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "avatar_url": null,
    "email_verified": true,
    "account_type": "end_user",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  },
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

### 8. Get Subscription Only

**`GET`** `https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-subscription`

Returns only the subscription status (lighter payload than `/mobile-me`).

#### Example Request

```bash
curl -X GET "https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-subscription" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZnJqdm51ZXBma2VmZnNxeGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMzAwNDEsImV4cCI6MjA4MzYwNjA0MX0.6wEnk2OSRaCxHLQ-iUabA2_n-klE2HTl5niMwiptLnA"
```

#### Success Response (200)

```json
{
  "ok": true,
  "subscription": {
    "status": "active",
    "plan_key": "pro",
    "plan_name": "Premium",
    "price_id": "price_1234567890",
    "current_period_start": "2024-01-01T00:00:00.000Z",
    "current_period_end": "2024-02-01T00:00:00.000Z",
    "cancel_at_period_end": false,
    "features": [
      "5 hours STT Included",
      "20 Active Alerts"
    ]
  }
}
```

---

## Data Types Reference

### Subscription Status Values

| Status | Description | User Action |
|--------|-------------|-------------|
| `active` | Subscription is active and paid | Full access |
| `trialing` | User is in trial period | Full access |
| `past_due` | Payment failed, in grace period | Limited access, show payment prompt |
| `canceled` | Subscription was canceled | Access until period end |
| `none` | No subscription exists | Show upgrade prompt |

### Plan Key Values

| Plan Key | Description |
|----------|-------------|
| `free` | No active subscription |
| `basic` | Standard plan |
| `pro` | Premium plan |
| `enterprise` | Enterprise plan |

### Account Type Values

| Type | Description |
|------|-------------|
| `end_user` | Regular user |
| `team_supervisor` | Team manager |
| `super_admin` | Platform admin |

---

## Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `unauthorized` | 401 | Missing or invalid auth token |
| `invalid_credentials` | 401 | Wrong email/password |
| `invalid_refresh_token` | 401 | Invalid or expired refresh token |
| `email_not_verified` | 403 | User hasn't verified email |
| `invalid_code` | 400 | Wrong verification code |
| `expired_code` | 400 | Verification code expired |
| `invalid_request` | 400 | Missing required fields |
| `already_verified` | 400 | Email already verified |
| `email_exists` | 409 | Email already registered |
| `user_not_found` | 404 | User doesn't exist |
| `method_not_allowed` | 405 | Wrong HTTP method |
| `server_error` | 500 | Internal server error |

---

## Mobile Implementation Guide

### Token Storage

```swift
// iOS - Store in Keychain
KeychainHelper.save(key: "access_token", value: accessToken)
KeychainHelper.save(key: "refresh_token", value: refreshToken)
```

```kotlin
// Android - Store in EncryptedSharedPreferences
val encryptedPrefs = EncryptedSharedPreferences.create(...)
encryptedPrefs.edit().putString("access_token", accessToken).apply()
encryptedPrefs.edit().putString("refresh_token", refreshToken).apply()
```

### Token Refresh Logic

```swift
// Pseudocode for token refresh
func makeAuthenticatedRequest(endpoint: String) async throws -> Response {
    var response = try await fetch(endpoint, headers: ["Authorization": "Bearer \(accessToken)"])
    
    if response.status == 401 {
        // Token expired, try to refresh
        let refreshResponse = try await refreshToken()
        if refreshResponse.ok {
            // Save new tokens
            accessToken = refreshResponse.access_token
            refreshToken = refreshResponse.refresh_token
            
            // Retry original request
            response = try await fetch(endpoint, headers: ["Authorization": "Bearer \(accessToken)"])
        } else {
            // Refresh failed, redirect to login
            redirectToLogin()
        }
    }
    
    return response
}
```

### Subscription Check Example

```swift
// Check if user has active subscription
func hasActiveSubscription(subscription: Subscription) -> Bool {
    return subscription.status == "active" || subscription.status == "trialing"
}

// Enable/disable features based on subscription
func updateUIForSubscription(subscription: Subscription) {
    if subscription.status == "none" {
        showUpgradePrompt()
        disablePremiumFeatures()
    } else if subscription.status == "past_due" {
        showPaymentWarning()
        enablePremiumFeatures() // Still allow access during grace period
    } else {
        hideBanners()
        enablePremiumFeatures()
    }
}
```

---

## Security Notes

| Requirement | Details |
|-------------|---------|
| **Transport** | HTTPS is mandatory for all requests |
| **Token Expiry** | Access tokens expire after 1 hour (3600 seconds) |
| **Token Refresh** | Use refresh token to get new access token |
| **Token Storage** | Store tokens securely (Keychain/EncryptedSharedPreferences) |
| **Rate Limiting** | Handled by Supabase infrastructure |
| **Password Reset** | Handled via web link for security |

---

## Complete Example Flow

### 1. User Registration

```bash
# Step 1: Create account
curl -X POST "https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-signup" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZnJqdm51ZXBma2VmZnNxeGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMzAwNDEsImV4cCI6MjA4MzYwNjA0MX0.6wEnk2OSRaCxHLQ-iUabA2_n-klE2HTl5niMwiptLnA" \
  -d '{"first_name":"John","last_name":"Doe","email":"john@example.com","password":"securePassword123"}'

# Response: {"ok":true,"message":"verification_required","user_id":"..."}

# Step 2: User receives email with 6-digit code (e.g., 123456)

# Step 3: Verify email
curl -X POST "https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-verify-email" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZnJqdm51ZXBma2VmZnNxeGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMzAwNDEsImV4cCI6MjA4MzYwNjA0MX0.6wEnk2OSRaCxHLQ-iUabA2_n-klE2HTl5niMwiptLnA" \
  -d '{"email":"john@example.com","code":"123456"}'

# Response: {"ok":true,"message":"email_verified"}
```

### 2. User Login

```bash
# Login and get tokens
curl -X POST "https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-login" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZnJqdm51ZXBma2VmZnNxeGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMzAwNDEsImV4cCI6MjA4MzYwNjA0MX0.6wEnk2OSRaCxHLQ-iUabA2_n-klE2HTl5niMwiptLnA" \
  -d '{"email":"john@example.com","password":"securePassword123"}'

# Response: {"ok":true,"access_token":"eyJ...","refresh_token":"v1...","expires_in":3600,"token_type":"Bearer"}
```

### 3. Get User Data

```bash
# Get profile and subscription
curl -X GET "https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-me" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZnJqdm51ZXBma2VmZnNxeGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMzAwNDEsImV4cCI6MjA4MzYwNjA0MX0.6wEnk2OSRaCxHLQ-iUabA2_n-klE2HTl5niMwiptLnA"

# Response: {"ok":true,"user":{...},"subscription":{...}}
```

### 4. Refresh Expired Token

```bash
# When access_token expires, use refresh_token
curl -X POST "https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/mobile-refresh-token" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZnJqdm51ZXBma2VmZnNxeGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMzAwNDEsImV4cCI6MjA4MzYwNjA0MX0.6wEnk2OSRaCxHLQ-iUabA2_n-klE2HTl5niMwiptLnA" \
  -d '{"refresh_token":"v1.MjE0NjM5NDUtYTQ2Zi00YjE5LTk0OTAtZmM2..."}'

# Response: {"ok":true,"access_token":"eyJ...new...","refresh_token":"v1...new...","expires_in":3600,"token_type":"Bearer"}
```

---

## Support

For API issues or questions, contact the Ontenna development team.
