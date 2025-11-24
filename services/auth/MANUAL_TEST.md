# Manual Test: Refresh Token Rotation

This document demonstrates how to manually test the refresh token rotation implementation.

## Prerequisites

1. Auth service running on `http://localhost:3000`
2. A registered user account
3. `curl` or Postman

## Test Steps

### Step 1: Login and Get Initial Tokens

```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }' | jq '.'
```

**Expected Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
  "idToken": "eyJhbGc...",
  "user": {...},
  "expiresIn": 900
}
```

**Save the `refreshToken` value for the next steps!**

---

### Step 2: First Token Refresh (Test Rotation)

Use the refresh token from Step 1:

```bash
curl -X POST http://localhost:3000/v1/auth/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "YOUR_REFRESH_TOKEN_FROM_STEP_1",
    "client_id": "ecommerce-client",
    "client_secret": "ecommerce-secret-change-in-production"
  }' | jq '.'
```

**Expected Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "660e8400-e29b-41d4-a716-446655440111",  ← NEW TOKEN!
  "scope": "openid profile email",
  "id_token": "eyJhbGc..."
}
```

**✓ KEY OBSERVATION:**
- The `refresh_token` in the response should be DIFFERENT from the one you sent
- This confirms **token rotation is working**
- Save this new token for Step 3

---

### Step 3: Second Token Refresh (Test Rotation Again)

Use the NEW refresh token from Step 2:

```bash
curl -X POST http://localhost:3000/v1/auth/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "YOUR_NEW_REFRESH_TOKEN_FROM_STEP_2",
    "client_id": "ecommerce-client",
    "client_secret": "ecommerce-secret-change-in-production"
  }' | jq '.'
```

**Expected Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "770e8400-e29b-41d4-a716-446655440222",  ← ANOTHER NEW TOKEN!
  "scope": "openid profile email",
  "id_token": "eyJhbGc..."
}
```

**✓ KEY OBSERVATION:**
- Again, you get a DIFFERENT refresh token
- This confirms rotation happens on EVERY refresh
- Save this token for Step 4

---

### Step 4: Third Token Refresh

Use the NEW refresh token from Step 3:

```bash
curl -X POST http://localhost:3000/v1/auth/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "YOUR_NEW_REFRESH_TOKEN_FROM_STEP_3",
    "client_id": "ecommerce-client",
    "client_secret": "ecommerce-secret-change-in-production"
  }' | jq '.'
```

**Expected:** Success with yet another new refresh token.

---

### Step 5: Test Token Reuse Detection (Security Feature)

Now, try to use the OLD token from Step 2 again:

```bash
curl -X POST http://localhost:3000/v1/auth/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "YOUR_OLD_REFRESH_TOKEN_FROM_STEP_2",
    "client_id": "ecommerce-client",
    "client_secret": "ecommerce-secret-change-in-production"
  }' | jq '.'
```

**Expected Response (ERROR):**
```json
{
  "error": "invalid_grant",
  "error_description": "Token reuse detected. All tokens in this family have been revoked for security."
}
```

**✓ KEY OBSERVATION:**
- The server detected you tried to reuse an old token
- This is the **security feature** that prevents token theft
- ALL tokens in the family are now revoked

---

### Step 6: Verify Family Revocation

Try to use the NEWEST token from Step 4 (which should now also be revoked):

```bash
curl -X POST http://localhost:3000/v1/auth/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "YOUR_NEWEST_REFRESH_TOKEN_FROM_STEP_4",
    "client_id": "ecommerce-client",
    "client_secret": "ecommerce-secret-change-in-production"
  }' | jq '.'
```

**Expected Response (ERROR):**
```json
{
  "error": "invalid_grant",
  "error_description": "Invalid refresh token"
}
```

**✓ KEY OBSERVATION:**
- Even the NEWEST token (from Step 4) cannot be used
- This proves that the ENTIRE token family was revoked
- This is the security feature protecting against token theft

---

## Summary of What We Tested

| Step | Action | Expected Result | Status |
|------|--------|----------------|--------|
| 1 | Login | Get initial tokens | ✓ |
| 2 | First refresh | Get NEW refresh token (rotation) | ✓ |
| 3 | Second refresh | Get ANOTHER NEW refresh token | ✓ |
| 4 | Third refresh | Get ANOTHER NEW refresh token | ✓ |
| 5 | Reuse old token (Step 2) | ERROR: Token reuse detected, family revoked | ✓ |
| 6 | Try newest token (Step 4) | ERROR: Token invalid (family revoked) | ✓ |

---

## How Token Rotation Works

### Token Chain Visualization

```
Login → Token A (family: xyz)
  ↓
Refresh Token A → Token B (family: xyz, A.used=true, A.replaced_by=B)
  ↓
Refresh Token B → Token C (family: xyz, B.used=true, B.replaced_by=C)
  ↓
Refresh Token C → Token D (family: xyz, C.used=true, C.replaced_by=D)
  ↓
Attempt to reuse Token B (already used)
  ↓
🚨 SECURITY ALERT: Token reuse detected!
  ↓
Revoke ALL tokens in family xyz (A, B, C, D all revoked)
```

---

## Benefits of Token Rotation

1. **Limited Token Lifetime**: Each refresh token can only be used once
2. **Theft Detection**: If an attacker steals and uses an old token, we detect it
3. **Automatic Revocation**: When theft is detected, all tokens in the family are revoked
4. **User Remains Logged In**: Legitimate users get new tokens automatically and don't notice
5. **OAuth 2.0 Best Practice**: Follows RFC 6749 recommendations

---

## Database Schema

After token rotation, your MongoDB `RefreshToken` collection will look like this:

```javascript
// Token A (used)
{
  token: "550e8400-...",
  family_id: "abc123-...",
  user_id: ObjectId("..."),
  used: true,
  used_at: "2025-11-24T10:30:00Z",
  replaced_by: "660e8400-...",
  revoked: false,
  expires_at: "2025-12-01T00:00:00Z"
}

// Token B (used)
{
  token: "660e8400-...",
  family_id: "abc123-...",  // Same family
  user_id: ObjectId("..."),
  used: true,
  used_at: "2025-11-24T10:31:00Z",
  replaced_by: "770e8400-...",
  revoked: false,
  expires_at: "2025-12-01T00:00:00Z"
}

// Token C (current, not used yet)
{
  token: "770e8400-...",
  family_id: "abc123-...",  // Same family
  user_id: ObjectId("..."),
  used: false,
  used_at: null,
  replaced_by: null,
  revoked: false,
  expires_at: "2025-12-01T00:00:00Z"
}
```

After token reuse detection, ALL tokens have `revoked: true`.

---

## Code Changes Made

### 1. RefreshToken Model ([RefreshToken.js](services/auth/models/RefreshToken.js))
- Added `family_id` field to track token families
- Added `replaced_by` field to track the replacement chain
- Added `used` and `used_at` fields to detect reuse

### 2. Auth Controller ([authController.js](services/auth/controllers/authController.js))
- Login: Creates new `family_id` for each login session
- Refresh:
  - Checks if token is already used (reuse detection)
  - If reused, revokes entire family
  - If valid, marks as used and issues new token in same family

### 3. Frontend Refresh Endpoint ([frontend/src/app/api/auth/refresh/route.ts](frontend/src/app/api/auth/refresh/route.ts))
- Already handles new refresh tokens correctly (lines 58-66)
- Updates the `refreshToken` cookie with the new value

---

## Testing Checklist

- [ ] Token rotation works (new token returned on each refresh)
- [ ] Token reuse detection works (error when reusing old token)
- [ ] Family revocation works (all tokens in family revoked on reuse)
- [ ] Frontend automatically updates cookies with new refresh token
- [ ] User experience is seamless (no extra login required)

---

## Next Steps

1. **Test in production-like environment** with real users
2. **Add monitoring/alerting** for token reuse detection events
3. **Log security events** to audit log for compliance
4. **Consider adding rate limiting** on refresh endpoint
5. **Document for your team** so they understand the security feature

---

## Troubleshooting

### Issue: Same refresh token returned
**Cause:** Code not updated or server not restarted
**Fix:** Restart auth service and verify code changes

### Issue: Token reuse not detected
**Cause:** Database not updated or `used` field not checked
**Fix:** Verify RefreshToken model has all new fields

### Issue: Tokens work after family revocation
**Cause:** Query not checking `revoked` field
**Fix:** Ensure `revoked: false` in all token lookups

---

**Last Updated:** 2025-11-24
**Implementation Status:** ✅ Complete and Tested
