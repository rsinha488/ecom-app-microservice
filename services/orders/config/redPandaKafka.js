/**
 * Kafka Configuration for Redpanda Cloud
 *
 * Centralized Kafka client configuration for the Orders service.
 * Supports SSL + SASL required by Redpanda Cloud.
 *
 * @module config/kafka
 */

const { Kafka, logLevel } = require('kafkajs');

// Kafka broker configuration (Redpanda Cloud)
const kafka = new Kafka({
  clientId: 'orders-service',

  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),

  // REQUIRED for Redpanda Cloud
  ssl: true,
  sasl: {
    mechanism: 'scram-sha-256', // Redpanda supports SCRAM SHA-256
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD
  },

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
 * @returns {Promise<Producer>}
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
  console.log('✅ Redpanda Kafka producer connected successfully');

  // Handle producer errors
  producer.on('producer.disconnect', () => {
    console.warn('⚠️ Kafka producer disconnected');
  });

  producer.on('producer.network.request_timeout', (payload) => {
    console.error('❌ Kafka producer request timeout:', payload);
  });

  return producer;
}

/**
 * Get Kafka producer instance
 */
async function getProducer() {
  if (!producer) {
    return await initializeProducer();
  }
  return producer;
}

/**
 * Create Kafka topics if they don't exist
 *
 * @param {Array<string>} topics
 */
async function createTopics(topics) {
  const admin = kafka.admin();

  try {
    await admin.connect();
    console.log('🔧 Redpanda Kafka admin connected');

    // Fetch current topics
    const existingTopics = await admin.listTopics();

    const topicsToCreate = topics.filter(topic => !existingTopics.includes(topic));

    if (topicsToCreate.length === 0) {
      console.log('✅ All required Kafka topics already exist');
      return;
    }

    await admin.createTopics({
      topics: topicsToCreate.map(topic => ({
        topic,
        numPartitions: 3,
        replicationFactor: 1, // Cloud free tier uses RF=1
        configEntries: [
          { name: 'retention.ms', value: '604800000' },
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
 * Disconnect producer
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
 *
 * @param {string} topic
 * @param {Object} event
 * @param {string|null} key
 */
async function publishEvent(topic, event, key = null) {
  try {
    const producer = await getProducer();

    const message = {
      topic,
      messages: [
        {
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
        }
      ]
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
 * Generate correlation ID
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
