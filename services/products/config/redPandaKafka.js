/**
 * Kafka Configuration for Redpanda Cloud
 *
 * Centralized Kafka client configuration for the Products service.
 * Supports SSL + SASL authentication required by Redpanda Cloud.
 *
 * @module config/kafka
 */

const { Kafka, logLevel } = require('kafkajs');

// Kafka broker configuration
const kafka = new Kafka({
    clientId: 'products-service',
    brokers: process.env.NODE_ENV === "development" ? (process.env.KAFKA_BROKERS || 'localhost:9092').split(',') :
        process.env.KAFKA_BROKERS_REDPANDA.split(','),

    // REQUIRED for Redpanda Cloud
    ssl: true,
    sasl: {
        mechanism: 'SCRAM-SHA-256', // Redpanda supports scram-sha-256
        username: process.env.NODE_ENV === "development" ? process.env.KAFKA_USERNAME: process.env.KAFKA_BROKERS_REDPANDA_USERNAME,
        password: process.env.NODE_ENV === "development" ?process.env.KAFKA_PASSWORD: process.env.KAFKA_BROKERS_REDPANDA_PASSWORD
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

// Kafka consumer instance
let consumer = null;

/**
 * Initialize Kafka consumer
 *
 * @returns {Promise<Consumer>}
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
    console.log('✅ Kafka (Redpanda) consumer connected successfully');

    // Handle consumer events
    consumer.on('consumer.disconnect', () => {
        console.warn('⚠️ Kafka consumer disconnected');
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
 */
async function getConsumer() {
    if (!consumer) {
        return await initializeConsumer();
    }
    return consumer;
}

/**
 * Subscribe to Kafka topics
 *
 * @param {Array<string>} topics
 */
async function subscribeToTopics(topics) {
    try {
        const consumer = await getConsumer();

        for (const topic of topics) {
            await consumer.subscribe({
                topic,
                fromBeginning: false
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
 *
 * @param {Function} messageHandler
 */
async function startConsuming(messageHandler) {
    try {
        const consumer = await getConsumer();

        await consumer.run({
            autoCommit: false,
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    const event = JSON.parse(message.value.toString());

                    console.log(`📥 Received message from '${topic}':`, {
                        offset: message.offset,
                        partition,
                        eventType: event.eventType
                    });

                    await messageHandler({ topic, partition, message, event });

                    // Manual commit
                    await consumer.commitOffsets([{
                        topic,
                        partition,
                        offset: (parseInt(message.offset) + 1).toString()
                    }]);

                    console.log(`✅ Processed + committed message from ${topic} @ offset ${message.offset}`);
                } catch (error) {
                    console.error(`❌ Error processing message from ${topic}:`, error.message);
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
