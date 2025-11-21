require('dotenv').config({ path: '.env.local' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const http = require('http');
const connectDB = require('./config/db');
const orderRoutesV1 = require('./routes/v1/orderRoutes');
const { validateVersion } = require('./middleware/apiVersion');
const { initializeSocket } = require('./config/socket');
const { initializeProducer, createTopics, disconnectProducer } = require('./config/kafka');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3004;
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

app.use('/api/', limiter);

// CORS - Disabled: API Gateway handles CORS
// app.use(cors());

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Connect to Database
connectDB();

// API Version Routes
app.use('/api/:version/orders', validateVersion, orderRoutesV1);

// Backwards compatibility
app.use('/api/orders', orderRoutesV1);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Orders Service',
    version: 'v1',
    status: 'running',
    endpoints: {
      health: '/health',
      api_v1: '/api/v1/orders'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'orders',
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

// Initialize Socket.io
initializeSocket(server);

// Initialize Kafka
async function initializeKafka() {
  try {
    console.log('🚀 Initializing Kafka producer...');

    // Create required topics
    await createTopics([
      'order.created',
      'order.status.changed',
      'order.cancelled',
      'order.completed',
      'inventory.reserve',
      'inventory.release'
    ]);

    // Initialize producer
    await initializeProducer();

    console.log('✅ Kafka producer initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Kafka:', error.message);
    console.warn('⚠️  Orders service will continue without Kafka integration');
    // Don't exit - allow service to run without Kafka if needed
  }
}

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`${signal} received: closing server gracefully`);

  try {
    // Disconnect Kafka producer
    await disconnectProducer();

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

// Start server
server.listen(PORT, async () => {
  console.log(`Orders service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`API Version: v1`);
  console.log(`WebSocket server ready on port ${PORT}`);

  // Initialize Kafka after server starts
  await initializeKafka();
});

module.exports = server;
