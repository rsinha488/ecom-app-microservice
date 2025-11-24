const User = require('../models/User');
const Client = require('../models/Client');
const AuthorizationCode = require('../models/AuthorizationCode');
const RefreshToken = require('../models/RefreshToken');
const JWTManager = require('../utils/jwt');
const OAuth2Utils = require('../utils/oauth2');

/**
 * Register new user
 */
exports.register = async (req, res) => {
  try {
    const { email, password, name, given_name, family_name } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'DuplicateEmail',
        message: 'Email already exists. Please use a different email or login.'
      });
    }

    const user = new User({
      email,
      password,
      name,
      given_name,
      family_name,
      roles: ['user']
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name
        }
      }
    });
  } catch (error) {
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'DuplicateEmail',
        message: 'Email already exists. Please use a different email or login.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'ServerError',
      message: error.message
    });
  }
};

/**
 * Direct login (simplified for frontend apps)
 * POST /auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password, client_id, redirect_uri, scope, state, nonce, response_type } = req.body;

    // Authenticate user
    const user = await User.findOne({ email, isActive: true });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        message: 'Invalid credentials'
      });
    }

    // If this is a direct login (no OAuth params), return tokens directly
    if (!client_id) {
      // Generate tokens
      const defaultScope = ['openid', 'profile', 'email'];
      const accessToken = JWTManager.generateAccessToken(user, defaultScope);
      const refreshTokenString = JWTManager.generateRefreshToken();
      const idToken = JWTManager.generateIDToken(user);

      // Create a new token family for this login session
      const familyId = JWTManager.generateRefreshToken(); // Use UUID for family ID

      // Store refresh token with family tracking
      const refreshToken = new RefreshToken({
        token: refreshTokenString,
        client_id: process.env.DEFAULT_CLIENT_ID || 'ecommerce-client',
        user_id: user._id,
        scope: defaultScope,
        expires_at: OAuth2Utils.calculateExpiry(process.env.REFRESH_TOKEN_EXPIRY || '7d'),
        family_id: familyId,
        used: false
      });
      await refreshToken.save();

      return res.json({
        accessToken,
        refreshToken: refreshTokenString,
        idToken,
        user: user.getOIDCUserInfo(),
        expiresIn: 900
      });
    }

    // OAuth2 flow (original logic)
    const client = await Client.findOne({ client_id, isActive: true });
    if (!client) {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Client not found'
      });
    }

    const code = OAuth2Utils.generateAuthorizationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const authCode = new AuthorizationCode({
      code,
      client_id,
      user_id: user._id,
      redirect_uri,
      scope: OAuth2Utils.parseScope(scope),
      expires_at: expiresAt,
      used: false
    });

    await authCode.save();

    const redirectUrl = OAuth2Utils.buildAuthorizationResponse(redirect_uri, code, state);

    res.json({
      message: 'Login successful',
      redirect_uri: redirectUrl
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Authorization Endpoint (OAuth2 + OIDC)
 * GET /oauth/authorize
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

    // Validate required parameters
    if (!response_type || !client_id || !redirect_uri) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing required parameters'
      });
    }

    // Validate client
    const client = await Client.findOne({ client_id, isActive: true });
    if (!client) {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Client not found or inactive'
      });
    }

    // Validate redirect URI
    if (!OAuth2Utils.validateRedirectUri(redirect_uri, client.redirect_uris)) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Invalid redirect_uri'
      });
    }

    // Validate response_type
    if (!client.response_types.includes(response_type)) {
      const errorUrl = OAuth2Utils.buildErrorResponse(
        redirect_uri,
        'unsupported_response_type',
        'Response type not supported',
        state
      );
      return res.redirect(errorUrl);
    }

    // Validate scope
    const requestedScope = OAuth2Utils.parseScope(scope);
    if (!OAuth2Utils.validateScope(scope, client.scope)) {
      const errorUrl = OAuth2Utils.buildErrorResponse(
        redirect_uri,
        'invalid_scope',
        'Requested scope is invalid',
        state
      );
      return res.redirect(errorUrl);
    }

    res.json({
      message: 'Authorization request received',
      client_name: client.client_name,
      scope: requestedScope,
      redirect_to_login: '/auth/login'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Token Endpoint (OAuth2 + OIDC)
 * POST /oauth/token
 */
exports.token = async (req, res) => {
  try {
    const { grant_type, client_id, client_secret } = req.body;

    // Validate client credentials
    const client = await Client.findOne({ client_id, isActive: true });
    console.log('[Token] Client lookup:', {
      client_id,
      found: !!client,
      secretMatch: client ? client.client_secret === client_secret : false,
      dbSecret: client ? client.client_secret : 'N/A',
      providedSecret: client_secret
    });
    if (!client || client.client_secret !== client_secret) {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Invalid client credentials'
      });
    }

    if (grant_type === 'authorization_code') {
      return await handleAuthorizationCodeGrant(req, res, client);
    } else if (grant_type === 'refresh_token') {
      return await handleRefreshTokenGrant(req, res, client);
    } else {
      return res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: 'Grant type not supported'
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Handle authorization code grant
 */
async function handleAuthorizationCodeGrant(req, res, client) {
  const { code, redirect_uri } = req.body;

  const authCode = await AuthorizationCode.findOne({
    code,
    client_id: client.client_id,
    used: false
  }).populate('user_id');

  if (!authCode) {
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Invalid or expired authorization code'
    });
  }

  if (new Date() > authCode.expires_at) {
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Authorization code expired'
    });
  }

  if (authCode.redirect_uri !== redirect_uri) {
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Redirect URI mismatch'
    });
  }

  authCode.used = true;
  await authCode.save();

  const user = authCode.user_id;

  const accessToken = JWTManager.generateAccessToken(user, authCode.scope);
  const refreshTokenString = JWTManager.generateRefreshToken();

  // Create a new token family for this authorization
  const familyId = JWTManager.generateRefreshToken();

  const refreshToken = new RefreshToken({
    token: refreshTokenString,
    client_id: client.client_id,
    user_id: user._id,
    scope: authCode.scope,
    expires_at: OAuth2Utils.calculateExpiry(process.env.REFRESH_TOKEN_EXPIRY || '7d'),
    family_id: familyId,
    used: false
  });
  await refreshToken.save();

  const response = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 900,
    refresh_token: refreshTokenString,
    scope: authCode.scope.join(' ')
  };

  if (OAuth2Utils.isOpenIDRequest(authCode.scope)) {
    response.id_token = JWTManager.generateIDToken(user);
  }

  res.json(response);
}

/**
 * Handle refresh token grant with rotation and reuse detection
 */
async function handleRefreshTokenGrant(req, res, client) {
  const { refresh_token } = req.body;

  const tokenDoc = await RefreshToken.findOne({
    token: refresh_token,
    client_id: client.client_id,
    revoked: false
  }).populate('user_id');

  if (!tokenDoc) {
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Invalid refresh token'
    });
  }

  if (new Date() > tokenDoc.expires_at) {
    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Refresh token expired'
    });
  }

  // CRITICAL SECURITY: Detect token reuse attack
  // If a token has already been used, it means someone is trying to reuse an old token
  // This is a sign of token theft - revoke the entire token family
  if (tokenDoc.used) {
    console.warn(`[SECURITY] Token reuse detected! Token: ${refresh_token.substring(0, 8)}..., Family: ${tokenDoc.family_id.substring(0, 8)}..., User: ${tokenDoc.user_id._id}`);

    // Revoke all tokens in this family to prevent further abuse
    await RefreshToken.updateMany(
      { family_id: tokenDoc.family_id },
      { $set: { revoked: true } }
    );

    return res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Token reuse detected. All tokens in this family have been revoked for security.'
    });
  }

  const user = tokenDoc.user_id;

  // Generate new tokens
  const accessToken = JWTManager.generateAccessToken(user, tokenDoc.scope);
  const newRefreshTokenString = JWTManager.generateRefreshToken();

  // Mark the old token as used
  tokenDoc.used = true;
  tokenDoc.used_at = new Date();
  tokenDoc.replaced_by = newRefreshTokenString;
  await tokenDoc.save();

  // Create new refresh token in the same family
  const newRefreshToken = new RefreshToken({
    token: newRefreshTokenString,
    client_id: client.client_id,
    user_id: user._id,
    scope: tokenDoc.scope,
    expires_at: OAuth2Utils.calculateExpiry(process.env.REFRESH_TOKEN_EXPIRY || '7d'),
    family_id: tokenDoc.family_id, // Same family as the old token
    used: false
  });
  await newRefreshToken.save();

  const response = {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 900,
    refresh_token: newRefreshTokenString, // Return new refresh token
    scope: tokenDoc.scope.join(' ')
  };

  if (OAuth2Utils.isOpenIDRequest(tokenDoc.scope)) {
    response.id_token = JWTManager.generateIDToken(user);
  }

  res.json(response);
}

/**
 * UserInfo Endpoint (OpenID Connect)
 * GET /oauth/userinfo
 */
exports.userinfo = async (req, res) => {
  try {
    const userId = req.user.sub;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'not_found',
        error_description: 'User not found'
      });
    }

    res.json(user.getOIDCUserInfo());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Token Revocation Endpoint
 * POST /oauth/revoke
 */
exports.revoke = async (req, res) => {
  try {
    const { token, token_type_hint } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Token is required'
      });
    }

    const refreshToken = await RefreshToken.findOne({ token });
    if (refreshToken) {
      refreshToken.revoked = true;
      await refreshToken.save();
    }

    res.json({ message: 'Token revoked successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * OpenID Connect Discovery Endpoint
 * GET /.well-known/openid-configuration
 */
exports.discovery = (req, res) => {
  const issuer = process.env.ISSUER || 'http://localhost:3000';

  res.json({
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    userinfo_endpoint: `${issuer}/oauth/userinfo`,
    revocation_endpoint: `${issuer}/oauth/revoke`,
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
    ]
  });
};

module.exports = exports;
