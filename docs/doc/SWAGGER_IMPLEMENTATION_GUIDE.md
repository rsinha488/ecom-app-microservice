# Swagger API Documentation - Implementation Guide

**Status:** 🚧 In Progress
**Date:** 2025-11-19

---

## 📋 Overview

This guide provides complete implementation of Swagger/OpenAPI documentation for all 5 microservices in the LaunchpadMERN e-commerce platform.

**Progress:**
- ✅ Dependencies installed (Products, Categories, Orders)
- ✅ API Analysis complete
- 🚧 Configuration files (in progress)
- ⏳ Documentation annotations (next)

---

## 🎯 Quick Start

### Access Swagger UI:
Once implemented, access documentation at:
- Products: http://localhost:3001/api-docs
- Categories: http://localhost:3002/api-docs
- Orders: http://localhost:3004/api-docs
- Auth: http://localhost:3000/api-docs (partial)
- Users: http://localhost:3003/api-docs

### Try APIs:
1. Open Swagger UI in browser
2. Click "Authorize" button
3. Enter Bearer token
4. Click "Try it out" on any endpoint
5. Fill parameters and click "Execute"

---

##  1. Swagger Configuration Setup

### Step 1: Create `config/swagger.js` in each service

This file is created in the next step for each service.

### Step 2: Update `server.js` to include Swagger

**Add at the top:**
```javascript
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
```

**Add before routes (after middleware):**
```javascript
// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Products API Documentation'
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
```

---

## 📦 Implementation Files

I'll now create all the necessary files for you. The files will be created in each service directory with complete Swagger documentation.

---

## ✅ Files to be Created

### Products Service:
- `config/swagger.js` - Swagger configuration
- `routes/v1/productRoutes.swagger.js` - API documentation
- Update: `server.js` - Add Swagger UI

### Categories Service:
- `config/swagger.js` - Swagger configuration
- `routes/v1/categoryRoutes.swagger.js` - API documentation
- Update: `server.js` - Add Swagger UI

### Orders Service:
- `config/swagger.js` - Swagger configuration
- `routes/v1/orderRoutes.swagger.js` - API documentation
- Update: `server.js` - Add Swagger UI

### Auth Service (Update existing):
- Update: `config/swagger.js` - Add if missing
- Already has: `routes/v1/authRoutes.swagger.js`
- Update: `server.js` - Add Swagger UI

### Users Service:
- `config/swagger.js` - Swagger configuration
- `routes/v1/userRoutes.swagger.js` - API documentation
- Update: `server.js` - Add Swagger UI

---

## 🚀 Testing Checklist

After implementation, test each service:

### Products Service:
- [ ] Swagger UI loads at `/api-docs`
- [ ] All 5 endpoints documented
- [ ] "Try it out" works for GET endpoints
- [ ] Authentication works for protected endpoints
- [ ] Request/Response examples display correctly

### Categories Service:
- [ ] Swagger UI loads at `/api-docs`
- [ ] All 5 endpoints documented
- [ ] Category model displays correctly
- [ ] Can test GET endpoints without auth

### Orders Service:
- [ ] Swagger UI loads at `/api-docs`
- [ ] All 7 endpoints documented
- [ ] Complex Order model displays correctly
- [ ] WebSocket documentation visible
- [ ] Authentication required for all endpoints

---

## 📝 Common Swagger Annotations

### Basic Endpoint Documentation:
```javascript
/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     tags:
 *       - Products
 *     summary: Get all products
 *     description: Retrieve a list of all products with optional filtering
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
```

### With Authentication:
```javascript
/**
 * @swagger
 * /api/v1/products:
 *   post:
 *     tags:
 *       - Products
 *     summary: Create product
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProductInput'
 *     responses:
 *       201:
 *         description: Product created
 */
```

---

## 🎨 Swagger UI Customization

### Custom CSS (Optional):
```javascript
const swaggerOptions = {
  explorer: true,
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #4F46E5 }
  `,
  customSiteTitle: 'My API Documentation',
  swaggerOptions: {
    persistAuthorization: true
  }
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));
```

---

## 🔐 Authentication in Swagger UI

### OAuth2 Flow (Auth Service):
Users can:
1. Click "Authorize"
2. Enter credentials
3. Get access token automatically
4. Token used for all subsequent requests

### Bearer Token (Other Services):
Users must:
1. Login via Auth service
2. Copy access token
3. Click "Authorize" in other services
4. Paste token
5. Click "Authorize"

---

## 📊 Best Practices

### 1. Use Schema References
✅ GOOD:
```javascript
schema:
  $ref: '#/components/schemas/Product'
```

❌ BAD:
```javascript
schema:
  type: object
  properties:
    name: { type: string }
    // ... repeat for every endpoint
```

### 2. Provide Examples
```javascript
example:
  name: "Wireless Headphones"
  price: 129.99
  stock: 50
```

### 3. Document All Responses
Include: 200, 201, 400, 401, 403, 404, 500

### 4. Use Clear Descriptions
```javascript
description: |
  Retrieve all products with optional filtering and pagination.

  **Filtering:**
  - category: Filter by category name
  - minPrice/maxPrice: Price range
  - search: Search in name and description

  **Sorting:**
  - Use '-' prefix for descending (e.g., '-price')
```

---

## 🐛 Troubleshooting

### Swagger UI not loading?
1. Check server.js has swagger routes
2. Verify port is correct
3. Check console for errors
4. Ensure swagger-jsdoc is installed

### Endpoints not showing?
1. Check swagger.js includes correct route files
2. Verify JSDoc comments syntax
3. Check for missing commas/brackets
4. Restart service after changes

### Authentication not working?
1. Check security schemes in components
2. Verify Bearer token format
3. Test token with curl first
4. Check middleware is applied to routes

### Models not displaying?
1. Check schema definitions in components
2. Verify $ref paths are correct
3. Check for circular references
4. Validate JSON syntax

---

## 📚 Additional Resources

### Official Documentation:
- Swagger/OpenAPI: https://swagger.io/docs/
- swagger-jsdoc: https://github.com/Surnet/swagger-jsdoc
- swagger-ui-express: https://github.com/scottie1984/swagger-ui-express

### Example Annotations:
See existing `auth/routes/v1/authRoutes.swagger.js` for reference.

---

## 🎯 Next Steps

1. ✅ Review [API_ANALYSIS.md](API_ANALYSIS.md) for endpoint details
2. 🚧 Implement configuration files (next section)
3. ⏳ Create swagger annotation files
4. ⏳ Update server.js files
5. ⏳ Test Swagger UI for each service
6. ⏳ Document remaining endpoints

---

**Continue to next sections for complete implementation files...**
