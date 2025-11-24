// /**
//  * WebSocket Debug Test Script
//  *
//  * This script helps debug WebSocket connections and events
//  * Run this after starting the orders service
//  */

// const { io } = require('socket.io-client');

// // Configuration
// const ORDERS_URL = process.env.ORDERS_URL || 'http://localhost:3004';
// const ACCESS_TOKEN = process.argv[2]; // Pass access token as command line argument

// if (!ACCESS_TOKEN) {
//   console.error('❌ Error: Please provide an access token');
//   console.log('Usage: node test-socket-debug.js <access_token>');
//   console.log('Example: node test-socket-debug.js eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...');
//   process.exit(1);
// }

// console.log('🔌 Connecting to Orders WebSocket...');
// console.log(`📍 URL: ${ORDERS_URL}`);

// // Create socket connection
// const socket = io(ORDERS_URL, {
//   auth: {
//     token: ACCESS_TOKEN,
//   },
//   transports: ['websocket', 'polling'],
//   reconnection: true,
// });

// // Connection events
// socket.on('connect', () => {
//   console.log('✅ Connected to server');
//   console.log(`🆔 Socket ID: ${socket.id}`);
//   socket.emit('subscribe:orders');
// });

// socket.on('disconnect', (reason) => {
//   console.log(`❌ Disconnected: ${reason}`);
// });

// socket.on('connected', (data) => {
//   console.log('✅ Connection confirmed:', data);
// });

// socket.on('subscribed', (data) => {
//   console.log('✅ Subscribed to orders:', data);
// });

// // Order events
// socket.on('order:created', (data) => {
//   console.log('\n📦 ORDER CREATED EVENT RECEIVED:');
//   console.log('Message:', data.message);
//   console.log('Order ID:', data.order._id);
//   console.log('Order Number:', data.order.orderNumber);
//   console.log('Timestamp:', data.timestamp);
// });

// socket.on('order:status_changed', (data) => {
//   console.log('\n🔄 ORDER STATUS CHANGED EVENT RECEIVED:');
//   console.log('Message:', data.message);
//   console.log('Order ID:', data.order._id);
//   console.log('Order Number:', data.order.orderNumber);
//   console.log('Old Status:', data.oldStatus);
//   console.log('New Status:', data.newStatus);
//   console.log('Timestamp:', data.timestamp);
// });

// socket.on('order:updated', (data) => {
//   console.log('\n📝 ORDER UPDATED EVENT RECEIVED:');
//   console.log('Message:', data.message);
//   console.log('Order ID:', data.order._id);
//   console.log('Order Number:', data.order.orderNumber);
//   console.log('Timestamp:', data.timestamp);
// });

// socket.on('order:cancelled', (data) => {
//   console.log('\n❌ ORDER CANCELLED EVENT RECEIVED:');
//   console.log('Message:', data.message);
//   console.log('Order ID:', data.order._id);
//   console.log('Order Number:', data.order.orderNumber);
//   console.log('Timestamp:', data.timestamp);
// });

// socket.on('order:completed', (data) => {
//   console.log('\n🎉 ORDER COMPLETED EVENT RECEIVED:');
//   console.log('Message:', data.message);
//   console.log('Order ID:', data.order._id);
//   console.log('Order Number:', data.order.orderNumber);
//   console.log('Timestamp:', data.timestamp);
// });

// // Error handling
// socket.on('connect_error', (error) => {
//   console.error('❌ Connection error:', error.message);
//   if (error.message.includes('Authentication')) {
//     console.error('⚠️  Token is invalid or expired');
//     process.exit(1);
//   }
// });

// socket.on('error', (error) => {
//   console.error('❌ Socket error:', error);
// });

// console.log('\n👂 Listening for order events...');
// console.log('💡 Now update an order status via Postman and watch for events here\n');

// // Keep the script running
// process.on('SIGINT', () => {
//   console.log('\n\n👋 Closing connection...');
//   socket.disconnect();
//   process.exit(0);
// });
const { io } = require("socket.io-client");

const token = process.argv[2]; // reading JWT from command line arg

console.log("🔌 Connecting to Orders WebSocket...");
console.log("📍 URL: http://localhost:3004");
console.log("🔑 Token:", token);

const socket = io("http://localhost:3004", {
  path: "/socket.io/",
  transports: ["websocket"],
  auth: {
    token: token,
  },
});

socket.on("connect", () => {
  console.log("✅ Connected:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("❌ Connection error:", err.message);
});

socket.on("connected", (data) => {
  console.log("🎉 Server says connected:", data);
});

socket.on("order:status_changed", (data) => {
  console.log("📦 Order Status Changed:", data);
});

socket.on("order:created", (data) => {
  console.log("🆕 Order Created:", data);
});
