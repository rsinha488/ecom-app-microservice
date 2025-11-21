/**
 * Kafka Configuration
 *
 * Centralized Kafka client configuration for the Orders service.
 * Handles connection, producer, and admin setup with proper error handling.
 *
 * @module config/kafka
 */

const { Kafka, logLevel } = require('kafkajs');

// Kafka broker configuration
const kafka = new Kafka({
  clientId: 'orders-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  connectionTimeout: 10000,
  requestTimeout: 30000,
  retry: {
    initialRetryTime: 100,
    retries: 8,
    multiplier: 2,
    maxRetryTime: 30000
  },
  logLevel: process.env.NODE_ENV === 'production' ? logLevel.ERROR : logLevel.INFO
});

// Kafka producer instance
let producer = null;

/**
 * Initialize Kafka producer
 * Creates and connects the Kafka producer with idempotence enabled
 *
 * @returns {Promise<Producer>} Connected Kafka producer
 */
async function initializeProducer() {
  if (producer) {
    return producer;
  }

  producer = kafka.producer({
    allowAutoTopicCreation: true,
    transactionalId: 'orders-service-producer',
    maxInFlightRequests: 5,
    idempotent: true,
    retry: {
      retries: 5,
      initialRetryTime: 300
    }
  });

  await producer.connect();
  console.log('✅ Kafka producer connected successfully');

  // Handle producer errors
  producer.on('producer.disconnect', () => {
    console.warn('⚠️  Kafka producer disconnected');
  });

  producer.on('producer.network.request_timeout', (payload) => {
    console.error('❌ Kafka producer request timeout:', payload);
  });

  return producer;
}

/**
 * Get Kafka producer instance
 * Returns existing producer or creates new one
 *
 * @returns {Promise<Producer>} Kafka producer
 */
async function getProducer() {
  if (!producer) {
    return await initializeProducer();
  }
  return producer;
}

/**
 * Create Kafka topics if they don't exist
 * Ensures required topics are available before producing messages
 *
 * @param {Array<string>} topics - Array of topic names to create
 * @returns {Promise<void>}
 */
async function createTopics(topics) {
  const admin = kafka.admin();

  try {
    await admin.connect();
    console.log('🔧 Kafka admin connected');

    // Get existing topics
    const existingTopics = await admin.listTopics();

    // Filter out topics that already exist
    const topicsToCreate = topics.filter(topic => !existingTopics.includes(topic));

    if (topicsToCreate.length === 0) {
      console.log('✅ All required Kafka topics already exist');
      return;
    }

    // Create missing topics
    await admin.createTopics({
      topics: topicsToCreate.map(topic => ({
        topic,
        numPartitions: 3, // Partition for parallelism
        replicationFactor: 1, // Set to 3 in production with multiple brokers
        configEntries: [
          { name: 'retention.ms', value: '604800000' }, // 7 days
          { name: 'cleanup.policy', value: 'delete' }
        ]
      }))
    });

    console.log(`✅ Created Kafka topics: ${topicsToCreate.join(', ')}`);
  } catch (error) {
    console.error('❌ Failed to create Kafka topics:', error.message);
    throw error;
  } finally {
    await admin.disconnect();
  }
}

/**
 * Disconnect Kafka producer gracefully
 * Should be called on application shutdown
 *
 * @returns {Promise<void>}
 */
async function disconnectProducer() {
  if (producer) {
    await producer.disconnect();
    producer = null;
    console.log('✅ Kafka producer disconnected');
  }
}

/**
 * Publish event to Kafka topic
 * Simplified wrapper for sending messages with error handling
 *
 * @param {string} topic - Kafka topic name
 * @param {Object} event - Event payload
 * @param {string} key - Message key for partitioning (optional)
 * @returns {Promise<Object>} Kafka send result
 */
async function publishEvent(topic, event, key = null) {
  try {
    const producer = await getProducer();

    const message = {
      topic,
      messages: [{
        key: key ? String(key) : null,
        value: JSON.stringify({
          ...event,
          timestamp: new Date().toISOString(),
          service: 'orders'
        }),
        headers: {
          'event-version': '1.0.0',
          'correlation-id': event.correlationId || generateCorrelationId()
        }
      }]
    };

    const result = await producer.send(message);
    console.log(`📤 Published to Kafka topic '${topic}':`, event.eventType || 'event');
    return result;
  } catch (error) {
    console.error(`❌ Failed to publish to Kafka topic '${topic}':`, error.message);
    throw error;
  }
}

/**
 * Generate correlation ID for event tracking
 * @returns {string} Unique correlation ID
 */
function generateCorrelationId() {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

module.exports = {
  kafka,
  initializeProducer,
  getProducer,
  createTopics,
  disconnectProducer,
  publishEvent
};
