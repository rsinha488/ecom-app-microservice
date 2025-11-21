/**
 * Kafka Configuration
 *
 * Centralized Kafka client configuration for the Products service.
 * Handles connection, consumer setup, and message processing.
 *
 * @module config/kafka
 */

const { Kafka, logLevel } = require('kafkajs');

// Kafka broker configuration
const kafka = new Kafka({
  clientId: 'products-service',
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

// Kafka consumer instance
let consumer = null;

/**
 * Initialize Kafka consumer
 * Creates and connects the Kafka consumer for order events
 *
 * @returns {Promise<Consumer>} Connected Kafka consumer
 */
async function initializeConsumer() {
  if (consumer) {
    return consumer;
  }

  consumer = kafka.consumer({
    groupId: 'products-service-group',
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    maxWaitTimeInMs: 5000,
    retry: {
      retries: 5,
      initialRetryTime: 300
    }
  });

  await consumer.connect();
  console.log('✅ Kafka consumer connected successfully');

  // Handle consumer errors
  consumer.on('consumer.disconnect', () => {
    console.warn('⚠️  Kafka consumer disconnected');
  });

  consumer.on('consumer.crash', (event) => {
    console.error('❌ Kafka consumer crashed:', event.payload.error);
  });

  consumer.on('consumer.network.request_timeout', (payload) => {
    console.error('❌ Kafka consumer request timeout:', payload);
  });

  return consumer;
}

/**
 * Get Kafka consumer instance
 * Returns existing consumer or creates new one
 *
 * @returns {Promise<Consumer>} Kafka consumer
 */
async function getConsumer() {
  if (!consumer) {
    return await initializeConsumer();
  }
  return consumer;
}

/**
 * Subscribe to Kafka topics
 * Subscribes consumer to specified topics
 *
 * @param {Array<string>} topics - Array of topic names to subscribe to
 * @returns {Promise<void>}
 */
async function subscribeToTopics(topics) {
  try {
    const consumer = await getConsumer();

    for (const topic of topics) {
      await consumer.subscribe({
        topic,
        fromBeginning: false // Only process new messages
      });
      console.log(`✅ Subscribed to Kafka topic: ${topic}`);
    }
  } catch (error) {
    console.error('❌ Failed to subscribe to Kafka topics:', error.message);
    throw error;
  }
}

/**
 * Start consuming messages
 * Begins processing messages from subscribed topics
 *
 * @param {Function} messageHandler - Async function to handle each message
 * @returns {Promise<void>}
 */
async function startConsuming(messageHandler) {
  try {
    const consumer = await getConsumer();

    await consumer.run({
      autoCommit: false, // Manual commit for reliability
      eachMessage: async ({ topic, partition, message }) => {
        try {
          // Parse message
          const event = JSON.parse(message.value.toString());

          console.log(`📥 Received from Kafka topic '${topic}':`, {
            offset: message.offset,
            partition,
            eventType: event.eventType
          });

          // Process message with provided handler
          await messageHandler({ topic, partition, message, event });

          // Commit offset after successful processing
          await consumer.commitOffsets([{
            topic,
            partition,
            offset: (parseInt(message.offset) + 1).toString()
          }]);

          console.log(`✅ Processed and committed message from ${topic} at offset ${message.offset}`);
        } catch (error) {
          console.error(`❌ Failed to process message from ${topic}:`, error.message);
          // Don't commit offset on failure - message will be reprocessed
          // In production, implement dead-letter queue after max retries
        }
      }
    });

    console.log('✅ Kafka consumer started processing messages');
  } catch (error) {
    console.error('❌ Failed to start Kafka consumer:', error.message);
    throw error;
  }
}

/**
 * Disconnect Kafka consumer gracefully
 * Should be called on application shutdown
 *
 * @returns {Promise<void>}
 */
async function disconnectConsumer() {
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
    console.log('✅ Kafka consumer disconnected');
  }
}

module.exports = {
  kafka,
  initializeConsumer,
  getConsumer,
  subscribeToTopics,
  startConsuming,
  disconnectConsumer
};
