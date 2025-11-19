const { createSwaggerSpec } = require('../shared/config/swagger');

const authSwaggerSpec = createSwaggerSpec({
  title: 'Auth Service API',
  description: `
# OAuth2 & OpenID Connect Authorization Server

This API provides authentication and authorization services using OAuth2 and OpenID Connect standards.

## Features
- User registration and authentication
- OAuth2 authorization code flow
- Refresh token grant
- OpenID Connect support
- JWT-based access tokens
- Token revocation
- OIDC Discovery

## Authentication Flow

1. **Authorization Request**: Client redirects user to /oauth/authorize
2. **User Login**: User authenticates via /auth/login
3. **Authorization Code**: Server returns authorization code
4. **Token Exchange**: Client exchanges code for tokens at /oauth/token
5. **API Access**: Client uses access token to access protected resources
6. **Token Refresh**: Client uses refresh token to get new access token

## Token Types

- **Access Token**: Short-lived JWT (15 min) for API access
- **Refresh Token**: Long-lived opaque token (7 days) for obtaining new access tokens
- **ID Token**: JWT containing user identity information (OIDC)
  `,
  version: '1.0.0',
  port: 3000,
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication endpoints',
    },
    {
      name: 'OAuth2',
      description: 'OAuth2 authorization endpoints',
    },
    {
      name: 'OIDC',
      description: 'OpenID Connect endpoints',
    },
    {
      name: 'Clients',
      description: 'OAuth2 client management (admin only)',
    },
  ],
  additionalComponents: {
    User: {
      type: 'object',
      required: ['email', 'password', 'name'],
      properties: {
        _id: {
          type: 'string',
          description: 'User ID',
          example: '507f1f77bcf86cd799439011',
        },
        email: {
          type: 'string',
          format: 'email',
          description: 'User email address',
          example: 'user@example.com',
        },
        name: {
          type: 'string',
          description: 'User full name',
          example: 'John Doe',
        },
        given_name: {
          type: 'string',
          description: 'First name',
          example: 'John',
        },
        family_name: {
          type: 'string',
          description: 'Last name',
          example: 'Doe',
        },
        email_verified: {
          type: 'boolean',
          description: 'Email verification status',
          example: false,
        },
        roles: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['user', 'admin', 'moderator'],
          },
          description: 'User roles',
          example: ['user'],
        },
        isActive: {
          type: 'boolean',
          description: 'Account active status',
          example: true,
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          description: 'Account creation timestamp',
        },
      },
    },
    TokenResponse: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          description: 'JWT access token',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        token_type: {
          type: 'string',
          description: 'Token type',
          example: 'Bearer',
        },
        expires_in: {
          type: 'integer',
          description: 'Access token lifetime in seconds',
          example: 900,
        },
        refresh_token: {
          type: 'string',
          description: 'Refresh token for obtaining new access tokens',
          example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        },
        id_token: {
          type: 'string',
          description: 'OpenID Connect ID token',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        scope: {
          type: 'string',
          description: 'Granted scopes',
          example: 'openid profile email',
        },
      },
    },
    UserInfo: {
      type: 'object',
      description: 'OpenID Connect UserInfo',
      properties: {
        sub: {
          type: 'string',
          description: 'Subject identifier (user ID)',
          example: '507f1f77bcf86cd799439011',
        },
        email: {
          type: 'string',
          example: 'user@example.com',
        },
        email_verified: {
          type: 'boolean',
          example: false,
        },
        name: {
          type: 'string',
          example: 'John Doe',
        },
        given_name: {
          type: 'string',
          example: 'John',
        },
        family_name: {
          type: 'string',
          example: 'Doe',
        },
        picture: {
          type: 'string',
          nullable: true,
        },
        updated_at: {
          type: 'string',
          format: 'date-time',
        },
      },
    },
    Client: {
      type: 'object',
      properties: {
        client_id: {
          type: 'string',
          example: 'ecommerce-client',
        },
        client_name: {
          type: 'string',
          example: 'E-commerce Frontend',
        },
        redirect_uris: {
          type: 'array',
          items: {
            type: 'string',
          },
          example: ['http://localhost:3005/callback'],
        },
        grant_types: {
          type: 'array',
          items: {
            type: 'string',
          },
          example: ['authorization_code', 'refresh_token'],
        },
      },
    },
  },
});

module.exports = authSwaggerSpec;
