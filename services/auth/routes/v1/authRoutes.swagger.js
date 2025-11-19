/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user
 *     description: Create a new user account
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: password123
 *               name:
 *                 type: string
 *                 example: John Doe
 *               given_name:
 *                 type: string
 *                 example: John
 *               family_name:
 *                 type: string
 *                 example: Doe
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: conflict
 *               error_description: Email already registered
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: User login and obtain authorization code
 *     description: Authenticate user and start OAuth2 authorization flow
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - client_id
 *               - redirect_uri
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *               client_id:
 *                 type: string
 *                 example: ecommerce-client
 *               redirect_uri:
 *                 type: string
 *                 format: uri
 *                 example: http://localhost:3005/callback
 *               scope:
 *                 type: string
 *                 example: openid profile email
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: string
 *                   description: Authorization code
 *                   example: abc123xyz789
 *                 redirect_uri:
 *                   type: string
 *                   example: http://localhost:3005/callback
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: invalid_credentials
 *               error_description: Invalid email or password
 */

/**
 * @swagger
 * /oauth/token:
 *   post:
 *     tags:
 *       - OAuth2
 *     summary: Exchange authorization code or refresh token for access token
 *     description: |
 *       OAuth2 token endpoint supporting:
 *       - Authorization code grant
 *       - Refresh token grant
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 title: Authorization Code Grant
 *                 required:
 *                   - grant_type
 *                   - code
 *                   - client_id
 *                   - client_secret
 *                 properties:
 *                   grant_type:
 *                     type: string
 *                     enum: [authorization_code]
 *                     example: authorization_code
 *                   code:
 *                     type: string
 *                     example: abc123xyz789
 *                   client_id:
 *                     type: string
 *                     example: ecommerce-client
 *                   client_secret:
 *                     type: string
 *                     example: ecommerce-secret
 *                   redirect_uri:
 *                     type: string
 *                     example: http://localhost:3005/callback
 *               - type: object
 *                 title: Refresh Token Grant
 *                 required:
 *                   - grant_type
 *                   - refresh_token
 *                   - client_id
 *                 properties:
 *                   grant_type:
 *                     type: string
 *                     enum: [refresh_token]
 *                     example: refresh_token
 *                   refresh_token:
 *                     type: string
 *                     example: a1b2c3d4-e5f6-7890-abcd-ef1234567890
 *                   client_id:
 *                     type: string
 *                     example: ecommerce-client
 *     responses:
 *       200:
 *         description: Tokens issued successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenResponse'
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Invalid client credentials or token
 */

/**
 * @swagger
 * /oauth/userinfo:
 *   get:
 *     tags:
 *       - OIDC
 *     summary: Get user information
 *     description: OpenID Connect UserInfo endpoint
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserInfo'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /oauth/revoke:
 *   post:
 *     tags:
 *       - OAuth2
 *     summary: Revoke access or refresh token
 *     description: Revoke a token to log out the user
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token to revoke (optional, uses Authorization header if not provided)
 *               token_type_hint:
 *                 type: string
 *                 enum: [access_token, refresh_token]
 *                 description: Hint about the type of token
 *     responses:
 *       200:
 *         description: Token revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Token revoked successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */

/**
 * @swagger
 * /.well-known/openid-configuration:
 *   get:
 *     tags:
 *       - OIDC
 *     summary: OpenID Connect Discovery
 *     description: Get OpenID Connect configuration metadata
 *     security: []
 *     responses:
 *       200:
 *         description: OIDC configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 issuer:
 *                   type: string
 *                   example: http://localhost:3000
 *                 authorization_endpoint:
 *                   type: string
 *                   example: http://localhost:3000/api/v1/oauth/authorize
 *                 token_endpoint:
 *                   type: string
 *                   example: http://localhost:3000/api/v1/oauth/token
 *                 userinfo_endpoint:
 *                   type: string
 *                   example: http://localhost:3000/api/v1/oauth/userinfo
 *                 jwks_uri:
 *                   type: string
 *                   example: http://localhost:3000/api/v1/oauth/jwks
 *                 response_types_supported:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [code, id_token, token id_token]
 *                 grant_types_supported:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [authorization_code, refresh_token]
 *                 subject_types_supported:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [public]
 *                 id_token_signing_alg_values_supported:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [HS256]
 *                 scopes_supported:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [openid, profile, email]
 */

module.exports = {};
