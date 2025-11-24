# Refresh Token Testing Guide for Postman

## Overview
This guide explains how to test the OAuth2 refresh token endpoint using Postman.

## Endpoint Details
- **URL**: `http://localhost:3000/api/v1/oauth/token`
- **Method**: `POST`
- **Content-Type**: `application/json`

## Prerequisites

### 1. Get Initial Tokens
First, you need to login to get an initial `access_token` and `refresh_token`.

**Login Request:**
```http
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "your-email@example.com",
  "password": "your-password",
  "client_id": "ecommerce-client",
  "redirect_uri": "http://localhost:3006/auth/callback",
  "scope": "openid profile email"
}
```

**Login Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "550e8400-e29b-41d4-a716-446655440000",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

**Important**: Copy the `refresh_token` value from the response. It will look like a UUID string.

## Refresh Token Request

### Step-by-Step in Postman

1. **Create a New Request**
   - Click "New" → "HTTP Request"
   - Set method to `POST`
   - URL: `http://localhost:3000/api/v1/oauth/token`

2. **Set Headers**
   - Click on "Headers" tab
   - Add header:
     - Key: `Content-Type`
     - Value: `application/json`

3. **Set Body**
   - Click on "Body" tab
   - Select "raw"
   - Select "JSON" from dropdown
   - Paste this JSON (replace with your actual refresh_token):

```json
{
  "grant_type": "refresh_token",
  "refresh_token": "550e8400-e29b-41d4-a716-446655440000",
  "client_id": "ecommerce-client",
  "client_secret": "ecommerce-secret-change-in-production"
}
```

4. **Send Request**
   - Click "Send"

### Expected Response

**Success (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900,
  "scope": "openid profile email",
  "id_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note**: The response does NOT include a new `refresh_token`. The existing refresh token remains valid and should be reused.

## Common Errors and Solutions

### Error: "invalid_client" (401)
```json
{
  "error": "invalid_client",
  "error_description": "Invalid client credentials"
}
```

**Solution**: Ensure you're sending both `client_id` and `client_secret` in the request body.

**Correct values:**
- `client_id`: `ecommerce-client`
- `client_secret`: `ecommerce-secret-change-in-production`

### Error: "invalid_grant" (400)
```json
{
  "error": "invalid_grant",
  "error_description": "Invalid refresh token"
}
```

**Possible causes:**
1. The refresh token is incorrect or malformed
2. The refresh token has expired (default: 7 days)
3. The refresh token has already been revoked
4. The refresh token was generated for a different client_id

**Solution**: Login again to get a new refresh token.

### Error: "Refresh token expired" (400)
```json
{
  "error": "invalid_grant",
  "error_description": "Refresh token expired"
}
```

**Solution**: The refresh token has exceeded its 7-day validity period. Login again.

## Testing Workflow

### 1. Complete Flow Test
```
1. POST /api/v1/auth/login
   → Get access_token and refresh_token

2. Use access_token to make authenticated requests
   → Should work for 15 minutes

3. Wait for access_token to expire (or test with expired token)

4. POST /api/v1/oauth/token with refresh_token
   → Get new access_token

5. Use new access_token for requests
   → Should work for another 15 minutes
```

### 2. Test Authenticated Endpoint
After getting a new access token, test it with:

```http
GET http://localhost:3000/api/v1/oauth/userinfo
Authorization: Bearer <your-new-access-token>
```

**Expected Response:**
```json
{
  "sub": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "name": "John Doe",
  "email_verified": true
}
```

## Environment Variables (Optional)

To make testing easier, you can create a Postman Environment:

1. Click "Environments" → "Create Environment"
2. Add these variables:
   - `auth_url`: `http://localhost:3000`
   - `client_id`: `ecommerce-client`
   - `client_secret`: `ecommerce-secret-change-in-production`
   - `access_token`: (will be set from login response)
   - `refresh_token`: (will be set from login response)

3. In your requests, use:
   - URL: `{{auth_url}}/api/v1/oauth/token`
   - Body: `"client_id": "{{client_id}}"`

4. Set up Tests to auto-save tokens:
```javascript
// In Login request "Tests" tab:
pm.environment.set("access_token", pm.response.json().data.access_token);
pm.environment.set("refresh_token", pm.response.json().data.refresh_token);

// In Refresh request "Tests" tab:
pm.environment.set("access_token", pm.response.json().access_token);
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit client secrets**: The `client_secret` shown here is for development only
2. **HTTPS only in production**: Always use HTTPS for token endpoints in production
3. **Secure storage**: Refresh tokens should be stored securely (HttpOnly cookies, secure storage)
4. **Token rotation**: Consider implementing refresh token rotation for enhanced security
5. **Expiry times**: Current settings are:
   - Access token: 15 minutes
   - Refresh token: 7 days

## Troubleshooting Checklist

- [ ] Auth service is running on port 3000
- [ ] MongoDB is connected and accessible
- [ ] Client credentials match exactly (case-sensitive)
- [ ] Refresh token is copied correctly (no extra spaces)
- [ ] Content-Type header is set to application/json
- [ ] Request body is valid JSON
- [ ] Refresh token hasn't expired (< 7 days old)

## Example: curl Command

If you prefer curl:

```bash
curl -X POST http://localhost:3000/api/v1/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "YOUR_REFRESH_TOKEN_HERE",
    "client_id": "ecommerce-client",
    "client_secret": "ecommerce-secret-change-in-production"
  }'
```

## Next Steps

After successfully testing the refresh token:

1. Test token expiration behavior
2. Test with revoked tokens (`POST /api/v1/oauth/revoke`)
3. Implement automatic token refresh in your frontend
4. Set up proper error handling for expired/invalid tokens
