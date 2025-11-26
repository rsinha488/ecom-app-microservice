require('dotenv').config({ path: '.env.local' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const userRoutesV1 = require('./routes/v1/paymentRoutes');
const { validateVersion } = require('./middleware/apiVersion');
const { connectKafka, disconnectKafka, checkKafkaHealth } = require('./config/kafka');
const { startConsumer } = require('./services/kafkaConsumer');

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

// Rate limiter applies to versioned routes
app.use('/:version/', limiter);

// CORS - Disabled: API Gateway handles CORS
// app.use(cors());
// app.use('/:version/payment/login', authLimiter);
// app.use('/:version/payment/register', authLimiter);

// Body Parser
// IMPORTANT: Stripe webhook needs raw body, so we handle it differently
// Webhook route must use express.raw() to verify signature
app.use((req, res, next) => {
  if (req.originalUrl === '/v1/payment/webhook') {
    next();
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to Database
connectDB();

// Initialize Kafka and Consumer
async function initializeKafka() {
  try {
    await connectKafka();
    await startConsumer();
    console.log('[Kafka] Kafka initialized and consumer started');
  } catch (error) {
    console.error('[Kafka] Failed to initialize Kafka:', error);
    // Don't crash the server if Kafka fails - allow graceful degradation
    console.warn('[Kafka] Payment service will continue without event-driven features');
  }
}

// Start Kafka initialization (non-blocking)
initializeKafka();

// Webhook route (must be before JSON body parser)
const paymentController = require('./controllers/paymentController');
app.post('/v1/payment/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.handleStripeWebhook
);

// API Routes - Dynamic version routing
app.use('/:version/payment', validateVersion, userRoutesV1);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Payment Service',
    version: 'v1',
    status: 'running',
    endpoints: {
      health: '/health',
      api_v1: '/v1/payment'
    }
  });
});

// Health check with Kafka status
app.get('/health', async (req, res) => {
  const kafkaHealth = await checkKafkaHealth();

  res.json({
    status: kafkaHealth.status === 'healthy' ? 'healthy' : 'degraded',
    service: 'payments',
    version: 'v1',
    port: PORT,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    dependencies: {
      database: 'connected',
      kafka: kafkaHealth
    }
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
process.on('SIGTERM', async () => {
  console.log('SIGTERM received: closing server');

  // Disconnect Kafka
  try {
    await disconnectKafka();
    console.log('Kafka disconnected');
  } catch (error) {
    console.error('Error disconnecting Kafka:', error);
  }

  // Close HTTP server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received: closing server');

  // Disconnect Kafka
  try {
    await disconnectKafka();
    console.log('Kafka disconnected');
  } catch (error) {
    console.error('Error disconnecting Kafka:', error);
  }

  // Close HTTP server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

const server = app.listen(PORT, () => {
  console.log(`Payment service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`API Version: v1`);
});

module.exports = server;
