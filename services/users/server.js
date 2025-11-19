require('dotenv').config({ path: '.env.local' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const userRoutesV1 = require('./routes/v1/userRoutes');
const { validateVersion } = require('./middleware/apiVersion');

const app = express();
const PORT = process.env.PORT || 3003;
const isProduction = process.env.NODE_ENV === 'production';

// Security
app.use(helmet());
app.use(compression());

if (isProduction) {
  app.set('trust proxy', 1);
}

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 5 : 100,
  message: {
    error: 'too_many_requests',
    error_description: 'Too many authentication attempts'
  }
});

app.use('/api/', limiter);

// CORS - Disabled: API Gateway handles CORS
// app.use(cors());
app.use('/api/v1/users/login', authLimiter);
app.use('/api/v1/users/register', authLimiter);

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to Database
connectDB();

// API Version Routes
app.use('/api/:version/users', validateVersion, userRoutesV1);

// Backwards compatibility
app.use('/api/users', userRoutesV1);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Users Service',
    version: 'v1',
    status: 'running',
    endpoints: {
      health: '/health',
      api_v1: '/api/v1/users'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'users',
    version: 'v1',
    port: PORT,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'not_found',
    error_description: 'The requested endpoint does not exist'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    error: err.name || 'server_error',
    error_description: isProduction ? 'An internal server error occurred' : err.message
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received: closing server');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const server = app.listen(PORT, () => {
  console.log(`Users service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`API Version: v1`);
});

module.exports = server;
