# Enum Quick Reference Card

**Quick lookup for all numeric enum values in the system**

---

## Order Status

| Code | Name | Color |
|------|------|-------|
| **1** | Pending | 🟡 Yellow |
| **2** | Processing | 🔵 Blue |
| **3** | Shipped | 🟣 Purple |
| **4** | Delivered | 🟢 Green |
| **5** | Cancelled | 🔴 Red |

```javascript
// Backend
const { ORDER_STATUS } = require('../constants/orderStatus');
ORDER_STATUS.PENDING      // 1
ORDER_STATUS.PROCESSING   // 2
ORDER_STATUS.SHIPPED      // 3
ORDER_STATUS.DELIVERED    // 4
ORDER_STATUS.CANCELLED    // 5

// Frontend
import { OrderStatusCode } from '@/constants/orderStatus';
OrderStatusCode.PENDING      // 1
OrderStatusCode.PROCESSING   // 2
OrderStatusCode.SHIPPED      // 3
OrderStatusCode.DELIVERED    // 4
OrderStatusCode.CANCELLED    // 5
```

---

## Payment Status

| Code | Name | Color |
|------|------|-------|
| **1** | Pending | 🟡 Yellow |
| **2** | Paid | 🟢 Green |
| **3** | Failed | 🔴 Red |
| **4** | Refunded | ⚫ Gray |

```javascript
// Backend
const { PAYMENT_STATUS_CODE } = require('../constants/paymentStatus');
PAYMENT_STATUS_CODE.PENDING   // 1
PAYMENT_STATUS_CODE.PAID      // 2
PAYMENT_STATUS_CODE.FAILED    // 3
PAYMENT_STATUS_CODE.REFUNDED  // 4

// Frontend
import { PaymentStatusCode } from '@/constants/paymentStatus';
PaymentStatusCode.PENDING   // 1
PaymentStatusCode.PAID      // 2
PaymentStatusCode.FAILED    // 3
PaymentStatusCode.REFUNDED  // 4
```

---

## Payment Method

| Code | Name | Display | Fee |
|------|------|---------|-----|
| **1** | credit_card | Credit Card | 2.9% |
| **2** | debit_card | Debit Card | 2.5% |
| **3** | paypal | PayPal | 3.5% |
| **4** | cash_on_delivery | Cash on Delivery | 0% |
| **5** | bank_transfer | Bank Transfer | 0% |
| **6** | upi | UPI | 0% |
| **7** | wallet | Digital Wallet | 1.5% |

```javascript
// Backend
const { PAYMENT_METHOD_CODE } = require('../constants/paymentMethod');
PAYMENT_METHOD_CODE.CREDIT_CARD       // 1
PAYMENT_METHOD_CODE.DEBIT_CARD        // 2
PAYMENT_METHOD_CODE.PAYPAL            // 3
PAYMENT_METHOD_CODE.CASH_ON_DELIVERY  // 4
PAYMENT_METHOD_CODE.BANK_TRANSFER     // 5
PAYMENT_METHOD_CODE.UPI               // 6
PAYMENT_METHOD_CODE.WALLET            // 7

// Frontend
import { PaymentMethodCode } from '@/constants/paymentMethod';
PaymentMethodCode.CREDIT_CARD       // 1
PaymentMethodCode.DEBIT_CARD        // 2
PaymentMethodCode.PAYPAL            // 3
PaymentMethodCode.CASH_ON_DELIVERY  // 4
PaymentMethodCode.BANK_TRANSFER     // 5
PaymentMethodCode.UPI               // 6
PaymentMethodCode.WALLET            // 7
```

---

## User Roles

| Code | Name | Level | Permissions |
|------|------|-------|-------------|
| **1** | user | 1 | Basic |
| **2** | moderator | 2 | + Products/Orders |
| **3** | admin | 3 | Full Access |

```javascript
// Backend
const { USER_ROLE_CODE } = require('../../shared/constants/userRoles');
USER_ROLE_CODE.USER       // 1
USER_ROLE_CODE.MODERATOR  // 2
USER_ROLE_CODE.ADMIN      // 3

// Frontend
import { UserRoleCode } from '@/constants/userRoles';
UserRoleCode.USER       // 1
UserRoleCode.MODERATOR  // 2
UserRoleCode.ADMIN      // 3
```

---

## Common Usage Patterns

### Creating an Order

```javascript
// ✅ CORRECT
const order = {
  status: 1,           // Pending
  paymentStatus: 1,    // Pending
  paymentMethod: 4,    // COD
};

// ❌ WRONG
const order = {
  status: 'pending',
  paymentStatus: 'pending',
  paymentMethod: 'cash_on_delivery',
};
```

### Displaying Values

```javascript
// Backend
const { getPaymentMethodDisplay } = require('../constants/paymentMethod');
const { getPaymentStatusDisplay } = require('../constants/paymentStatus');

console.log(getPaymentMethodDisplay(4));  // "Cash on Delivery"
console.log(getPaymentStatusDisplay(2));  // "Paid"

// Frontend
import { getPaymentMethodDisplay } from '@/constants/paymentMethod';
import { getPaymentStatusDisplay } from '@/constants/paymentStatus';

<p>{getPaymentMethodDisplay(order.paymentMethod)}</p>
<p>{getPaymentStatusDisplay(order.paymentStatus)}</p>
```

### Checking Permissions

```javascript
// Backend
const { hasPermission, isAdmin } = require('../../shared/constants/userRoles');

if (hasPermission(userRole, 'canManageProducts')) {
  // Allow product management
}

if (isAdmin(userRole)) {
  // Full access
}

// Frontend
import { hasPermission, isAdmin } from '@/constants/userRoles';

if (hasPermission(user.role, 'canManageProducts')) {
  return <AdminPanel />;
}
```

### Converting Between Formats

```javascript
// String → Number
const { getPaymentMethodCode } = require('../constants/paymentMethod');
const code = getPaymentMethodCode('cash_on_delivery'); // 4

// Number → String
const { getPaymentMethodLabel } = require('../constants/paymentMethod');
const label = getPaymentMethodLabel(4); // 'cash_on_delivery'

// Number → Display
const { getPaymentMethodDisplay } = require('../constants/paymentMethod');
const display = getPaymentMethodDisplay(4); // 'Cash on Delivery'
```

---

## Database Queries

```javascript
// Find all paid orders
db.orders.find({ paymentStatus: 2 })

// Find COD orders
db.orders.find({ paymentMethod: 4 })

// Find delivered orders
db.orders.find({ status: 4 })

// Complex query
db.orders.find({
  status: { $in: [3, 4] },      // Shipped or Delivered
  paymentStatus: 2,              // Paid
  paymentMethod: { $ne: 4 }      // Not COD
})
```

---

## API Examples

### Create Order

```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "items": [...],
    "shippingAddress": {...},
    "paymentMethod": 4,
    "paymentStatus": 1
  }'
```

### Response

```json
{
  "success": true,
  "data": {
    "order": {
      "_id": "...",
      "status": 1,
      "paymentStatus": 1,
      "paymentMethod": 4,
      "totalAmount": 99.99
    }
  }
}
```

---

## Validation

```javascript
// Backend model validation (automatic)
const Order = require('./models/Order');

const order = new Order({
  paymentMethod: 99  // ❌ Will fail - not in enum [1-7]
});

await order.save(); // ValidationError

// Frontend validation
import { isValidPaymentMethod } from '@/constants/paymentMethod';

if (!isValidPaymentMethod(value)) {
  throw new Error('Invalid payment method');
}
```

---

## Migration Reminder

```javascript
// If you have old string data, migrate it:
// Run: node services/orders/migration-numeric-enums.js

// Before migration:
{ paymentMethod: "cash_on_delivery", paymentStatus: "pending" }

// After migration:
{ paymentMethod: 4, paymentStatus: 1 }
```

---

## Common Mistakes to Avoid

```javascript
// ❌ DON'T: Use strings
order.paymentMethod = 'cash_on_delivery';

// ✅ DO: Use numeric constants
order.paymentMethod = PaymentMethodCode.CASH_ON_DELIVERY;

// ❌ DON'T: Hardcode numbers
if (order.status === 4) { }

// ✅ DO: Use named constants
if (order.status === OrderStatusCode.DELIVERED) { }

// ❌ DON'T: Display raw numbers
<p>Payment: {order.paymentMethod}</p>  // Shows "4"

// ✅ DO: Use display helpers
<p>Payment: {getPaymentMethodDisplay(order.paymentMethod)}</p>  // Shows "Cash on Delivery"
```

---

**Print this reference card and keep it handy!** 📋
