/**
 * Test script for WebSocket real-time notifications
 *
 * This script simulates order creation and status updates
 * to verify that WebSocket events are properly emitted
 */

const axios = require('axios');

const ORDERS_API = 'http://localhost:8080/api/v1/orders';
const AUTH_API = 'http://localhost:8080/api/v1/auth';

// You need to replace this with a valid access token
// Login first and copy the accessToken from the browser cookies
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN_HERE';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testWebSocketNotifications() {
  console.log('🧪 Starting WebSocket Real-Time Notifications Test\n');

  try {
    // Step 1: Get user info
    console.log('📋 Step 1: Getting user information...');
    const userInfoResponse = await axios.get(`${AUTH_API}/oauth/userinfo`, {
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
    });
    const userId = userInfoResponse.data.sub || userInfoResponse.data.id || userInfoResponse.data._id;
    console.log(`✅ User ID: ${userId}\n`);

    // Step 2: Create a test order
    console.log('📦 Step 2: Creating a test order...');
    const orderData = {
      items: [
        {
          product_id: '507f1f77bcf86cd799439011', // Mock product ID
          productName: 'Test Product - WebSocket Demo',
          quantity: 2,
          price: 29.99
        }
      ],
      totalAmount: 59.98,
      shippingAddress: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'TC',
        zipCode: '12345',
        country: 'Test Country'
      },
      paymentMethod: 'credit_card',
      paymentStatus: 'paid'
    };

    const createResponse = await axios.post(ORDERS_API, orderData, {
      headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
    });
    const orderId = createResponse.data._id;
    const orderNumber = createResponse.data.orderNumber;
    console.log(`✅ Order created: #${orderNumber} (ID: ${orderId})`);
    console.log(`   🔔 WebSocket event "order:created" should be emitted!\n`);

    // Wait a bit to see the notification
    await delay(2000);

    // Step 3: Update order status to 'processing'
    console.log('🔄 Step 3: Updating order status to "processing"...');
    await axios.patch(`${ORDERS_API}/${orderId}/status`,
      { status: 'processing' },
      { headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` } }
    );
    console.log(`✅ Status updated to "processing"`);
    console.log(`   🔔 WebSocket event "order:status_changed" should be emitted!\n`);

    await delay(2000);

    // Step 4: Update order status to 'shipped'
    console.log('🚚 Step 4: Updating order status to "shipped"...');
    await axios.patch(`${ORDERS_API}/${orderId}/status`,
      { status: 'shipped', trackingNumber: 'TRACK123456789' },
      { headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` } }
    );
    console.log(`✅ Status updated to "shipped"`);
    console.log(`   🔔 WebSocket event "order:status_changed" should be emitted!\n`);

    await delay(2000);

    // Step 5: Update order status to 'delivered'
    console.log('📍 Step 5: Updating order status to "delivered"...');
    await axios.patch(`${ORDERS_API}/${orderId}/status`,
      { status: 'delivered' },
      { headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` } }
    );
    console.log(`✅ Status updated to "delivered"`);
    console.log(`   🔔 WebSocket events "order:status_changed" AND "order:completed" should be emitted!\n`);

    await delay(2000);

    console.log('\n✨ Test completed successfully!');
    console.log('\n📱 Check your frontend Orders page - you should have seen:');
    console.log('   1. Toast notification: "Your order #${orderNumber} has been created!"');
    console.log('   2. Toast notification: "Order #${orderNumber} status updated to processing"');
    console.log('   3. Toast notification: "Order #${orderNumber} status updated to shipped"');
    console.log('   4. Toast notification: "Order #${orderNumber} has been delivered!"');
    console.log('   5. Orders list should auto-refresh after each event\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }

    if (error.message.includes('401') || error.message.includes('Authentication')) {
      console.log('\n💡 Make sure to:');
      console.log('   1. Log in to the application');
      console.log('   2. Copy your accessToken from browser cookies');
      console.log('   3. Run: ACCESS_TOKEN="your-token-here" node test-websocket.js');
    }
  }
}

// Run the test
testWebSocketNotifications();
