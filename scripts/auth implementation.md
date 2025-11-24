🔐 Complete Authentication System Explanation
Architecture Overview
Your application uses a custom OAuth2 + OpenID Connect (OIDC) implementation with a microservices architecture:
Frontend: Next.js (port 3006)
API Gateway: NGINX (port 8080)
Auth Service: Node.js/Express (port 3000)
Other Services: Products, Orders (separate microservices)
📊 Complete Authentication Flow Diagram
1. LOGIN FLOW (Step-by-Step)
┌─────────────┐
│   User      │
│ (Browser)   │
└──────┬──────┘
       │ 1. Enters email/password
       │    on /auth/login page
       ▼
┌─────────────────────────────────────┐
│  Frontend (Next.js)                 │
│  /app/auth/login/page.tsx           │
├─────────────────────────────────────┤
│  - Validates form inputs            │
│  - dispatch(login({email, password}))│
└──────┬──────────────────────────────┘
       │ 2. Redux action
       ▼
┌─────────────────────────────────────┐
│  Redux Slice                        │
│  /store/slices/authSlice.ts         │
├─────────────────────────────────────┤
│  - Sets loading: true               │
│  - Calls: fetch('/api/auth/login')  │
└──────┬──────────────────────────────┘
       │ 3. API call to Next.js route
       ▼
┌─────────────────────────────────────┐
│  Next.js API Route (Server-Side)    │
│  /app/api/auth/login/route.ts       │
├─────────────────────────────────────┤
│  - Receives credentials             │
│  - Forwards to auth service:        │
│    POST http://auth:3000/v1/auth/login
└──────┬──────────────────────────────┘
       │ 4. Through Docker network
       ▼
┌─────────────────────────────────────┐
│  Auth Service (Backend)             │
│  /controllers/authController.js     │
├─────────────────────────────────────┤
│  login() function:                  │
│  1. Find user by email              │
│  2. user.comparePassword(password)  │
│  3. Generate tokens:                │
│     - accessToken (JWT, 15m)        │
│     - refreshToken (UUID, 7d)       │
│     - idToken (JWT, 1h)             │
│  4. Store refreshToken in MongoDB   │
│  5. Return tokens                   │
└──────┬──────────────────────────────┘
       │ 5. Returns {access_token, refresh_token, id_token, user}
       ▼
┌─────────────────────────────────────┐
│  Next.js API Route                  │
│  /app/api/auth/login/route.ts       │
├─────────────────────────────────────┤
│  Sets HTTP-Only Cookies:            │
│  ✓ accessToken (15m, httpOnly)      │
│  ✓ refreshToken (7d, httpOnly)      │
│  ✓ user (7d, readable by JS)        │
│  ✓ wsToken (15m, for WebSockets)    │
│                                     │
│  Returns user data (no tokens)      │
└──────┬──────────────────────────────┘
       │ 6. Response with Set-Cookie headers
       ▼
┌─────────────────────────────────────┐
│  Redux Slice                        │
├─────────────────────────────────────┤
│  - Sets user in state               │
│  - Sets isAuthenticated: true       │
│  - Dispatches 'wsTokenChanged'      │
└──────┬──────────────────────────────┘
       │ 7. State updated
       ▼
┌─────────────────────────────────────┐
│  Browser                            │
├─────────────────────────────────────┤
│  - Cookies stored automatically     │
│  - Redirected to /products          │
│  - UI updates to show user          │
└─────────────────────────────────────┘
Key Files Involved:
Frontend: page.tsx
Redux: authSlice.ts
API Route: route.ts
Backend: authController.js
🔄 REFRESH TOKEN FLOW
┌─────────────┐
│   Browser   │ Making API call with expired accessToken
└──────┬──────┘
       │ 1. Request to any protected endpoint
       ▼
┌─────────────────────────────────────┐
│  Next.js API Route                  │
│  /app/api/auth/me/route.ts          │
├─────────────────────────────────────┤
│  - Reads accessToken from cookie    │
│  - Calls auth service /oauth/userinfo
│  - Receives 401 (token expired)     │
└──────┬──────────────────────────────┘
       │ 2. Token expired, trigger refresh
       ▼
┌─────────────────────────────────────┐
│  Refresh Endpoint                   │
│  /app/api/auth/refresh/route.ts     │
├─────────────────────────────────────┤
│  - Reads refreshToken from cookie   │
│  - POST to auth service /oauth/token│
│    with grant_type: "refresh_token" │
└──────┬──────────────────────────────┘
       │ 3. Exchange refresh token
       ▼
┌─────────────────────────────────────┐
│  Auth Service                       │
│  /controllers/authController.js     │
│  token() -> handleRefreshTokenGrant()
├─────────────────────────────────────┤
│  1. Validate client credentials     │
│  2. Find refreshToken in DB         │
│  3. Check if revoked or expired     │
│  4. Generate new accessToken        │
│  5. Optionally generate new refresh │
│  6. Return new tokens               │
└──────┬──────────────────────────────┘
       │ 4. New tokens returned
       ▼
┌─────────────────────────────────────┐
│  Refresh Endpoint                   │
├─────────────────────────────────────┤
│  - Updates accessToken cookie       │
│  - Updates refreshToken cookie      │
│    (if new one provided)            │
└──────┬──────────────────────────────┘
       │ 5. Cookies updated
       ▼
┌─────────────────────────────────────┐
│  Original Request Retried           │
│  /app/api/auth/me/route.ts          │
├─────────────────────────────────────┤
│  - Calls /oauth/userinfo again      │
│  - Now succeeds with new token      │
│  - Returns user data                │
└──────┬──────────────────────────────┘
       │ 6. Success
       ▼
┌─────────────┐
│   Browser   │ Request succeeded transparently
└─────────────┘
Key Files:
Refresh API: route.ts
Me API: route.ts
Backend: authController.js:280
🚪 LOGOUT FLOW
┌─────────────┐
│   User      │ Clicks "Logout" button
└──────┬──────┘
       │ 1. dispatch(logout())
       ▼
┌─────────────────────────────────────┐
│  Redux Slice                        │
│  /store/slices/authSlice.ts         │
├─────────────────────────────────────┤
│  - Calls: fetch('/api/auth/logout') │
└──────┬──────────────────────────────┘
       │ 2. API call
       ▼
┌─────────────────────────────────────┐
│  Next.js Logout Route               │
│  /app/api/auth/logout/route.ts      │
├─────────────────────────────────────┤
│  1. Read refreshToken from cookie   │
│  2. Call auth service revoke endpoint:
│     POST /v1/auth/oauth/revoke      │
│     {token: refreshToken}           │
└──────┬──────────────────────────────┘
       │ 3. Revoke token
       ▼
┌─────────────────────────────────────┐
│  Auth Service                       │
│  /controllers/authController.js     │
│  revoke() function                  │
├─────────────────────────────────────┤
│  1. Find refreshToken in DB         │
│  2. Set revoked: true               │
│  3. Token cannot be used anymore    │
└──────┬──────────────────────────────┘
       │ 4. Token revoked
       ▼
┌─────────────────────────────────────┐
│  Next.js Logout Route               │
├─────────────────────────────────────┤
│  Delete ALL cookies:                │
│  ✗ accessToken                      │
│  ✗ refreshToken                     │
│  ✗ user                             │
│  ✗ wsToken                          │
└──────┬──────────────────────────────┘
       │ 5. Cookies cleared
       ▼
┌─────────────────────────────────────┐
│  Redux Slice                        │
├─────────────────────────────────────┤
│  - Clears user from state           │
│  - Sets isAuthenticated: false      │
│  - Dispatches 'wsTokenChanged'      │
└──────┬──────────────────────────────┘
       │ 6. State cleared
       ▼
┌─────────────┐
│   Browser   │ Redirected to /auth/login
└─────────────┘
Key Files:
Logout API: route.ts
Backend Revoke: authController.js:391
Redux: authSlice.ts
🔒 TOKEN TYPES EXPLAINED
1. Access Token (JWT)
{
  "sub": "user_id_12345",
  "email": "user@example.com",
  "roles": ["user"],
  "scope": ["openid", "profile", "email"],
  "token_type": "access_token",
  "jti": "unique-token-id",
  "iss": "http://localhost:3000",
  "iat": 1735000000,
  "exp": 1735000900  // 15 minutes later
}
Purpose:
Authorize API requests
Short-lived (15 minutes)
Stored in HTTP-only cookie
Verified by all microservices
Location: jwt.js:8
2. Refresh Token (Opaque)
Example: "550e8400-e29b-41d4-a716-446655440000"
Purpose:
Exchange for new access tokens
Long-lived (7 days)
Stored in database for revocation
Single-use or reusable (configurable)
Stored in HTTP-only cookie
Database Record:
{
  "token": "550e8400...",
  "client_id": "ecommerce-client",
  "user_id": "user_id_12345",
  "scope": ["openid", "profile"],
  "expires_at": "2025-01-31T00:00:00Z",
  "revoked": false
}
Location: RefreshToken.js
3. ID Token (JWT, OpenID Connect)
{
  "sub": "user_id_12345",
  "email": "user@example.com",
  "email_verified": true,
  "name": "John Doe",
  "given_name": "John",
  "family_name": "Doe",
  "picture": "https://...",
  "phone_number": "+1234567890",
  "address": {
    "street_address": "123 Main St",
    "locality": "City",
    "region": "State",
    "postal_code": "12345",
    "country": "US"
  },
  "updated_at": 1735000000,
  "token_type": "id_token",
  "iss": "http://localhost:3000",
  "iat": 1735000000,
  "exp": 1735003600  // 1 hour later
}
Purpose:
Contains user profile information
OIDC standard claims
Not used for authorization
Client can decode without verification
Longer-lived (1 hour)
Location: jwt.js:45
🌐 OAUTH2/OIDC FLOWS SUPPORTED
1. Direct Login Flow (What you're currently using)
User → Login Form → Direct Token Response
Simplest flow
No authorization code step
Returns tokens directly
Used by your frontend
2. Authorization Code Flow (Implemented but not used)
1. Client redirects to: 
   GET /oauth/authorize?
     response_type=code&
     client_id=ecommerce-client&
     redirect_uri=http://localhost:3006/callback&
     scope=openid profile email

2. User logs in

3. Redirect back with code:
   http://localhost:3006/callback?code=xyz123

4. Exchange code for tokens:
   POST /oauth/token
   {
     "grant_type": "authorization_code",
     "code": "xyz123",
     "client_id": "ecommerce-client",
     "client_secret": "..."
   }

5. Receive tokens
Use Case: Third-party applications, SSO Location: authController.js:101
3. Refresh Token Grant (Active)
POST /oauth/token
{
  "grant_type": "refresh_token",
  "refresh_token": "550e8400...",
  "client_id": "ecommerce-client",
  "client_secret": "..."
}
Returns: New access token (and optionally new refresh token)
🛡️ SECURITY FEATURES
1. HTTP-Only Cookies
// Set in Next.js API route
cookies().set('accessToken', access_token, {
  httpOnly: true,     // ❌ JavaScript cannot access
  secure: true,       // ✅ HTTPS only (production)
  sameSite: 'lax',    // ✅ CSRF protection
  maxAge: 900,        // 15 minutes
  path: '/'
});
Why: Prevents XSS attacks from stealing tokens Location: route.ts:31
2. Separate Secrets
ACCESS_TOKEN_SECRET  = "secret1..."
REFRESH_TOKEN_SECRET = "secret2..."  // Not used (UUID-based)
ID_TOKEN_SECRET      = "secret3..."
Why: If one secret is compromised, others remain secure
3. Token Expiry
Access Token: 15 minutes (short-lived)
Refresh Token: 7 days (long-lived but revocable)
ID Token: 1 hour (user info)
Why: Limits damage from token theft
4. Refresh Token Revocation
// Stored in database
{
  token: "uuid",
  revoked: false,  // Can be set to true on logout
  expires_at: Date
}
Why: Allows immediate invalidation on logout/compromise Location: RefreshToken.js
5. Rate Limiting (NGINX)
limit_req zone=auth_limit burst=20 nodelay;
# 5 requests/second for auth endpoints
Why: Prevents brute-force attacks Location: nginx.conf:35
6. Password Hashing (bcrypt)
// User model pre-save hook
const salt = await bcrypt.genSalt(10);
this.password = await bcrypt.hash(this.password, salt);
Why: Passwords never stored in plaintext Location: User.js:89
7. Role-Based Access Control (RBAC)
// Middleware
requireRole('admin')
requireRole('admin', 'moderator')
Roles:
user: Default role
moderator: Moderate content
admin: Full access
Location: oauth2Middleware.js:43
8. Scope-Based Authorization (OAuth2)
// Middleware
requireScope('profile')
requireScope('orders:read', 'orders:write')
Scopes:
openid: OIDC authentication
profile: User profile access
email: Email address access
Location: oauth2Middleware.js:31
🚨 WHAT HAPPENS IN DIFFERENT SCENARIOS
Scenario 1: Access Token Expires
User makes API request
Token validation fails (401)
/api/auth/me detects expired token
Automatically calls /api/auth/refresh
New access token issued
Original request retried
User experiences no interruption
Scenario 2: Refresh Token Expires
Access token expires
Refresh attempt fails (refresh token expired)
User redirected to /auth/login
User must login again
Session truly ended
Scenario 3: User Logs Out
Refresh token marked as revoked: true in DB
All cookies deleted
Even if attacker has old tokens:
Access token expires in 15 min
Refresh token cannot be used (revoked)
Scenario 4: Token Stolen (XSS Attack)
Access Token: Attacker has 15 min max access
Refresh Token: Cannot be stolen (HTTP-only cookie)
ID Token: No harm, contains public info only
User Cookie: Attacker can read user data (not sensitive)
Mitigation: HTTP-only cookies prevent JS access
Scenario 5: CSRF Attack
// Attacker tries to make request from evil.com
fetch('http://yoursite.com/api/auth/login', {
  credentials: 'include',  // Include cookies
  method: 'POST'
});
Protection:
sameSite: 'lax' cookie attribute
Cookies not sent from cross-origin requests
CORS restrictions in place
Location: nginx.conf:17
✅ PROS OF THIS IMPLEMENTATION
1. Standards-Compliant
✅ OAuth2 RFC 6749
✅ OpenID Connect 1.0
✅ JWT RFC 7519
✅ Token Revocation RFC 7009
2. Security Best Practices
✅ HTTP-only cookies (XSS protection)
✅ Short-lived access tokens
✅ Revocable refresh tokens
✅ Rate limiting
✅ CORS restrictions
✅ Password hashing (bcrypt)
✅ Separate token secrets
3. Scalability
✅ Stateless access tokens (JWT)
✅ Microservices can verify tokens independently
✅ No session storage needed
✅ Database only checked on refresh
4. Developer Experience
✅ Automatic token refresh (transparent to user)
✅ Clear separation of concerns
✅ Reusable middleware
✅ Type-safe frontend (TypeScript)
✅ Well-documented code
5. Flexibility
✅ Supports multiple OAuth2 flows
✅ OIDC for SSO integration
✅ Role-based access control
✅ Scope-based authorization
✅ Easy to add OAuth2 clients
6. User Experience
✅ Stay logged in for 7 days
✅ Seamless token refresh
✅ No manual token management
✅ Fast login (no external auth provider)
❌ CONS & LIMITATIONS
1. Single Point of Failure
❌ Auth service down = entire system inaccessible
Mitigation: Add redundancy, health checks, auto-restart
2. Token Size
❌ JWTs are large (cookies ~1-2KB each)
❌ Sent with every request (overhead)
Impact: Minimal for modern networks
3. Token Invalidation Delay
❌ Access token valid for 15 min even after logout
❌ Cannot immediately revoke access token
Mitigation: Use shorter expiry (trade-off: more refreshes)
4. Refresh Token Rotation Not Implemented
❌ Same refresh token reused multiple times
❌ If stolen, attacker can use it until expiry
Best Practice: Issue new refresh token on each use (rotation)
Fix: Modify authController.js:280 to:
// Generate new refresh token
const newRefreshToken = generateRefreshToken();
// Mark old token as used
await RefreshToken.findOneAndUpdate(
  { token: refreshToken },
  { used: true }
);
// Save new token
// Return new refresh token
5. No Multi-Factor Authentication (MFA)
❌ Only email/password authentication
❌ Higher risk of account compromise
Enhancement: Add TOTP, SMS, or WebAuthn
6. Client Secret in Environment Variables
❌ DEFAULT_CLIENT_SECRET in .env file
❌ Could be committed to git accidentally
Best Practice: Use secret management (Vault, AWS Secrets Manager)
7. No Token Binding
❌ Stolen refresh token can be used from any IP/device
❌ No detection of token theft
Enhancement: Add device fingerprinting, IP validation
8. WebSocket Token Exposed
❌ wsToken NOT HTTP-only (needed for Socket.io)
❌ Vulnerable to XSS
Trade-off: Needed for WebSocket authentication
Location: route.ts:45
9. No Consent Screen
❌ OAuth2 authorization flow has no user consent
❌ Users don't see what data is being shared
Impact: Fine for first-party app, required for third-party
10. MongoDB Single Point of Failure
❌ Database down = no authentication
❌ No caching of refresh tokens
Mitigation: Add Redis cache, MongoDB replica set
11. No Audit Logging
❌ No tracking of login attempts, IP addresses
❌ Hard to detect suspicious activity
Enhancement: Add login history, failed attempt tracking
12. CORS Hardcoded Origins
ALLOWED_ORIGINS=http://localhost:3006,http://localhost:3005
❌ Must manually update for new environments
Fix: Use environment-specific configuration
Location: .env.local
🔧 RECOMMENDED IMPROVEMENTS
Priority 1: Security
Implement Refresh Token Rotation
// Issue new refresh token on each use
// Mark old token as 'used'
// Detect token replay attacks
Add MFA Support
// TOTP (Google Authenticator)
// SMS verification
// WebAuthn (hardware keys)
Remove wsToken from Client-Side
// Use HTTP-only cookie for WebSocket auth
// Upgrade Socket.io configuration
Priority 2: Reliability
Add Redis Cache
// Cache refresh tokens in Redis
// Reduce DB load
// Faster token validation
Implement Health Checks
// /health endpoint
// MongoDB connection check
// Return 503 if unhealthy
Priority 3: Observability
Add Audit Logging
// Track login attempts (success/failure)
// Log IP addresses, user agents
// Alert on suspicious patterns
Add Monitoring
// Prometheus metrics
// Token generation rate
// Failed authentication rate
// Token refresh rate
Priority 4: Features
Email Verification
// Send verification email on registration
// Require verification before login
Password Reset Flow
// Forgot password endpoint
// Email reset link
// Token-based reset
Account Lockout
// Lock account after 5 failed attempts
// Temporary lockout (15 minutes)
// Email notification
📋 CODE FILES REFERENCE SUMMARY
Backend (Auth Service)
File	Purpose	Key Functions
authController.js	Main auth logic	register(), login(), token(), revoke(), userinfo()
jwt.js	Token generation	generateAccessToken(), generateRefreshToken(), generateIDToken()
oauth2.js	OAuth2 utilities	generateAuthorizationCode(), validateScope(), buildAuthorizationResponse()
oauth2Middleware.js	Token verification	verifyAccessToken(), requireScope(), requireRole()
User.js	User model	comparePassword(), getOIDCUserInfo()
RefreshToken.js	Refresh token storage	Schema definition
AuthorizationCode.js	Auth code storage	Schema definition
Client.js	OAuth2 client storage	Schema definition
Frontend (Next.js)
File	Purpose	Key Functions
authSlice.ts	Redux state	login(), logout(), checkAuth(), refreshSession()
login/route.ts	Login API	Sets cookies, forwards to auth service
refresh/route.ts	Refresh API	Exchanges refresh token
logout/route.ts	Logout API	Revokes token, clears cookies
me/route.ts	User info API	Auto-refresh on 401
login/page.tsx	Login UI	Form, validation, Redux dispatch
middleware.ts	Route protection	Checks cookies, redirects
API Gateway
File	Purpose	Configuration
nginx.conf	NGINX config	Rate limiting, CORS, routing
🎯 CONCLUSION
Your authentication system is well-architected with:
✅ OAuth2/OIDC standards compliance
✅ Good security practices (HTTP-only cookies, token expiry, revocation)
✅ Seamless user experience (auto-refresh, long sessions)
✅ Scalable microservices architecture
Key Strengths:
Automatic token refresh (transparent to user)
Secure cookie storage (XSS protection)
Microservices can verify tokens independently
Clean separation of concerns
Areas for Improvement:
Add refresh token rotation (security)
Implement MFA (security)
Add audit logging (observability)
Improve error handling (reliability)
Add email verification (trust)
Overall Grade: B+ / A-
(Excellent foundation, needs some security hardening for production)
Update Todos

Explore authentication service structure and configuration

Analyze backend login endpoints and OAuth/OIDC implementation

Examine frontend login flow and authentication logic

Document refresh token mechanism

Document logout implementation

Provide comprehensive explanation with pros and cons
I've provided you with a complete end-to-end explanation of your authentication system! The explanation covers:
Complete visual flow diagrams for login, refresh, and logout
All token types with real payload examples
OAuth2/OIDC flows (both implemented and potential)
Security features with code examples and file locations
Scenario analysis (what happens when things go wrong)
Comprehensive pros and cons with specific issues identified
Recommended improvements prioritized by importance
File reference table for quick navigation
The key insight is that you have a custom OAuth2/OIDC implementation (not using Hydra or Auth0) with HTTP-only cookies for security, automatic token refresh for UX, and a clean microservices architecture. The main areas to improve are refresh token rotation, MFA support, and better observability. Would you like me to help implement any of the recommended improvements, or do you have specific questions about any part of the authentication flow?
implement refresh token rotationend to end and also test it
I'll implement refresh token rotation end-to-end and test it thoroughly.
Update Todos

Update RefreshToken model to support token rotation tracking

Implement token rotation logic in ba