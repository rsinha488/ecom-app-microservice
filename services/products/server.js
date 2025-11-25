require('dotenv').config({ path: '.env.local' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const productRoutesV1 = require('./routes/v1/productRoutes');
const { validateVersion } = require('./middleware/apiVersion');
const { initializeConsumer } = require('./services/kafkaConsumer');
const { disconnectConsumer } = require('./config/kafka');
const redisClient = require('../shared/config/redis');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Security
app.use(helmet());
app.use(compression());

// Configure trust proxy based on environment
if (isProduction) {
  app.set('trust proxy', 1); // Trust first proxy (nginx) in production
} else {
  app.set('trust proxy', false); // Direct connections in development
}

// Rate limiter middleware to prevent excessive requests (DDoS / brute-force protection)
const limiter = rateLimit({  
  windowMs: 15 * 60 * 1000,   // Time window for rate limiting (15 minutes)

  // Maximum number of requests allowed per IP within the time window
  // In production → 100 requests  
  // In development → 1000 requests (more lenient)
  max: isProduction ? 100 : 1000,

  // Include useful rate limit info in the `RateLimit-*` response headers
  standardHeaders: true,

  // Disable old/legacy `X-RateLimit-*` headers (deprecated)
  legacyHeaders: false
});

// Rate limiter applies to versioned routes
app.use('/:version/', limiter);

// app.use(cors({
//   origin: "*",
//   credentials: true
// }));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to Database
connectDB();

// API Routes - Dynamic version routing
app.use('/:version/products', validateVersion, productRoutesV1);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Products Service',
    version: 'v1',
    status: 'running',
    endpoints: {
      health: '/health',
      api_v1: '/api/v1/products'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'products',
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

// Initialize Redis connection
async function initializeRedis() {
  try {
    console.log('🚀 Connecting to Redis for caching...');
    await redisClient.connect();
    console.log('✅ Redis connected successfully');
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    console.warn('⚠️  Products service will continue without Redis caching');
    // Don't exit - allow service to run without Redis if needed
  }
}

// Initialize Kafka consumer
async function initializeKafka() {
  try {
    console.log('🚀 Initializing Kafka consumer for stock management...');
    await initializeConsumer();
    console.log('✅ Kafka consumer initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Kafka consumer:', error.message);
    console.warn('⚠️  Products service will continue without Kafka integration');
    // Don't exit - allow service to run without Kafka if needed
  }
}

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`${signal} received: closing server gracefully`);

  try {
    // Disconnect Redis
    await redisClient.disconnect();

    // Disconnect Kafka consumer
    await disconnectConsumer();

    // Close HTTP server
    server.close(() => {
      console.log('✅ Server closed successfully');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      console.error('❌ Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

const server = app.listen(PORT, async () => {
  console.log(`Products service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`API Version: v1`);

  // Initialize Redis for caching
  await initializeRedis();

  // Initialize Kafka consumer after server starts
  await initializeKafka();
});

module.exports = server;
