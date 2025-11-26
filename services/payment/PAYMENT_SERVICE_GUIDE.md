# Payment Service - Implementation Guide

## Overview

The Payment Service has been completely redesigned following best practices from the Order and Auth services. It now includes:

- ✅ **Numeric enums** for payment status and methods (better performance)
- ✅ **Transactional management** using MongoDB sessions
- ✅ **Comprehensive error handling** with user-friendly messages
- ✅ **Security best practices** (webhook signature verification, input validation)
- ✅ **Proper authentication** and authorization middleware
- ✅ **Stripe integration** with checkout sessions and webhooks
- ✅ **Database indexes** for query performance
- ✅ **Consistent coding patterns** across all services

## Architecture

### File Structure

```
services/payment/
├── constants/
│   ├── paymentStatus.js      # Payment status constants (1-6)
│   └── paymentMethod.js       # Payment method constants (1-8)
├── controllers/
│   └── paymentController.js   # Main payment logic with transactions
├── models/
│   └── Payment.js            # Payment schema with numeric enums
├── middleware/
│   ├── auth.js               # Authentication & authorization
│   └── apiVersion.js         # API versioning
├── routes/
│   └── v1/
│       └── paymentRoutes.js  # Route definitions
├── utils/
│   └── errorResponse.js      # Standardized error responses
├── config/
│   └── db.js                 # Database configuration
└── server.js                 # Express server with webhook handling
```

## Payment Status Codes (Numeric)

Following the pattern from Order service, we use numeric codes for better performance:

| Code | Status      | Description                          |
|------|-------------|--------------------------------------|
| 1    | Pending     | Payment initiated, awaiting process  |
| 2    | Processing  | Payment being processed by gateway   |
| 3    | Completed   | Payment successfully completed       |
| 4    | Failed      | Payment failed or declined           |
| 5    | Refunded    | Payment refunded to customer         |
| 6    | Cancelled   | Payment cancelled before completion  |

### Valid Status Transitions

```
1 (Pending) → 2 (Processing) → 3 (Completed)
             ↓                    ↓
        4 (Failed)            5 (Refunded)
             ↓
        6 (Cancelled)
```

## Payment Methods (Numeric)

| Code | Method           | Online | Fee  |
|------|------------------|--------|------|
| 1    | Credit Card      | Yes    | 2.9% |
| 2    | Debit Card       | Yes    | 2.5% |
| 3    | UPI              | Yes    | 0%   |
| 4    | Net Banking      | Yes    | 0%   |
| 5    | Wallet           | Yes    | 1.5% |
| 6    | Cash on Delivery | No     | 0%   |
| 7    | Stripe           | Yes    | 2.9% |
| 8    | PayPal           | Yes    | 3.5% |

## API Endpoints

### Public Endpoints

```
GET  /v1/payment/statuses    # Get all payment status codes
GET  /v1/payment/methods     # Get all payment methods
POST /v1/payment/webhook     # Stripe webhook (signature verified)
```

### Authenticated Endpoints

```
POST   /v1/payment/checkout-session        # Create payment (User)
GET    /v1/payment                         # Get all payments (Admin)
GET    /v1/payment/stats                   # Payment statistics (Admin)
GET    /v1/payment/user/:userId            # Get user payments (Owner/Admin)
GET    /v1/payment/order/:orderId          # Get order payments (User)
GET    /v1/payment/:id                     # Get payment by ID (User)
PATCH  /v1/payment/:id/status              # Update payment status (Admin)
POST   /v1/payment/:id/refund              # Initiate refund (Admin)
```

## Environment Variables

Add these to your `.env.local` file:

```env
# Payment Service
PORT=3003
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/launchpad_payments

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Frontend URLs
FRONTEND_URL=http://localhost:3000

# JWT Configuration (from auth service)
ACCESS_TOKEN_SECRET=your_access_token_secret
ISSUER=http://localhost:3001
```

## Transactional Management

All critical operations use MongoDB transactions for data consistency:

### Example: Create Checkout Session

```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // 1. Validate request data
  // 2. Create Stripe checkout session
  // 3. Save payment record in database
  // 4. Commit transaction

  await session.commitTransaction();
  res.status(201).json(response);
} catch (error) {
  await session.abortTransaction();
  res.status(500).json(errorResponse);
} finally {
  session.endSession();
}
```

## Security Best Practices

### 1. Webhook Signature Verification

```javascript
// Stripe webhook handler verifies signature
const sig = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.body,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### 2. Input Validation

- Email format validation
- Amount validation (must be > 0)
- Required fields validation
- MongoDB ObjectID format validation

### 3. Authentication & Authorization

- JWT token verification
- Role-based access control (admin, user)
- Owner-or-admin checks for sensitive data

### 4. Data Security

- IP address tracking for fraud prevention
- User agent logging
- Sensitive data not exposed in errors (production)

## Database Schema

### Payment Model Features

- **Comprehensive validation** with custom error messages
- **Indexes** for performance (userId, orderId, status, etc.)
- **Pre-save middleware** for calculating net amounts and timestamps
- **Virtual fields** for computed properties (ageInHours)
- **Schema methods** (isTerminal(), canBeRefunded())

### Key Fields

```javascript
{
  orderId: ObjectId,          // Reference to order
  userId: ObjectId,           // Reference to user
  items: [ItemSchema],        // Order items
  paymentMethod: Number,      // 1-8 (numeric enum)
  status: Number,             // 1-6 (numeric enum)
  amount: Number,             // Total amount
  currency: String,           // USD, INR, etc.
  processingFee: Number,      // Gateway fees
  netAmount: Number,          // Amount - fees
  stripeDetails: {
    sessionId: String,
    paymentIntentId: String,
    chargeId: String,
    customerId: String
  },
  refundDetails: {
    refundId: String,
    refundAmount: Number,
    refundReason: String,
    refundedAt: Date
  },
  // ... more fields
  timestamps: true
}
```

## Frontend Integration

### 1. Create Checkout Session

```javascript
const createCheckout = async (orderData) => {
  const response = await fetch('http://localhost:3003/v1/payment/checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      orderId: order._id,
      userId: user._id,
      items: order.items,
      amount: order.totalAmount,
      currency: 'USD',
      customerEmail: user.email,
      successUrl: 'http://localhost:3000/payment/success',
      cancelUrl: 'http://localhost:3000/payment/cancel'
    })
  });

  const { data } = await response.json();

  // Redirect to Stripe checkout
  window.location.href = data.checkoutUrl;
};
```

### 2. Get Payment Status Codes (for dropdowns)

```javascript
const getPaymentStatuses = async () => {
  const response = await fetch('http://localhost:3003/v1/payment/statuses');
  const { data } = await response.json();

  // data.statuses = [
  //   { code: 1, string: 'pending', label: 'Pending', color: 'yellow' },
  //   { code: 2, string: 'processing', label: 'Processing', color: 'blue' },
  //   ...
  // ]

  return data.statuses;
};
```

### 3. Get User Payments

```javascript
const getUserPayments = async (userId) => {
  const response = await fetch(`http://localhost:3003/v1/payment/user/${userId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  const { data } = await response.json();
  return data.payments;
};
```

## Stripe Webhook Setup

### 1. Install Stripe CLI (for local testing)

```bash
brew install stripe/stripe-cli/stripe
stripe login
```

### 2. Forward Webhooks to Local Server

```bash
stripe listen --forward-to localhost:3003/v1/payment/webhook
```

### 3. Get Webhook Secret

The CLI will output a webhook secret like `whsec_xxx...`. Add this to your `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_xxx...
```

### 4. Test Payment Flow

```bash
stripe trigger checkout.session.completed
```

## Error Handling

All errors follow a consistent format:

### Validation Error (400)

```json
{
  "success": false,
  "error": "Validation Error",
  "message": "Required fields are missing",
  "fields": {
    "orderId": "Order ID is required",
    "amount": "Valid payment amount is required"
  },
  "statusCode": 400
}
```

### Unauthorized (401)

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Authentication required",
  "suggestion": "Please log in and try again",
  "statusCode": 401
}
```

### Not Found (404)

```json
{
  "success": false,
  "error": "Not Found",
  "message": "Payment with ID 'xxx' was not found",
  "suggestion": "Please verify the ID and try again",
  "id": "xxx",
  "statusCode": 404
}
```

### Invalid Transition (422)

```json
{
  "success": false,
  "error": "Unprocessable Entity",
  "message": "Invalid status transition",
  "details": {
    "currentStatus": 3,
    "currentStatusLabel": "Completed",
    "attemptedStatus": 1,
    "attemptedStatusLabel": "Pending",
    "reason": "Cannot transition from Completed to Pending"
  },
  "statusCode": 422
}
```

## Testing

### Manual Testing

1. **Create Checkout Session**
```bash
curl -X POST http://localhost:3003/v1/payment/checkout-session \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "orderId": "ORDER_ID",
    "userId": "USER_ID",
    "items": [{"productId": "P1", "productName": "Test", "quantity": 1, "price": 100}],
    "amount": 100,
    "customerEmail": "test@example.com"
  }'
```

2. **Get Payment Statuses**
```bash
curl http://localhost:3003/v1/payment/statuses
```

3. **Get Payment Methods**
```bash
curl http://localhost:3003/v1/payment/methods
```

## Consistency with Other Services

This payment service follows the exact patterns from:

### From Order Service:
- ✅ Numeric status codes with helper functions
- ✅ Valid transition checks
- ✅ Comprehensive JSDoc comments
- ✅ ErrorResponse utility usage
- ✅ Proper index definitions

### From Auth Service:
- ✅ JWT token verification
- ✅ Role-based middleware
- ✅ API versioning
- ✅ Rate limiting setup

### Best Practices Applied:
- ✅ Transaction management for data consistency
- ✅ Input validation with meaningful errors
- ✅ Security (signature verification, input sanitization)
- ✅ Performance optimization (indexes, pagination)
- ✅ User-friendly error messages
- ✅ Consistent code structure

## Migration Notes

If you have existing payment data with string statuses/methods:

1. The old string-based status/method fields will cause validation errors
2. You need to migrate existing data or clear the payments collection
3. Use the helper functions to convert between string and numeric codes:

```javascript
const { stringToStatus } = require('./constants/paymentStatus');
const { getPaymentMethodCode } = require('./constants/paymentMethod');

// Convert string to code
const statusCode = stringToStatus('completed'); // Returns 3
const methodCode = getPaymentMethodCode('stripe'); // Returns 7
```

## Next Steps

1. ✅ All files updated with best practices
2. ✅ Numeric enums implemented
3. ✅ Transactional management added
4. ✅ Security best practices applied
5. ✅ Error handling standardized

### Ready to Use:
- Start the payment service: `npm run dev` or `npm start`
- Configure Stripe webhook forwarding (see above)
- Test checkout flow with frontend integration
- Monitor webhook events in Stripe dashboard

## Support

For questions or issues:
1. Check this guide first
2. Review Order service for similar patterns
3. Check Auth service for authentication patterns
4. Refer to Stripe documentation: https://stripe.com/docs
