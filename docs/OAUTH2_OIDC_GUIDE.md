# OAuth2 & OpenID Connect (OIDC) Implementation Guide

## Overview

Your authentication service supports **two authentication methods**:

1. **Direct Login** (Currently Used) - Simple email/password
2. **OAuth2 + OIDC** (Available) - Standard authorization code flow

## Current vs OAuth2 Authentication

### Current: Direct Login
```javascript
// What you're using now
POST /api/v1/auth/login
Body: { email, password }
Response: { accessToken, refreshToken, idToken, user }
```

**Pros:**
- Simple to implement
- Works for first-party apps
- Fast authentication

**Cons:**
- Not suitable for third-party apps
- No authorization consent screen
- Less separation of concerns

### OAuth2 + OIDC: Authorization Code Flow
```javascript
// Full OAuth2 flow
1. GET /oauth/authorize (redirect user)
2. User logs in
3. Redirect back with code
4. POST /oauth/token (exchange code for tokens)
5. GET /oauth/userinfo (get user data)
```

**Pros:**
- Industry standard (used by Google, Facebook, GitHub)
- Supports third-party applications
- Better security (authorization code never exposed to browser)
- Consent screens for permissions
- Single Sign-On (SSO) capable

**Cons:**
- More complex implementation
- Requires callback handling
- More network requests

## When to Use OAuth2/OIDC

Use OAuth2/OIDC when:
- Building a platform with third-party integrations
- Implementing "Sign in with YourApp" for other services
- Need to support multiple client applications
- Require fine-grained permission scopes
- Want to implement Single Sign-On (SSO)

Use Direct Login when:
- Building a simple first-party application
- Don't need third-party integrations
- Want simpler implementation
- All clients are trusted (your own apps)

## OAuth2/OIDC Implementation

### Step 1: Register OAuth2 Client

First, you need to register a client in the database:

```javascript
// Use MongoDB to create a client
db.clients.insertOne({
  client_id: "ecommerce-web-app",
  client_name: "E-commerce Web Application",
  client_secret: "$2a$10$...", // bcrypt hashed secret
  redirect_uris: ["http://localhost:3006/auth/callback"],
  grant_types: ["authorization_code", "refresh_token"],
  scope: ["openid", "profile", "email", "orders:read", "orders:write"],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});
```

**Script to create client:**
```bash
cd services/auth
node scripts/create-oauth-client.js
```

### Step 2: Discovery Endpoint

Check what the auth server supports:

```bash
curl http://localhost:8080/api/v1/auth/.well-known/openid-configuration
```

**Response:**
```json
{
  "issuer": "http://localhost:3000",
  "authorization_endpoint": "http://localhost:3000/oauth/authorize",
  "token_endpoint": "http://localhost:3000/oauth/token",
  "userinfo_endpoint": "http://localhost:3000/oauth/userinfo",
  "revocation_endpoint": "http://localhost:3000/oauth/revoke",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "scopes_supported": ["openid", "profile", "email", "offline_access"]
}
```

### Step 3: Authorization Request

Redirect user to authorization endpoint:

```javascript
// Frontend code
const authorizeUrl = new URL('http://localhost:8080/api/v1/auth/oauth/authorize');
authorizeUrl.searchParams.append('response_type', 'code');
authorizeUrl.searchParams.append('client_id', 'ecommerce-web-app');
authorizeUrl.searchParams.append('redirect_uri', 'http://localhost:3006/auth/callback');
authorizeUrl.searchParams.append('scope', 'openid profile email');
authorizeUrl.searchParams.append('state', generateRandomState()); // CSRF protection
authorizeUrl.searchParams.append('nonce', generateRandomNonce()); // Replay protection

// Redirect user
window.location.href = authorizeUrl.toString();
```

**Full URL Example:**
```
http://localhost:8080/api/v1/auth/oauth/authorize?response_type=code&client_id=ecommerce-web-app&redirect_uri=http://localhost:3006/auth/callback&scope=openid+profile+email&state=xyz123&nonce=abc456
```

### Step 4: User Login

The auth server will show a login page where the user enters credentials:
- Email: `ruchi@yopmail.com`
- Password: `Ruchi@123`

After successful authentication, user is redirected back:
```
http://localhost:3006/auth/callback?code=AUTH_CODE_HERE&state=xyz123
```

### Step 5: Exchange Code for Tokens

Frontend receives the authorization code and exchanges it:

```javascript
// Frontend API route: /api/auth/oauth-callback
const response = await fetch('http://localhost:8080/api/v1/auth/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: 'http://localhost:3006/auth/callback',
    client_id: 'ecommerce-web-app',
    client_secret: 'your-client-secret'
  })
});

const tokens = await response.json();
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "uuid-v4-token",
  "id_token": "eyJhbGc...",
  "scope": "openid profile email"
}
```

### Step 6: Get User Info

Use the access token to get user information:

```javascript
const userInfo = await fetch('http://localhost:8080/api/v1/auth/oauth/userinfo', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const user = await userInfo.json();
```

**Response:**
```json
{
  "sub": "691d6d01da39b318e42f4c21",
  "email": "ruchi@yopmail.com",
  "email_verified": false,
  "name": "Ruchi Sinha",
  "phone_number_verified": false,
  "address": {},
  "updated_at": "2025-11-19T07:08:49.319Z"
}
```

## Token Types Explained

### 1. Access Token (JWT)
- **Purpose**: Authenticate API requests
- **Lifetime**: 15 minutes
- **Format**: JWT (JSON Web Token)
- **Usage**: `Authorization: Bearer {access_token}`
- **Contains**: user_id, email, roles, scope

### 2. Refresh Token
- **Purpose**: Get new access tokens without re-login
- **Lifetime**: 7 days
- **Format**: Opaque UUID v4 string
- **Usage**: Exchange for new access token
- **Stored**: Database (can be revoked)

### 3. ID Token (OIDC)
- **Purpose**: Identity information about the user
- **Lifetime**: 1 hour
- **Format**: JWT
- **Usage**: Parse to get user profile
- **Contains**: Full user profile data

## Complete Frontend Implementation

### Create OAuth Callback Page

**File**: `frontend/src/app/auth/callback/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      // Check for errors
      if (error) {
        setError(error);
        return;
      }

      // Verify state (CSRF protection)
      const savedState = sessionStorage.getItem('oauth_state');
      if (state !== savedState) {
        setError('Invalid state parameter');
        return;
      }

      if (!code) {
        setError('No authorization code received');
        return;
      }

      try {
        // Exchange code for tokens
        const response = await fetch('/api/auth/oauth-callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });

        if (!response.ok) {
          throw new Error('Token exchange failed');
        }

        const data = await response.json();

        // Redirect to products page
        router.push('/products');
      } catch (err: any) {
        setError(err.message);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 p-6 rounded-lg">
          <h2 className="text-red-800 font-bold">Authentication Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Completing authentication...</p>
      </div>
    </div>
  );
}
```

### Create OAuth Callback API Route

**File**: `frontend/src/app/api/auth/oauth-callback/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8080';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    // Exchange authorization code for tokens
    const response = await fetch(`${AUTH_API_URL}/api/v1/auth/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI,
        client_id: process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID,
        client_secret: process.env.OAUTH_CLIENT_SECRET
      })
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error_description || 'Token exchange failed' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Set HTTP-only cookies
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';

    cookieStore.set('accessToken', data.access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: data.expires_in || 900,
      path: '/'
    });

    cookieStore.set('refreshToken', data.refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    // Decode ID token to get user info
    const idTokenPayload = JSON.parse(
      Buffer.from(data.id_token.split('.')[1], 'base64').toString()
    );

    cookieStore.set('user', JSON.stringify({
      sub: idTokenPayload.sub,
      email: idTokenPayload.email,
      name: idTokenPayload.name
    }), {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Update Login Page with OAuth Button

**File**: `frontend/src/app/auth/login/page.tsx`

```typescript
// Add OAuth login function
const handleOAuthLogin = () => {
  // Generate random state and nonce
  const state = generateRandomString(32);
  const nonce = generateRandomString(32);

  // Store state for verification
  sessionStorage.setItem('oauth_state', state);
  sessionStorage.setItem('oauth_nonce', nonce);

  // Build authorization URL
  const authUrl = new URL('http://localhost:8080/api/v1/auth/oauth/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', 'ecommerce-web-app');
  authUrl.searchParams.append('redirect_uri', 'http://localhost:3006/auth/callback');
  authUrl.searchParams.append('scope', 'openid profile email');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('nonce', nonce);

  // Redirect
  window.location.href = authUrl.toString();
};

// Helper function
function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Add button to UI
<button
  onClick={handleOAuthLogin}
  className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50"
>
  Sign in with OAuth2
</button>
```

## Testing OAuth2 Flow

### 1. Test Discovery Endpoint
```bash
curl http://localhost:8080/api/v1/auth/.well-known/openid-configuration | jq .
```

### 2. Initiate Authorization
Open browser and visit:
```
http://localhost:8080/api/v1/auth/oauth/authorize?response_type=code&client_id=ecommerce-client&redirect_uri=http://localhost:3006/auth/callback&scope=openid+profile+email&state=test123
```

### 3. Exchange Code for Tokens
```bash
curl -X POST http://localhost:8080/api/v1/auth/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "YOUR_AUTH_CODE",
    "redirect_uri": "http://localhost:3006/auth/callback",
    "client_id": "ecommerce-client",
    "client_secret": "ecommerce-secret-change-in-production"
  }'
```

### 4. Get User Info
```bash
curl http://localhost:8080/api/v1/auth/oauth/userinfo \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. Refresh Token
```bash
curl -X POST http://localhost:8080/api/v1/auth/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "YOUR_REFRESH_TOKEN",
    "client_id": "ecommerce-client",
    "client_secret": "ecommerce-secret-change-in-production"
  }'
```

## Comparison: Direct vs OAuth2

| Feature | Direct Login | OAuth2 + OIDC |
|---------|-------------|---------------|
| Implementation | ✅ Simple | ⚠️ Complex |
| Security | ✅ Good | ✅ Better |
| Third-party apps | ❌ No | ✅ Yes |
| SSO support | ❌ No | ✅ Yes |
| Consent screens | ❌ No | ✅ Yes |
| Token refresh | ✅ Yes | ✅ Yes |
| Industry standard | ❌ No | ✅ Yes |
| Current status | ✅ Implemented | ⚠️ Backend ready |

## Recommendation

**For your e-commerce app:**

Continue using **Direct Login** because:
1. It's already working perfectly
2. You own both frontend and backend
3. No third-party integrations needed
4. Simpler to maintain
5. Same security with HTTP-only cookies

**Switch to OAuth2/OIDC when:**
1. Building "Sign in with YourStore" for other sites
2. Adding third-party app integrations
3. Implementing multi-tenant architecture
4. Need enterprise SSO integration

## Summary

- ✅ **Your backend ALREADY supports OAuth2 + OIDC**
- ✅ **Direct login is working and appropriate for your use case**
- ✅ **OAuth2 endpoints are available if needed in the future**
- ℹ️ **No need to change unless you need third-party integrations**

Your current implementation is secure, follows best practices with HTTP-only cookies, and is perfect for a first-party e-commerce application.
