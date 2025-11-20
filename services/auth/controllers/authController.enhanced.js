/**
 * Authentication Controller
 * Handles user registration, login, OAuth2 flows, and OIDC endpoints
 *
 * @module controllers/authController
 * @requires models/User
 * @requires models/Client
 * @requires models/AuthorizationCode
 * @requires models/RefreshToken
 * @requires utils/jwt
 * @requires utils/oauth2
 */

const User = require('../models/User');
const Client = require('../models/Client');
const AuthorizationCode = require('../models/AuthorizationCode');
const RefreshToken = require('../models/RefreshToken');
const JWTManager = require('../utils/jwt');
const OAuth2Utils = require('../utils/oauth2');

/**
 * Register a new user account
 *
 * @route POST /api/v1/auth/register
 * @access Public
 * @param {Object} req.body - User registration data
 * @param {string} req.body.email - User's email address (required, unique)
 * @param {string} req.body.password - User's password (required, min 6 chars)
 * @param {string} req.body.name - User's full name (required)
 * @param {string} [req.body.given_name] - User's first name (optional)
 * @param {string} [req.body.family_name] - User's last name (optional)
 * @returns {Object} 201 - User registered successfully
 * @returns {Object} 400 - Validation error or duplicate email
 * @returns {Object} 500 - Server error
 */
exports.register = async (req, res) => {
  try {
    const { email, password, name, given_name, family_name } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Email, password, and name are required fields',
        fields: {
          email: !email ? 'Email is required' : null,
          password: !password ? 'Password is required' : null,
          name: !name ? 'Name is required' : null
        }
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate Email',
        message: 'An account with this email address already exists',
        suggestion: 'Try logging in instead or use a different email address'
      });
    }

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      password, // Will be hashed by the model's pre-save hook
      name,
      given_name: given_name || name.split(' ')[0],
      family_name: family_name || name.split(' ').slice(1).join(' '),
      roles: ['user'], // Default role
      email_verified: false // Email verification required
    });

    // Save user to database
    await user.save();

    // Return success response (exclude sensitive data)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          roles: user.roles
        }
      },
      nextStep: 'Please log in with your credentials'
    });

  } catch (error) {
    // Log error for debugging
    console.error('Registration error:', error);

    // Handle MongoDB validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = {};
      Object.keys(error.errors).forEach(key => {
        validationErrors[key] = error.errors[key].message;
      });

      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Please check the provided information',
        fields: validationErrors
      });
    }

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate Email',
        message: 'An account with this email already exists'
      });
    }

    // Generic server error
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: 'An unexpected error occurred during registration',
      suggestion: 'Please try again later or contact support if the problem persists'
    });
  }
};

/**
 * User login - Supports both direct login and OAuth2 authorization code flow
 *
 * @route POST /api/v1/auth/login
 * @access Public
 * @param {Object} req.body - Login credentials
 * @param {string} req.body.email - User's email address (required)
 * @param {string} req.body.password - User's password (required)
 * @param {string} [req.body.client_id] - OAuth2 client ID (for OAuth2 flow)
 * @param {string} [req.body.redirect_uri] - OAuth2 redirect URI
 * @param {string} [req.body.scope] - OAuth2 requested scopes
 * @param {string} [req.body.state] - OAuth2 state parameter
 * @returns {Object} 200 - Login successful (direct login returns tokens, OAuth2 returns auth code)
 * @returns {Object} 400 - Missing credentials
 * @returns {Object} 401 - Invalid credentials or inactive account
 * @returns {Object} 500 - Server error
 */
exports.login = async (req, res) => {
  try {
    const { email, password, client_id, redirect_uri, scope, state, nonce, response_type } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Email and password are required',
        fields: {
          email: !email ? 'Email is required' : null,
          password: !password ? 'Password is required' : null
        }
      });
    }

    // Find user and verify credentials
    const user = await User.findOne({ email: email.toLowerCase(), isActive: true });

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Failed',
        message: 'Invalid email or password',
        suggestion: 'Please check your credentials and try again'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Failed',
        message: 'Invalid email or password',
        suggestion: 'Please check your credentials and try again'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account Inactive',
        message: 'Your account has been deactivated',
        suggestion: 'Please contact support to reactivate your account'
      });
    }

    // FLOW 1: Direct Login (No OAuth2 client_id provided)
    // Returns access token, refresh token, and ID token directly
    if (!client_id) {
      try {
        // Define default scopes for direct login
        const defaultScope = ['openid', 'profile', 'email'];

        // Generate JWT tokens
        const accessToken = JWTManager.generateAccessToken(user, defaultScope);
        const refreshTokenString = JWTManager.generateRefreshToken();
        const idToken = JWTManager.generateIDToken(user);

        // Store refresh token in database
        const refreshToken = new RefreshToken({
          token: refreshTokenString,
          client_id: process.env.DEFAULT_CLIENT_ID || 'ecommerce-client',
          user_id: user._id,
          scope: defaultScope,
          expires_at: OAuth2Utils.calculateExpiry(process.env.REFRESH_TOKEN_EXPIRY || '7d')
        });
        await refreshToken.save();

        // Return tokens directly
        return res.status(200).json({
          success: true,
          message: 'Login successful',
          data: {
            accessToken,
            refreshToken: refreshTokenString,
            idToken,
            tokenType: 'Bearer',
            expiresIn: 900, // 15 minutes in seconds
            user: user.getOIDCUserInfo()
          }
        });
      } catch (tokenError) {
        console.error('Token generation error:', tokenError);
        return res.status(500).json({
          success: false,
          error: 'Token Generation Failed',
          message: 'Failed to generate authentication tokens',
          suggestion: 'Please try logging in again'
        });
      }
    }

    // FLOW 2: OAuth2 Authorization Code Flow
    // Returns authorization code for token exchange
    try {
      // Validate OAuth2 client
      const client = await Client.findOne({ client_id, isActive: true });
      if (!client) {
        return res.status(401).json({
          success: false,
          error: 'Invalid Client',
          message: 'The OAuth2 client is not recognized or inactive',
          suggestion: 'Please verify your client credentials'
        });
      }

      // Validate redirect URI
      if (redirect_uri && !client.redirect_uris.includes(redirect_uri)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Redirect URI',
          message: 'The provided redirect URI is not registered for this client',
          suggestion: 'Use one of the registered redirect URIs'
        });
      }

      // Generate authorization code
      const code = OAuth2Utils.generateAuthorizationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store authorization code
      const authCode = new AuthorizationCode({
        code,
        client_id,
        user_id: user._id,
        redirect_uri: redirect_uri || client.redirect_uris[0],
        scope: OAuth2Utils.parseScope(scope) || ['openid', 'profile', 'email'],
        expires_at: expiresAt,
        used: false,
        nonce
      });
      await authCode.save();

      // Build redirect URL with authorization code
      const redirectUrl = OAuth2Utils.buildAuthorizationResponse(
        redirect_uri || client.redirect_uris[0],
        code,
        state
      );

      // Return authorization code response
      res.status(200).json({
        success: true,
        message: 'Authorization code generated successfully',
        data: {
          code,
          redirectUri: redirectUrl,
          expiresIn: 600 // 10 minutes in seconds
        },
        nextStep: 'Exchange this code for tokens at the token endpoint'
      });

    } catch (oauth2Error) {
      console.error('OAuth2 flow error:', oauth2Error);
      return res.status(500).json({
        success: false,
        error: 'OAuth2 Error',
        message: 'Failed to process OAuth2 authorization',
        suggestion: 'Please try again or contact support'
      });
    }

  } catch (error) {
    // Log error for debugging
    console.error('Login error:', error);

    // Generic server error
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: 'An unexpected error occurred during login',
      suggestion: 'Please try again later'
    });
  }
};

/**
 * OAuth2 Authorization Endpoint
 * Initiates the OAuth2 authorization flow
 *
 * @route GET /api/v1/auth/oauth/authorize
 * @access Public
 * @param {string} req.query.response_type - OAuth2 response type (usually 'code')
 * @param {string} req.query.client_id - OAuth2 client identifier
 * @param {string} req.query.redirect_uri - Where to redirect after authorization
 * @param {string} [req.query.scope] - Requested scopes (space-separated)
 * @param {string} [req.query.state] - State parameter for CSRF protection
 * @param {string} [req.query.nonce] - Nonce for OIDC
 * @returns {Object} 200 - Authorization request accepted
 * @returns {Object} 400 - Invalid request parameters
 * @returns {Object} 401 - Invalid or inactive client
 * @returns {Object} 500 - Server error
 */
exports.authorize = async (req, res) => {
  try {
    const {
      response_type,
      client_id,
      redirect_uri,
      scope,
      state,
      nonce
    } = req.query;

    // Validate required OAuth2 parameters
    if (!response_type || !client_id || !redirect_uri) {
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        error_description: 'Missing required OAuth2 parameters',
        message: 'response_type, client_id, and redirect_uri are required',
        receivedParams: {
          response_type: !!response_type,
          client_id: !!client_id,
          redirect_uri: !!redirect_uri
        }
      });
    }

    // Validate and retrieve OAuth2 client
    const client = await Client.findOne({ client_id, isActive: true });
    if (!client) {
      return res.status(401).json({
        success: false,
        error: 'invalid_client',
        error_description: 'Client not found or inactive',
        message: 'The provided client_id is not recognized'
      });
    }

    // Validate redirect URI against registered URIs
    if (!OAuth2Utils.validateRedirectUri(redirect_uri, client.redirect_uris)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        error_description: 'Invalid redirect_uri',
        message: 'The redirect_uri is not registered for this client',
        registeredUris: client.redirect_uris
      });
    }

    // Validate response_type
    if (!client.response_types.includes(response_type)) {
      const errorUrl = OAuth2Utils.buildErrorResponse(
        redirect_uri,
        'unsupported_response_type',
        `Response type '${response_type}' is not supported`,
        state
      );
      return res.redirect(errorUrl);
    }

    // Parse and validate requested scopes
    const requestedScope = OAuth2Utils.parseScope(scope);
    if (!OAuth2Utils.validateScope(scope, client.scope)) {
      const errorUrl = OAuth2Utils.buildErrorResponse(
        redirect_uri,
        'invalid_scope',
        'Requested scope is invalid or not allowed',
        state
      );
      return res.redirect(errorUrl);
    }

    // Return authorization details for user consent
    res.status(200).json({
      success: true,
      message: 'Authorization request received',
      data: {
        clientName: client.client_name,
        clientDescription: client.description,
        requestedScopes: requestedScope,
        scopeDescriptions: requestedScope.map(s => ({
          scope: s,
          description: getScopeDescription(s)
        }))
      },
      nextStep: 'User should authenticate at /auth/login with these parameters'
    });

  } catch (error) {
    console.error('Authorization error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      error_description: 'An unexpected error occurred',
      message: 'Failed to process authorization request'
    });
  }
};

/**
 * OAuth2 Token Endpoint
 * Exchanges authorization code or refresh token for access tokens
 *
 * @route POST /api/v1/auth/oauth/token
 * @access Public
 * @param {string} req.body.grant_type - Grant type ('authorization_code' or 'refresh_token')
 * @param {string} [req.body.code] - Authorization code (for authorization_code grant)
 * @param {string} [req.body.refresh_token] - Refresh token (for refresh_token grant)
 * @param {string} req.body.client_id - OAuth2 client ID
 * @param {string} req.body.client_secret - OAuth2 client secret
 * @param {string} [req.body.redirect_uri] - Redirect URI (must match authorization request)
 * @returns {Object} 200 - Tokens issued successfully
 * @returns {Object} 400 - Invalid grant or request
 * @returns {Object} 401 - Invalid client credentials
 * @returns {Object} 500 - Server error
 */
exports.token = async (req, res) => {
  try {
    const { grant_type, code, refresh_token, client_id, client_secret, redirect_uri } = req.body;

    // Validate required fields
    if (!grant_type || !client_id || !client_secret) {
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        error_description: 'Missing required parameters',
        message: 'grant_type, client_id, and client_secret are required'
      });
    }

    // Validate client credentials
    const client = await Client.findOne({ client_id, isActive: true });
    if (!client || client.client_secret !== client_secret) {
      return res.status(401).json({
        success: false,
        error: 'invalid_client',
        error_description: 'Invalid client credentials',
        message: 'Client authentication failed'
      });
    }

    // Route to appropriate grant type handler
    if (grant_type === 'authorization_code') {
      return await handleAuthorizationCodeGrant(req, res, client);
    } else if (grant_type === 'refresh_token') {
      return await handleRefreshTokenGrant(req, res, client);
    } else {
      return res.status(400).json({
        success: false,
        error: 'unsupported_grant_type',
        error_description: `Grant type '${grant_type}' is not supported`,
        message: 'Only authorization_code and refresh_token grant types are supported',
        supportedGrants: ['authorization_code', 'refresh_token']
      });
    }

  } catch (error) {
    console.error('Token endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      error_description: 'An unexpected error occurred',
      message: 'Failed to process token request'
    });
  }
};

/**
 * Handle authorization code grant type
 * Internal helper function for token endpoint
 *
 * @private
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} client - OAuth2 client document
 * @returns {Promise<Object>} Token response
 */
async function handleAuthorizationCodeGrant(req, res, client) {
  try {
    const { code, redirect_uri } = req.body;

    // Validate authorization code presence
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        error_description: 'Authorization code is required',
        message: 'The code parameter is missing'
      });
    }

    // Find and validate authorization code
    const authCode = await AuthorizationCode.findOne({
      code,
      client_id: client.client_id,
      used: false
    }).populate('user_id');

    if (!authCode) {
      return res.status(400).json({
        success: false,
        error: 'invalid_grant',
        error_description: 'Invalid or expired authorization code',
        message: 'The provided authorization code is not valid',
        suggestion: 'Request a new authorization code'
      });
    }

    // Check if code has expired
    if (new Date() > authCode.expires_at) {
      return res.status(400).json({
        success: false,
        error: 'invalid_grant',
        error_description: 'Authorization code expired',
        message: 'The authorization code has expired',
        expiredAt: authCode.expires_at,
        suggestion: 'Request a new authorization code'
      });
    }

    // Validate redirect URI matches
    if (authCode.redirect_uri !== redirect_uri) {
      return res.status(400).json({
        success: false,
        error: 'invalid_grant',
        error_description: 'Redirect URI mismatch',
        message: 'The redirect_uri does not match the authorization request',
        expected: authCode.redirect_uri,
        received: redirect_uri
      });
    }

    // Mark authorization code as used (prevents replay attacks)
    authCode.used = true;
    await authCode.save();

    const user = authCode.user_id;

    // Generate tokens
    const accessToken = JWTManager.generateAccessToken(user, authCode.scope);
    const refreshTokenString = JWTManager.generateRefreshToken();

    // Store refresh token
    const refreshToken = new RefreshToken({
      token: refreshTokenString,
      client_id: client.client_id,
      user_id: user._id,
      scope: authCode.scope,
      expires_at: OAuth2Utils.calculateExpiry(process.env.REFRESH_TOKEN_EXPIRY || '7d')
    });
    await refreshToken.save();

    // Build token response
    const response = {
      success: true,
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 900, // 15 minutes
      refresh_token: refreshTokenString,
      scope: authCode.scope.join(' ')
    };

    // Include ID token if OpenID Connect scope was requested
    if (OAuth2Utils.isOpenIDRequest(authCode.scope)) {
      response.id_token = JWTManager.generateIDToken(user, authCode.nonce);
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('Authorization code grant error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      error_description: 'Failed to process authorization code grant',
      message: 'An error occurred while exchanging the authorization code'
    });
  }
}

/**
 * Handle refresh token grant type
 * Internal helper function for token endpoint
 *
 * @private
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} client - OAuth2 client document
 * @returns {Promise<Object>} Token response
 */
async function handleRefreshTokenGrant(req, res, client) {
  try {
    const { refresh_token } = req.body;

    // Validate refresh token presence
    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        error_description: 'Refresh token is required',
        message: 'The refresh_token parameter is missing'
      });
    }

    // Find and validate refresh token
    const tokenDoc = await RefreshToken.findOne({
      token: refresh_token,
      client_id: client.client_id,
      revoked: false
    }).populate('user_id');

    if (!tokenDoc) {
      return res.status(400).json({
        success: false,
        error: 'invalid_grant',
        error_description: 'Invalid refresh token',
        message: 'The provided refresh token is not valid or has been revoked',
        suggestion: 'Re-authenticate to obtain new tokens'
      });
    }

    // Check if refresh token has expired
    if (new Date() > tokenDoc.expires_at) {
      return res.status(400).json({
        success: false,
        error: 'invalid_grant',
        error_description: 'Refresh token expired',
        message: 'The refresh token has expired',
        expiredAt: tokenDoc.expires_at,
        suggestion: 'Re-authenticate to obtain new tokens'
      });
    }

    const user = tokenDoc.user_id;

    // Generate new access token (and optionally new refresh token)
    const accessToken = JWTManager.generateAccessToken(user, tokenDoc.scope);

    // Build token response
    const response = {
      success: true,
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 900, // 15 minutes
      scope: tokenDoc.scope.join(' ')
    };

    // Include ID token if OpenID Connect scope was requested
    if (OAuth2Utils.isOpenIDRequest(tokenDoc.scope)) {
      response.id_token = JWTManager.generateIDToken(user);
    }

    // Optionally rotate refresh token for enhanced security
    if (process.env.ROTATE_REFRESH_TOKENS === 'true') {
      const newRefreshToken = JWTManager.generateRefreshToken();

      // Revoke old refresh token
      tokenDoc.revoked = true;
      await tokenDoc.save();

      // Create new refresh token
      const newTokenDoc = new RefreshToken({
        token: newRefreshToken,
        client_id: client.client_id,
        user_id: user._id,
        scope: tokenDoc.scope,
        expires_at: OAuth2Utils.calculateExpiry(process.env.REFRESH_TOKEN_EXPIRY || '7d')
      });
      await newTokenDoc.save();

      response.refresh_token = newRefreshToken;
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('Refresh token grant error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      error_description: 'Failed to process refresh token grant',
      message: 'An error occurred while refreshing the access token'
    });
  }
}

/**
 * OpenID Connect UserInfo Endpoint
 * Returns user information for the authenticated user
 *
 * @route GET /api/v1/auth/oauth/userinfo
 * @access Protected (requires valid access token)
 * @returns {Object} 200 - User information
 * @returns {Object} 401 - Unauthorized (invalid or missing token)
 * @returns {Object} 404 - User not found
 * @returns {Object} 500 - Server error
 */
exports.userinfo = async (req, res) => {
  try {
    // User ID is extracted from JWT by verifyAccessToken middleware
    const userId = req.user.sub;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        error_description: 'Invalid token',
        message: 'The access token does not contain a valid user ID'
      });
    }

    // Retrieve user from database
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
        error_description: 'User not found',
        message: 'The user associated with this token no longer exists'
      });
    }

    // Check if user account is still active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'account_inactive',
        error_description: 'User account is inactive',
        message: 'This user account has been deactivated'
      });
    }

    // Return OIDC-compliant user information
    res.status(200).json({
      success: true,
      ...user.getOIDCUserInfo()
    });

  } catch (error) {
    console.error('UserInfo endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      error_description: 'An unexpected error occurred',
      message: 'Failed to retrieve user information'
    });
  }
};

/**
 * OAuth2 Token Revocation Endpoint
 * Revokes refresh tokens to invalidate sessions
 *
 * @route POST /api/v1/auth/oauth/revoke
 * @access Public
 * @param {string} req.body.token - Token to revoke (refresh token)
 * @param {string} [req.body.token_type_hint] - Type of token being revoked
 * @returns {Object} 200 - Token revoked successfully
 * @returns {Object} 400 - Invalid request
 * @returns {Object} 500 - Server error
 */
exports.revoke = async (req, res) => {
  try {
    const { token, token_type_hint } = req.body;

    // Validate token parameter
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'invalid_request',
        error_description: 'Token is required',
        message: 'The token parameter must be provided'
      });
    }

    // Find and revoke refresh token
    const refreshToken = await RefreshToken.findOne({ token });

    if (refreshToken) {
      refreshToken.revoked = true;
      refreshToken.revoked_at = new Date();
      await refreshToken.save();

      return res.status(200).json({
        success: true,
        message: 'Token revoked successfully',
        revokedAt: refreshToken.revoked_at
      });
    }

    // Token not found, but still return success per RFC 7009
    // (prevents token scanning attacks)
    res.status(200).json({
      success: true,
      message: 'Token revoked successfully'
    });

  } catch (error) {
    console.error('Token revocation error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      error_description: 'An unexpected error occurred',
      message: 'Failed to revoke token'
    });
  }
};

/**
 * OpenID Connect Discovery Endpoint
 * Returns OAuth2/OIDC provider configuration
 *
 * @route GET /api/v1/auth/.well-known/openid-configuration
 * @access Public
 * @returns {Object} 200 - OIDC discovery document
 */
exports.discovery = (req, res) => {
  const issuer = process.env.ISSUER || 'http://localhost:3000';

  res.status(200).json({
    issuer,
    authorization_endpoint: `${issuer}/api/v1/auth/oauth/authorize`,
    token_endpoint: `${issuer}/api/v1/auth/oauth/token`,
    userinfo_endpoint: `${issuer}/api/v1/auth/oauth/userinfo`,
    revocation_endpoint: `${issuer}/api/v1/auth/oauth/revoke`,
    jwks_uri: `${issuer}/.well-known/jwks.json`,
    response_types_supported: ['code', 'token', 'id_token'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['HS256'],
    scopes_supported: ['openid', 'profile', 'email', 'address', 'phone'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
    claims_supported: [
      'sub', 'email', 'email_verified', 'name', 'given_name',
      'family_name', 'picture', 'phone_number', 'phone_number_verified',
      'address', 'updated_at'
    ],
    code_challenge_methods_supported: ['S256'], // PKCE support
    service_documentation: `${issuer}/docs`,
    ui_locales_supported: ['en-US'],
    op_policy_uri: `${issuer}/policy`,
    op_tos_uri: `${issuer}/terms`
  });
};

/**
 * Helper function to get human-readable scope descriptions
 *
 * @private
 * @param {string} scope - OAuth2 scope name
 * @returns {string} Human-readable description
 */
function getScopeDescription(scope) {
  const descriptions = {
    'openid': 'Access your identity information',
    'profile': 'Access your profile information (name, picture)',
    'email': 'Access your email address',
    'address': 'Access your physical address',
    'phone': 'Access your phone number',
    'offline_access': 'Maintain access when you are offline'
  };

  return descriptions[scope] || `Access ${scope} information`;
}

module.exports = exports;
