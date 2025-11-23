require('dotenv').config({ path: '.env.local' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const authRoutesV1 = require('./routes/v1/authRoutes');
const { validateVersion } = require('./middleware/apiVersion');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Security Headers
app.use(helmet({
  contentSecurityPolicy: isProduction,
  hsts: isProduction
}));

// Compression
app.use(compression());

// Trust proxy (required when behind NGINX/reverse proxy)
app.set('trust proxy', 1);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000, // limit each IP to 100 requests per windowMs in production
  message: {
    error: 'too_many_requests',
    error_description: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 5 : 100, // Stricter limit for auth endpoints
  message: {
    error: 'too_many_requests',
    error_description: 'Too many authentication attempts, please try again later'
  }
});

// Apply rate limiting
app.use('/:version/', limiter);
app.use('/:version/auth/login', authLimiter);
app.use('/:version/auth/register', authLimiter);
app.use('/:version/oauth/token', authLimiter);

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004'];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || !isProduction) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to Database
connectDB();

// API Routes - Dynamic version routing
app.use('/:version/auth', validateVersion, authRoutesV1);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'OAuth2/OpenID Connect Authorization Server',
    version: 'v1',
    status: 'running',
    endpoints: {
      health: '/health',
      api_v1: '/api/v1/auth',
      discovery: '/api/v1/auth/.well-known/openid-configuration',
      documentation: `${process.env.ISSUER}/docs`
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'auth',
    version: 'v1',
    port: PORT,
    issuer: process.env.ISSUER,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'not_found',
    error_description: 'The requested endpoint does not exist',
    documentation: `${process.env.ISSUER}/docs`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);

  const status = err.status || 500;
  const response = {
    error: err.name || 'server_error',
    error_description: isProduction ? 'An internal server error occurred' : err.message
  };

  if (!isProduction) {
    response.stack = err.stack;
  }

  res.status(status).json(response);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

const server = app.listen(PORT, () => {
  console.log(`OAuth2/OIDC Authorization Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Issuer: ${process.env.ISSUER}`);
  console.log(`API Version: v1`);
});

module.exports = server;
