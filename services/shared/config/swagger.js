/**
 * Shared Swagger Configuration
 *
 * This file provides common Swagger/OpenAPI configuration
 * that can be extended by each microservice
 */

const swaggerJsdoc = require('swagger-jsdoc');

/**
 * Create Swagger specification for a service
 * @param {Object} serviceInfo - Service-specific information
 * @returns {Object} Swagger specification
 */
const createSwaggerSpec = (serviceInfo) => {
  const {
    title,
    description,
    version = '1.0.0',
    port,
    tags = [],
    additionalComponents = {},
  } = serviceInfo;

  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title,
        version,
        description,
        contact: {
          name: 'API Support',
          email: 'support@ecommerce.com',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
      servers: [
        {
          url: `http://localhost:${port}/api/v1`,
          description: 'Development server',
        },
        {
          url: `https://api.yourdomain.com/api/v1`,
          description: 'Production server',
        },
      ],
      tags,
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter your OAuth2 access token',
          },
          OAuth2: {
            type: 'oauth2',
            flows: {
              authorizationCode: {
                authorizationUrl: 'http://localhost:3000/api/v1/oauth/authorize',
                tokenUrl: 'http://localhost:3000/api/v1/oauth/token',
                scopes: {
                  'openid': 'OpenID Connect',
                  'profile': 'Access user profile',
                  'email': 'Access user email',
                },
              },
            },
          },
        },
        schemas: {
          Error: {
            type: 'object',
            properties: {
              error: {
                type: 'string',
                description: 'Error type',
              },
              error_description: {
                type: 'string',
                description: 'Human-readable error description',
              },
              message: {
                type: 'string',
                description: 'Error message',
              },
            },
          },
          ValidationError: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Validation error message',
              },
              errors: {
                type: 'object',
                additionalProperties: {
                  type: 'array',
                  items: {
                    type: 'string',
                  },
                },
              },
            },
          },
          Pagination: {
            type: 'object',
            properties: {
              page: {
                type: 'integer',
                description: 'Current page number',
                example: 1,
              },
              limit: {
                type: 'integer',
                description: 'Items per page',
                example: 20,
              },
              total: {
                type: 'integer',
                description: 'Total number of items',
                example: 100,
              },
              pages: {
                type: 'integer',
                description: 'Total number of pages',
                example: 5,
              },
            },
          },
          ...additionalComponents,
        },
        responses: {
          UnauthorizedError: {
            description: 'Access token is missing or invalid',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  error: 'unauthorized',
                  error_description: 'Access token is missing or invalid',
                },
              },
            },
          },
          ForbiddenError: {
            description: 'Insufficient permissions',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  error: 'forbidden',
                  error_description: 'You do not have permission to access this resource',
                },
              },
            },
          },
          NotFoundError: {
            description: 'Resource not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  error: 'not_found',
                  error_description: 'The requested resource was not found',
                },
              },
            },
          },
          ValidationError: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationError',
                },
              },
            },
          },
          ServerError: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  error: 'server_error',
                  error_description: 'An unexpected error occurred',
                },
              },
            },
          },
        },
      },
      security: [
        {
          BearerAuth: [],
        },
      ],
    },
    apis: ['./routes/**/*.js', './controllers/**/*.js', './models/**/*.js'],
  };

  return swaggerJsdoc(options);
};

/**
 * Swagger UI options
 */
const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'E-commerce API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
  },
};

module.exports = {
  createSwaggerSpec,
  swaggerUiOptions,
};
