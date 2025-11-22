# Postman Collections for E-commerce Microservices

Complete Postman collections for testing all microservices in the E-commerce platform.

## 📦 Available Collections

1. **Auth-Service.postman_collection.json** - Authentication & OAuth2
2. **Products-Service.postman_collection.json** - Product Catalog Management
3. **Orders-Service.postman_collection.json** - Order Management

## 🚀 Quick Start

### 1. Import Collections

1. Open Postman
2. Click **Import** button (top-left)
3. Drag and drop all `.json` files from this folder
4. Collections will appear in your sidebar

### 2. Set Up Environment (Optional)

Create a Postman environment with these variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `auth_base_url` | `http://localhost:3000` | Auth service URL |
| `products_base_url` | `http://localhost:3001` | Products service URL |
| `orders_base_url` | `http://localhost:3004` | Orders service URL |
| `access_token` | (auto-set) | JWT access token |
| `refresh_token` | (auto-set) | JWT refresh token |
| `user_id` | (auto-set) | Current user ID |
| `product_id` | (auto-set) | Sample product ID |
| `order_id` | (auto-set) | Sample order ID |

**Note**: Tokens and IDs are automatically set by test scripts when you run the requests.

## 📚 Collection Details

### Auth Service Collection

**Base URL**: `http://localhost:3000`

**Endpoints**:
1. ✅ Register User - Create a new account
2. ✅ Login - Get access and refresh tokens
3. ✅ Get User Info - Retrieve current user data
4. ✅ Refresh Access Token - Get new access token
5. ✅ Revoke Token (Logout) - Invalidate tokens
6. ✅ OpenID Discovery - Get OAuth2 configuration

**Automated Features**:
- Auto-saves `access_token` and `refresh_token` after login
- Auto-clears tokens after logout
- Test assertions for successful responses

### Products Service Collection

**Base URL**: `http://localhost:3001`

**Public Endpoints** (No auth required):
1. ✅ Get All Products - Browse with pagination & filters
2. ✅ Search Products - Search by keyword
3. ✅ Get Product by ID - View single product

**Admin Endpoints** (Requires admin role):
4. ✅ Create Product - Add new product
5. ✅ Update Product - Modify existing product
6. ✅ Delete Product - Remove product

**Stock Management**:
7. ✅ Reserve Stock - Reserve inventory
8. ✅ Release Stock - Release reserved inventory

**Automated Features**:
- Auto-saves first `product_id` when fetching products
- Auto-saves newly created `product_id`

### Orders Service Collection

**Base URL**: `http://localhost:3004`

**Order Management**:
1. ✅ Create Order - Place a new order
2. ✅ Get Order by ID - View specific order
3. ✅ Get User's Orders - View all user orders
4. ✅ Update Order - Modify order details
5. ✅ Cancel Order - Cancel an order

**Admin Endpoints** (Requires admin role):
6. ✅ Get All Orders - View all system orders
7. ✅ Update Order Status - Change order status
8. ✅ Delete Order - Remove order

**Automated Features**:
- Auto-saves `order_id` and `user_id` after order creation
- Real-time updates via WebSocket (connect separately)

## 🔐 Authentication Flow

### Step-by-Step Guide

1. **Register a User** (Auth Collection → Request #1)
   ```json
   {
     "email": "testuser@example.com",
     "password": "password123",
     "name": "Test User"
   }
   ```

2. **Login** (Auth Collection → Request #2)
   - Automatically saves `access_token` to collection variables
   - Token is used automatically in subsequent requests

3. **Use Protected Endpoints**
   - All authenticated requests automatically include the token
   - Token is sent as: `Authorization: Bearer {{access_token}}`

4. **Create Admin User** (For testing admin endpoints)
   - Register normally, then manually update user role in MongoDB:
   ```javascript
   db.users.updateOne(
     { email: "admin@example.com" },
     { $set: { roles: [3] } }  // 3 = admin role
   )
   ```

## 📝 Usage Examples

### Example 1: Complete Order Flow

1. **Login** (Auth #2) → Gets `access_token`
2. **Get All Products** (Products #1) → Gets `product_id`
3. **Create Order** (Orders #1) → Creates order with product
4. **Get User's Orders** (Orders #3) → View the order
5. **Update Order Status** (Orders #7, Admin) → Mark as shipped

### Example 2: Product Management (Admin)

1. **Login as Admin** (Auth #2)
2. **Create Product** (Products #4) → Adds new product
3. **Update Product** (Products #5) → Modifies price/stock
4. **Get All Products** (Products #1) → Verify changes

### Example 3: Search & Browse

1. **Search Products** (Products #2) → Find "laptop"
2. **Get Product by ID** (Products #3) → View details
3. **Get All Products** (Products #1) with filters:
   - `?category=electronics`
   - `?minPrice=100&maxPrice=500`
   - `?inStock=true`
   - `?sort=-price` (highest price first)

## 🎯 Tips & Tricks

### Using Collection Variables

Access variables in request URLs:
```
{{base_url}}/api/v1/products/{{product_id}}
```

### Query Parameters

Enable/disable query params in Postman to test different filters:
- ✅ Enabled: `?page=1&limit=20`
- ❌ Disabled: Parameters ignored

### Test Scripts

Each request includes test scripts that:
- ✅ Validate response status
- ✅ Auto-save important IDs
- ✅ Log useful information to console

View Console: `View` → `Show Postman Console` (Alt+Ctrl+C)

### Admin Requests

Requests marked **(Admin)** require admin role:
1. Login with admin account
2. Or update user role in database
3. Token automatically includes role claims

## 🔢 Enum Reference

### Order Status
- `1` - Pending
- `2` - Processing
- `3` - Shipped
- `4` - Delivered
- `5` - Cancelled

### Payment Method
- `1` - Credit Card
- `2` - Debit Card
- `3` - PayPal
- `4` - Cash on Delivery

### Payment Status
- `1` - Paid
- `2` - Pending
- `3` - Failed
- `4` - Refunded

### User Roles
- `1` - User
- `2` - Manager
- `3` - Admin

## 🐛 Troubleshooting

### 401 Unauthorized
**Issue**: Token expired or invalid
**Solution**: Re-login (Auth #2) to get fresh token

### 403 Forbidden
**Issue**: Insufficient permissions
**Solution**: Ensure user has admin role for admin endpoints

### 404 Not Found
**Issue**: Invalid ID or resource doesn't exist
**Solution**: Use auto-saved variables or verify ID exists

### Connection Refused
**Issue**: Service not running
**Solution**: Start the service:
```bash
cd services/auth && npm start
cd services/products && npm start
cd services/orders && npm start
```

### Empty Response
**Issue**: No data in database
**Solution**: Create test data using POST requests

## 🔄 WebSocket Testing

For real-time order updates, use a WebSocket client:

```javascript
const io = require('socket.io-client');
const socket = io('http://localhost:3004', {
  auth: { token: 'YOUR_ACCESS_TOKEN' }
});

socket.on('orderUpdate', (data) => {
  console.log('Order updated:', data);
});
```

## 📖 Additional Resources

- **API Documentation**: See `/docs` folder in each service
- **Environment Variables**: Check `.env.example` files
- **Database Schema**: See `/models` in each service
- **Main README**: `/README.md` in project root

## 🤝 Contributing

When adding new endpoints:
1. Update the relevant collection
2. Add test scripts for auto-saving variables
3. Update this README with usage examples
4. Test all requests before committing

---

**Happy Testing! 🚀**
