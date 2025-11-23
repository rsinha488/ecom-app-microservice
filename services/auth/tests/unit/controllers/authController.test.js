const User = require('../../../models/User');
const Client = require('../../../models/Client');
const AuthorizationCode = require('../../../models/AuthorizationCode');
const RefreshToken = require('../../../models/RefreshToken');
const authController = require('../../../controllers/authController');
const JWTManager = require('../../../utils/jwt');
const OAuth2Utils = require('../../../utils/oauth2');
const fixtures = require('../../fixtures/users.json');

// Mock all dependencies
jest.mock('../../../models/User');
jest.mock('../../../models/Client');
jest.mock('../../../models/AuthorizationCode');
jest.mock('../../../models/RefreshToken');
jest.mock('../../../utils/jwt');
jest.mock('../../../utils/oauth2');

describe('Auth Controller - User Registration', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      user: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('register()', () => {
    // TC-AUTH-001: User Registration - Valid Data
    test('TC-AUTH-001: Should register user with valid data', async () => {
      // Arrange
      req.body = fixtures.validUser;

      User.findOne.mockResolvedValue(null); // User doesn't exist

      const savedUser = {
        _id: '507f1f77bcf86cd799439011',
        email: fixtures.validUser.email,
        name: fixtures.validUser.name,
        save: jest.fn().mockResolvedValue(true)
      };

      User.mockImplementation(() => savedUser);

      // Act
      await authController.register(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: fixtures.validUser.email });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'User registered successfully',
          data: expect.objectContaining({
            user: expect.objectContaining({
              email: fixtures.validUser.email
            })
          })
        })
      );
    });

    // TC-AUTH-002: User Registration - Duplicate Email
    test('TC-AUTH-002: Should reject registration with duplicate email', async () => {
      // Arrange
      req.body = fixtures.validUser;
      User.findOne.mockResolvedValue(fixtures.existingUser); // User exists

      // Act
      await authController.register(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ email: fixtures.validUser.email });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'DuplicateEmail',
          message: 'Email already exists. Please use a different email or login.'
        })
      );
    });

    // TC-AUTH-003: User Registration - Missing Required Fields
    test('TC-AUTH-003: Should handle missing required fields', async () => {
      // Arrange
      req.body = { email: 'test@example.com' }; // Missing password and name

      User.findOne.mockResolvedValue(null);

      const error = new Error('Validation failed');
      User.mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(error)
      }));

      // Act
      await authController.register(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'ServerError',
          message: 'Validation failed'
        })
      );
    });
  });

  describe('login()', () => {
    // TC-AUTH-005: User Login - Valid Credentials (Direct Login)
    test('TC-AUTH-005: Should login user with valid credentials (direct login)', async () => {
      // Arrange
      req.body = {
        email: fixtures.validUser.email,
        password: fixtures.validUser.password
      };

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: fixtures.validUser.email,
        comparePassword: jest.fn().mockResolvedValue(true),
        getOIDCUserInfo: jest.fn().mockReturnValue({
          sub: '507f1f77bcf86cd799439011',
          email: fixtures.validUser.email,
          name: fixtures.validUser.name,
          email_verified: false,
          roles: ['user']
        })
      };

      User.findOne.mockResolvedValue(mockUser);
      JWTManager.generateAccessToken.mockReturnValue('mock-access-token');
      JWTManager.generateRefreshToken.mockReturnValue('mock-refresh-token');
      JWTManager.generateIDToken.mockReturnValue('mock-id-token');

      RefreshToken.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(true)
      }));

      // Act
      await authController.login(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({
        email: fixtures.validUser.email,
        isActive: true
      });
      expect(mockUser.comparePassword).toHaveBeenCalledWith(fixtures.validUser.password);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          idToken: 'mock-id-token'
        })
      );
    });

    // TC-AUTH-006: User Login - Invalid Credentials
    test('TC-AUTH-006: Should reject login with invalid credentials', async () => {
      // Arrange
      req.body = {
        email: fixtures.validUser.email,
        password: 'WrongPassword123!'
      };

      const mockUser = {
        comparePassword: jest.fn().mockResolvedValue(false)
      };

      User.findOne.mockResolvedValue(mockUser);

      // Act
      await authController.login(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    // TC-AUTH-007: User Login - Non-existent User
    test('TC-AUTH-007: Should reject login for non-existent user', async () => {
      // Arrange
      req.body = {
        email: 'nonexistent@example.com',
        password: 'Password123!'
      };

      User.findOne.mockResolvedValue(null);

      // Act
      await authController.login(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });

    // TC-AUTH-008: OAuth2 Login - Authorization Code Flow
    test('TC-AUTH-008: Should handle OAuth2 authorization code flow', async () => {
      // Arrange
      req.body = {
        email: fixtures.validUser.email,
        password: fixtures.validUser.password,
        client_id: 'ecommerce-client',
        redirect_uri: 'http://localhost:3006/callback',
        scope: 'openid profile email',
        state: 'random-state'
      };

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: fixtures.validUser.email,
        comparePassword: jest.fn().mockResolvedValue(true)
      };

      const mockClient = {
        client_id: 'ecommerce-client',
        isActive: true
      };

      User.findOne.mockResolvedValue(mockUser);
      Client.findOne.mockResolvedValue(mockClient);
      OAuth2Utils.generateAuthorizationCode.mockReturnValue('auth-code-123');
      OAuth2Utils.parseScope.mockReturnValue(['openid', 'profile', 'email']);
      OAuth2Utils.buildAuthorizationResponse.mockReturnValue('http://localhost:3006/callback?code=auth-code-123&state=random-state');

      AuthorizationCode.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(true)
      }));

      // Act
      await authController.login(req, res);

      // Assert
      expect(Client.findOne).toHaveBeenCalledWith({
        client_id: 'ecommerce-client',
        isActive: true
      });
      expect(OAuth2Utils.generateAuthorizationCode).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Login successful',
          redirect_uri: expect.stringContaining('code=')
        })
      );
    });
  });

  describe('authorize()', () => {
    // TC-AUTH-009: OAuth2 Authorization - Valid Request
    test('TC-AUTH-009: Should handle valid OAuth2 authorization request', async () => {
      // Arrange
      req.query = {
        response_type: 'code',
        client_id: 'ecommerce-client',
        redirect_uri: 'http://localhost:3006/callback',
        scope: 'openid profile email',
        state: 'random-state'
      };

      const mockClient = {
        client_id: 'ecommerce-client',
        client_name: 'E-Commerce App',
        isActive: true,
        redirect_uris: ['http://localhost:3006/callback'],
        response_types: ['code'],
        scope: ['openid', 'profile', 'email']
      };

      Client.findOne.mockResolvedValue(mockClient);
      OAuth2Utils.validateRedirectUri.mockReturnValue(true);
      OAuth2Utils.parseScope.mockReturnValue(['openid', 'profile', 'email']);
      OAuth2Utils.validateScope.mockReturnValue(true);

      // Act
      await authController.authorize(req, res);

      // Assert
      expect(Client.findOne).toHaveBeenCalled();
      expect(OAuth2Utils.validateRedirectUri).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Authorization request received',
          client_name: 'E-Commerce App'
        })
      );
    });

    // TC-AUTH-010: OAuth2 Authorization - Missing Parameters
    test('TC-AUTH-010: Should reject authorization with missing parameters', async () => {
      // Arrange
      req.query = {
        client_id: 'ecommerce-client'
        // Missing response_type and redirect_uri
      };

      // Act
      await authController.authorize(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'invalid_request',
          error_description: 'Missing required parameters'
        })
      );
    });

    // TC-AUTH-011: OAuth2 Authorization - Invalid Client
    test('TC-AUTH-011: Should reject authorization for invalid client', async () => {
      // Arrange
      req.query = {
        response_type: 'code',
        client_id: 'invalid-client',
        redirect_uri: 'http://localhost:3006/callback'
      };

      Client.findOne.mockResolvedValue(null);

      // Act
      await authController.authorize(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'invalid_client'
        })
      );
    });
  });

  describe('token()', () => {
    // TC-AUTH-012: Token Exchange - Authorization Code
    test('TC-AUTH-012: Should exchange authorization code for tokens', async () => {
      // Arrange
      req.body = {
        grant_type: 'authorization_code',
        code: 'auth-code-123',
        client_id: 'ecommerce-client',
        client_secret: 'ecommerce-secret',
        redirect_uri: 'http://localhost:3006/callback'
      };

      const mockClient = {
        client_id: 'ecommerce-client',
        client_secret: 'ecommerce-secret',
        isActive: true
      };

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'user@example.com'
      };

      const mockAuthCode = {
        code: 'auth-code-123',
        client_id: 'ecommerce-client',
        user_id: mockUser,
        redirect_uri: 'http://localhost:3006/callback',
        scope: ['openid', 'profile', 'email'],
        expires_at: new Date(Date.now() + 60000), // Not expired
        used: false,
        save: jest.fn().mockResolvedValue(true)
      };

      Client.findOne.mockResolvedValue(mockClient);
      AuthorizationCode.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockAuthCode)
      });
      JWTManager.generateAccessToken.mockReturnValue('new-access-token');
      JWTManager.generateRefreshToken.mockReturnValue('new-refresh-token');
      JWTManager.generateIDToken.mockReturnValue('new-id-token');
      OAuth2Utils.isOpenIDRequest.mockReturnValue(true);
      OAuth2Utils.calculateExpiry.mockReturnValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

      RefreshToken.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(true)
      }));

      // Act
      await authController.token(req, res);

      // Assert
      expect(Client.findOne).toHaveBeenCalledWith({
        client_id: 'ecommerce-client',
        isActive: true
      });
      expect(mockAuthCode.used).toBe(true);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          access_token: 'new-access-token',
          token_type: 'Bearer',
          refresh_token: 'new-refresh-token',
          id_token: 'new-id-token'
        })
      );
    });

    // TC-AUTH-013: Token Exchange - Invalid Client
    test('TC-AUTH-013: Should reject token exchange with invalid client', async () => {
      // Arrange
      req.body = {
        grant_type: 'authorization_code',
        code: 'auth-code-123',
        client_id: 'invalid-client',
        client_secret: 'wrong-secret'
      };

      Client.findOne.mockResolvedValue(null);

      // Act
      await authController.token(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'invalid_client'
        })
      );
    });

    // TC-AUTH-014: Token Refresh - Valid Refresh Token
    test('TC-AUTH-014: Should refresh access token with valid refresh token', async () => {
      // Arrange
      req.body = {
        grant_type: 'refresh_token',
        refresh_token: 'valid-refresh-token',
        client_id: 'ecommerce-client',
        client_secret: 'ecommerce-secret'
      };

      const mockClient = {
        client_id: 'ecommerce-client',
        client_secret: 'ecommerce-secret',
        isActive: true
      };

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'user@example.com'
      };

      const mockRefreshToken = {
        token: 'valid-refresh-token',
        client_id: 'ecommerce-client',
        user_id: mockUser,
        scope: ['openid', 'profile', 'email'],
        expires_at: new Date(Date.now() + 60000),
        revoked: false
      };

      Client.findOne.mockResolvedValue(mockClient);
      RefreshToken.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockRefreshToken)
      });
      JWTManager.generateAccessToken.mockReturnValue('refreshed-access-token');
      JWTManager.generateIDToken.mockReturnValue('refreshed-id-token');
      OAuth2Utils.isOpenIDRequest.mockReturnValue(true);

      // Act
      await authController.token(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          access_token: 'refreshed-access-token',
          token_type: 'Bearer',
          id_token: 'refreshed-id-token'
        })
      );
    });

    // TC-AUTH-015: Token Refresh - Expired Refresh Token
    test('TC-AUTH-015: Should reject expired refresh token', async () => {
      // Arrange
      req.body = {
        grant_type: 'refresh_token',
        refresh_token: 'expired-refresh-token',
        client_id: 'ecommerce-client',
        client_secret: 'ecommerce-secret'
      };

      const mockClient = {
        client_id: 'ecommerce-client',
        client_secret: 'ecommerce-secret',
        isActive: true
      };

      const mockRefreshToken = {
        token: 'expired-refresh-token',
        client_id: 'ecommerce-client',
        expires_at: new Date(Date.now() - 60000), // Expired
        revoked: false
      };

      Client.findOne.mockResolvedValue(mockClient);
      RefreshToken.findOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockRefreshToken)
      });

      // Act
      await authController.token(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'invalid_grant',
          error_description: 'Refresh token expired'
        })
      );
    });
  });

  describe('userinfo()', () => {
    // TC-AUTH-016: UserInfo - Valid Token
    test('TC-AUTH-016: Should return user info with valid token', async () => {
      // Arrange
      req.user = { sub: '507f1f77bcf86cd799439011' };

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'user@example.com',
        name: 'Test User',
        getOIDCUserInfo: jest.fn().mockReturnValue({
          sub: '507f1f77bcf86cd799439011',
          email: 'user@example.com',
          name: 'Test User',
          email_verified: true,
          roles: ['user']
        })
      };

      User.findById.mockResolvedValue(mockUser);

      // Act
      await authController.userinfo(req, res);

      // Assert
      expect(User.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: '507f1f77bcf86cd799439011',
          email: 'user@example.com'
        })
      );
    });

    // TC-AUTH-017: UserInfo - User Not Found
    test('TC-AUTH-017: Should return 404 when user not found', async () => {
      // Arrange
      req.user = { sub: 'non-existent-id' };
      User.findById.mockResolvedValue(null);

      // Act
      await authController.userinfo(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'not_found'
        })
      );
    });
  });

  describe('revoke()', () => {
    // TC-AUTH-018: Token Revocation - Valid Token
    test('TC-AUTH-018: Should revoke refresh token successfully', async () => {
      // Arrange
      req.body = { token: 'token-to-revoke' };

      const mockRefreshToken = {
        token: 'token-to-revoke',
        revoked: false,
        save: jest.fn().mockResolvedValue(true)
      };

      RefreshToken.findOne.mockResolvedValue(mockRefreshToken);

      // Act
      await authController.revoke(req, res);

      // Assert
      expect(RefreshToken.findOne).toHaveBeenCalledWith({ token: 'token-to-revoke' });
      expect(mockRefreshToken.revoked).toBe(true);
      expect(mockRefreshToken.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Token revoked successfully' });
    });

    // TC-AUTH-019: Token Revocation - Missing Token
    test('TC-AUTH-019: Should reject revocation without token', async () => {
      // Arrange
      req.body = {};

      // Act
      await authController.revoke(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'invalid_request',
          error_description: 'Token is required'
        })
      );
    });
  });

  describe('discovery()', () => {
    // TC-AUTH-020: OIDC Discovery - Configuration
    test('TC-AUTH-020: Should return OIDC discovery configuration', () => {
      // Act
      authController.discovery(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          issuer: expect.any(String),
          authorization_endpoint: expect.stringContaining('/oauth/authorize'),
          token_endpoint: expect.stringContaining('/oauth/token'),
          userinfo_endpoint: expect.stringContaining('/oauth/userinfo'),
          grant_types_supported: expect.arrayContaining(['authorization_code', 'refresh_token']),
          scopes_supported: expect.arrayContaining(['openid', 'profile', 'email'])
        })
      );
    });
  });
});
