/**
 * Kafka Configuration for Payment Service
 *
 * Configures Kafka connection for event-driven communication
 * between microservices in the SAGA pattern.
 *
 * @module config/kafka
 */

const { Kafka, logLevel } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'payment-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  logLevel: logLevel.INFO,
  retry: {
    initialRetryTime: 300,
    retries: 10,
    maxRetryTime: 30000,
    multiplier: 2
  },
  connectionTimeout: 10000,
  requestTimeout: 30000
});

// Create producer instance
const producer = kafka.producer({
  allowAutoTopicCreation: true,
  transactionTimeout: 30000,
  idempotent: true, // Prevent duplicate messages
  maxInFlightRequests: 5,
  retry: {
    initialRetryTime: 300,
    retries: 10,
    maxRetryTime: 30000
  }
});

// Create consumer instance
const consumer = kafka.consumer({
  groupId: 'payment-service-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  maxBytes: 1048576, // 1MB
  retry: {
    initialRetryTime: 300,
    retries: 10,
    maxRetryTime: 30000
  }
});

// Create admin client for topic management
const admin = kafka.admin();

/**
 * Initialize Kafka connection
 */
async function connectKafka() {
  try {
    console.log('[Kafka] Connecting to Kafka brokers...');

    // Connect producer
    await producer.connect();
    console.log('[Kafka] Producer connected successfully');

    // Connect consumer
    await consumer.connect();
    console.log('[Kafka] Consumer connected successfully');

    // Setup topics
    await setupTopics();

    console.log('[Kafka] Kafka initialization complete');
  } catch (error) {
    console.error('[Kafka] Failed to connect:', error);
    throw error;
  }
}

/**
 * Setup required Kafka topics
 */
async function setupTopics() {
  try {
    await admin.connect();

    const topics = [
      // Payment events
      { topic: 'payment.initiated', numPartitions: 3, replicationFactor: 1 },
      { topic: 'payment.completed', numPartitions: 3, replicationFactor: 1 },
      { topic: 'payment.failed', numPartitions: 3, replicationFactor: 1 },
      { topic: 'payment.refunded', numPartitions: 3, replicationFactor: 1 },
      { topic: 'payment.cancelled', numPartitions: 3, replicationFactor: 1 },

      // SAGA orchestration events
      { topic: 'saga.payment.compensate', numPartitions: 3, replicationFactor: 1 },

      // Order events (consumed by payment service)
      { topic: 'order.created', numPartitions: 3, replicationFactor: 1 },
      { topic: 'order.cancelled', numPartitions: 3, replicationFactor: 1 }
    ];

    const existingTopics = await admin.listTopics();
    const topicsToCreate = topics.filter(
      t => !existingTopics.includes(t.topic)
    );

    if (topicsToCreate.length > 0) {
      await admin.createTopics({
        topics: topicsToCreate,
        waitForLeaders: true
      });
      console.log('[Kafka] Created topics:', topicsToCreate.map(t => t.topic));
    } else {
      console.log('[Kafka] All topics already exist');
    }

    await admin.disconnect();
  } catch (error) {
    console.error('[Kafka] Error setting up topics:', error);
    // Don't throw - topics might already exist
  }
}

/**
 * Disconnect Kafka connections
 */
async function disconnectKafka() {
  try {
    await producer.disconnect();
    await consumer.disconnect();
    console.log('[Kafka] Disconnected successfully');
  } catch (error) {
    console.error('[Kafka] Error disconnecting:', error);
  }
}

/**
 * Health check for Kafka connection
 */
async function checkKafkaHealth() {
  try {
    await admin.connect();
    const cluster = await admin.describeCluster();
    await admin.disconnect();

    return {
      status: 'healthy',
      brokers: cluster.brokers.length,
      controller: cluster.controller
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}

module.exports = {
  kafka,
  producer,
  consumer,
  connectKafka,
  disconnectKafka,
  checkKafkaHealth
};
