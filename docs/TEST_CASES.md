# Comprehensive Test Cases - LaunchpadMERN E-Commerce

**Total Test Cases: 252**
**Date:** 2025-11-19
**Status:** 📋 Complete Test Suite

---

## Table of Contents
1. [Unit Tests - Backend](#unit-tests---backend) (90 cases)
2. [Unit Tests - Frontend](#unit-tests---frontend) (60 cases)
3. [Integration Tests - APIs](#integration-tests---apis) (50 cases)
4. [Integration Tests - Frontend](#integration-tests---frontend) (30 cases)
5. [End-to-End Tests](#end-to-end-tests) (20 cases)
6. [Security Tests](#security-tests) (15 cases)
7. [Performance Tests](#performance-tests) (10 cases)

---

## Unit Tests - Backend

### Auth Service (20 cases)

#### TC-AUTH-001: User Registration - Valid Data
- **Priority:** High
- **Type:** Unit Test
- **Preconditions:** Database empty
- **Steps:**
  1. Call register with valid email, password, name
  2. Check user created in database
  3. Verify password is hashed
- **Expected:** User created successfully, password hashed
- **Status:** ⏳ Not Implemented

#### TC-AUTH-002: User Registration - Duplicate Email
- **Priority:** High
- **Type:** Unit Test
- **Preconditions:** User with email exists
- **Steps:**
  1. Call register with existing email
  2. Check error response
- **Expected:** 409 Conflict, "Email already registered"
- **Status:** ⏳ Not Implemented

#### TC-AUTH-003: User Registration - Invalid Email
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Call register with invalid email format
- **Expected:** 400 Bad Request, validation error
- **Status:** ⏳ Not Implemented

#### TC-AUTH-004: User Registration - Weak Password
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Call register with password < 6 characters
- **Expected:** 400 Bad Request, "Password too short"
- **Status:** ⏳ Not Implemented

#### TC-AUTH-005: User Login - Valid Credentials
- **Priority:** High
- **Type:** Unit Test
- **Preconditions:** User exists
- **Steps:**
  1. Call login with correct email/password
  2. Verify authorization code returned
- **Expected:** 200 OK, authorization code provided
- **Status:** ⏳ Not Implemented

#### TC-AUTH-006: User Login - Invalid Email
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Call login with non-existent email
- **Expected:** 401 Unauthorized, "Invalid credentials"
- **Status:** ⏳ Not Implemented

#### TC-AUTH-007: User Login - Wrong Password
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Call login with correct email, wrong password
- **Expected:** 401 Unauthorized, "Invalid credentials"
- **Status:** ⏳ Not Implemented

#### TC-AUTH-008: Token Exchange - Authorization Code
- **Priority:** High
- **Type:** Unit Test
- **Preconditions:** Valid authorization code
- **Steps:**
  1. Exchange code for tokens
  2. Verify access_token, refresh_token, id_token
- **Expected:** All tokens returned, correct format
- **Status:** ⏳ Not Implemented

#### TC-AUTH-009: Token Exchange - Invalid Code
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Exchange invalid/expired code
- **Expected:** 401 Unauthorized, "Invalid code"
- **Status:** ⏳ Not Implemented

#### TC-AUTH-010: Token Exchange - Refresh Token
- **Priority:** High
- **Type:** Unit Test
- **Preconditions:** Valid refresh token
- **Steps:**
  1. Use refresh token to get new access token
  2. Verify new access token
- **Expected:** New access token issued
- **Status:** ⏳ Not Implemented

#### TC-AUTH-011: Token Verification - Valid Token
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Verify valid access token
  2. Extract user info
- **Expected:** Token valid, user info extracted
- **Status:** ⏳ Not Implemented

#### TC-AUTH-012: Token Verification - Expired Token
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Verify expired token
- **Expected:** 401 Unauthorized, "Token expired"
- **Status:** ⏳ Not Implemented

#### TC-AUTH-013: Token Verification - Invalid Signature
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Verify token with wrong signature
- **Expected:** 401 Unauthorized, "Invalid token"
- **Status:** ⏳ Not Implemented

#### TC-AUTH-014: Token Revocation
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Revoke valid token
  2. Try to use revoked token
- **Expected:** Token revoked, subsequent use fails
- **Status:** ⏳ Not Implemented

#### TC-AUTH-015: User Info Retrieval
- **Priority:** Medium
- **Type:** Unit Test
- **Preconditions:** Valid access token
- **Steps:**
  1. Call userinfo endpoint
  2. Verify user data returned
- **Expected:** User data matches logged-in user
- **Status:** ⏳ Not Implemented

#### TC-AUTH-016: Password Hashing
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Hash password
  2. Verify hash is different from plain text
  3. Verify can compare successfully
- **Expected:** Hash created, comparison works
- **Status:** ⏳ Not Implemented

#### TC-AUTH-017: Password Comparison
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Compare correct password with hash
  2. Compare wrong password with hash
- **Expected:** Correct passes, wrong fails
- **Status:** ⏳ Not Implemented

#### TC-AUTH-018: JWT Token Generation
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Generate JWT with payload
  2. Verify token structure
  3. Decode and check payload
- **Expected:** Valid JWT created with correct payload
- **Status:** ⏳ Not Implemented

#### TC-AUTH-019: OAuth2 Discovery Endpoint
- **Priority:** Low
- **Type:** Unit Test
- **Steps:**
  1. Call /.well-known/openid-configuration
  2. Verify response structure
- **Expected:** OIDC configuration returned
- **Status:** ⏳ Not Implemented

#### TC-AUTH-020: Authorization Code Expiry
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Generate authorization code
  2. Wait for expiry (or mock time)
  3. Try to exchange expired code
- **Expected:** Exchange fails with "Code expired"
- **Status:** ⏳ Not Implemented

---

### Products Service (18 cases)

#### TC-PROD-001: Get All Products - No Filters
- **Priority:** High
- **Type:** Unit Test
- **Preconditions:** Products exist in DB
- **Steps:**
  1. Call getAllProducts()
  2. Verify products returned
- **Expected:** Array of products
- **Status:** ⏳ Not Implemented

#### TC-PROD-002: Get All Products - With Pagination
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Call with page=2, limit=10
  2. Verify correct page returned
- **Expected:** 10 products from page 2
- **Status:** ⏳ Not Implemented

#### TC-PROD-003: Get All Products - Filter by Category
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Call with category="Electronics"
  2. Verify only electronics returned
- **Expected:** All products are Electronics
- **Status:** ⏳ Not Implemented

#### TC-PROD-004: Get All Products - Price Range Filter
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Call with minPrice=100, maxPrice=200
  2. Verify prices in range
- **Expected:** All products between $100-$200
- **Status:** ⏳ Not Implemented

#### TC-PROD-005: Get All Products - Search Query
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Call with search="headphones"
  2. Verify results match search
- **Expected:** Products with "headphones" in name/description
- **Status:** ⏳ Not Implemented

#### TC-PROD-006: Get All Products - Sort by Price Ascending
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Call with sort="price"
  2. Verify order is correct
- **Expected:** Products sorted low to high price
- **Status:** ⏳ Not Implemented

#### TC-PROD-007: Get All Products - Sort by Price Descending
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Call with sort="-price"
  2. Verify order is correct
- **Expected:** Products sorted high to low price
- **Status:** ⏳ Not Implemented

#### TC-PROD-008: Get Product by ID - Valid ID
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Call getProductById with valid ID
  2. Verify correct product returned
- **Expected:** Product details match ID
- **Status:** ⏳ Not Implemented

#### TC-PROD-009: Get Product by ID - Invalid ID
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Call getProductById with invalid ID
- **Expected:** 404 Not Found
- **Status:** ⏳ Not Implemented

#### TC-PROD-010: Create Product - Valid Data (Admin)
- **Priority:** High
- **Type:** Unit Test
- **Preconditions:** Admin authenticated
- **Steps:**
  1. Call createProduct with valid data
  2. Verify product created in DB
- **Expected:** 201 Created, product saved
- **Status:** ⏳ Not Implemented

#### TC-PROD-011: Create Product - Missing Required Fields
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Call createProduct without name
- **Expected:** 400 Bad Request, validation error
- **Status:** ⏳ Not Implemented

#### TC-PROD-012: Create Product - Duplicate SKU
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Create product with SKU "ABC123"
  2. Try to create another with same SKU
- **Expected:** 409 Conflict, "SKU already exists"
- **Status:** ⏳ Not Implemented

#### TC-PROD-013: Update Product - Valid Data (Admin)
- **Priority:** High
- **Type:** Unit Test
- **Preconditions:** Product exists, admin authenticated
- **Steps:**
  1. Call updateProduct with changes
  2. Verify updates saved
- **Expected:** Product updated successfully
- **Status:** ⏳ Not Implemented

#### TC-PROD-014: Update Product - Non-existent ID
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Call updateProduct with invalid ID
- **Expected:** 404 Not Found
- **Status:** ⏳ Not Implemented

#### TC-PROD-015: Delete Product (Admin)
- **Priority:** High
- **Type:** Unit Test
- **Preconditions:** Product exists, admin authenticated
- **Steps:**
  1. Call deleteProduct
  2. Verify product removed
- **Expected:** Product deleted from DB
- **Status:** ⏳ Not Implemented

#### TC-PROD-016: Stock Check - In Stock
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Check product with stock > 0
  2. Verify inStock is true
- **Expected:** Product marked as in stock
- **Status:** ⏳ Not Implemented

#### TC-PROD-017: Stock Check - Out of Stock
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Check product with stock = 0
  2. Verify inStock is false
- **Expected:** Product marked as out of stock
- **Status:** ⏳ Not Implemented

#### TC-PROD-018: Product Model Validation
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Create product with invalid price (negative)
  2. Verify validation error
- **Expected:** Validation fails for negative price
- **Status:** ⏳ Not Implemented

---

### Categories Service (12 cases)

#### TC-CAT-001: Get All Categories
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Call getAllCategories()
  2. Verify categories returned
- **Expected:** Array of 8 categories
- **Status:** ⏳ Not Implemented

#### TC-CAT-002: Get Category by ID - Valid
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Call getCategoryById with valid ID
- **Expected:** Category details returned
- **Status:** ⏳ Not Implemented

#### TC-CAT-003: Get Category by ID - Invalid
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Call getCategoryById with invalid ID
- **Expected:** 404 Not Found
- **Status:** ⏳ Not Implemented

#### TC-CAT-004: Get Category by Slug
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Call getCategoryBySlug("electronics")
- **Expected:** Electronics category returned
- **Status:** ⏳ Not Implemented

#### TC-CAT-005: Create Category - Valid (Admin)
- **Priority:** High
- **Type:** Unit Test
- **Preconditions:** Admin authenticated
- **Steps:**
  1. Call createCategory with valid data
  2. Verify category created
- **Expected:** 201 Created
- **Status:** ⏳ Not Implemented

#### TC-CAT-006: Create Category - Duplicate Slug
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Create category with slug "test"
  2. Try to create another with same slug
- **Expected:** 409 Conflict
- **Status:** ⏳ Not Implemented

#### TC-CAT-007: Update Category (Admin)
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Update category name
  2. Verify changes saved
- **Expected:** Category updated
- **Status:** ⏳ Not Implemented

#### TC-CAT-008: Delete Category (Admin)
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Delete category
  2. Verify removed from DB
- **Expected:** Category deleted
- **Status:** ⏳ Not Implemented

#### TC-CAT-009: Category Slug Generation
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Create category with name "Test Category"
  2. Verify slug is "test-category"
- **Expected:** Slug auto-generated correctly
- **Status:** ⏳ Not Implemented

#### TC-CAT-010: Category Product Count
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Get category
  2. Verify productCount matches actual products
- **Expected:** Count is accurate
- **Status:** ⏳ Not Implemented

#### TC-CAT-011: Parent Category Relationship
- **Priority:** Low
- **Type:** Unit Test
- **Steps:**
  1. Create subcategory with parentCategory
  2. Verify relationship
- **Expected:** Parent-child relationship established
- **Status:** ⏳ Not Implemented

#### TC-CAT-012: Active/Inactive Categories
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Get all categories
  2. Verify only isActive=true returned
- **Expected:** Inactive categories filtered out
- **Status:** ⏳ Not Implemented

---

### Orders Service (20 cases)

#### TC-ORD-001: Create Order - Valid Data
- **Priority:** Critical
- **Type:** Unit Test
- **Preconditions:** User authenticated, items in cart
- **Steps:**
  1. Call createOrder with valid order data
  2. Verify order saved
  3. Check orderNumber generated
- **Expected:** Order created, WebSocket event emitted
- **Status:** ⏳ Not Implemented

#### TC-ORD-002: Create Order - Empty Items
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Call createOrder with empty items array
- **Expected:** 400 Bad Request, "Items required"
- **Status:** ⏳ Not Implemented

#### TC-ORD-003: Create Order - Invalid Product ID
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Create order with non-existent productId
- **Expected:** 400 Bad Request, "Invalid product"
- **Status:** ⏳ Not Implemented

#### TC-ORD-004: Create Order - Missing Shipping Address
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Create order without shippingAddress
- **Expected:** 400 Bad Request, validation error
- **Status:** ⏳ Not Implemented

#### TC-ORD-005: Create Order - Total Amount Calculation
- **Priority:** Critical
- **Type:** Unit Test
- **Steps:**
  1. Create order with 2 items
  2. Verify totalAmount = sum of (price × quantity)
- **Expected:** Total calculated correctly
- **Status:** ⏳ Not Implemented

#### TC-ORD-006: Get All Orders (Admin Only)
- **Priority:** High
- **Type:** Unit Test
- **Preconditions:** Admin authenticated
- **Steps:**
  1. Call getAllOrders
  2. Verify all orders returned
- **Expected:** All orders in system
- **Status:** ⏳ Not Implemented

#### TC-ORD-007: Get Order by ID
- **Priority:** High
- **Type:** Unit Test
- **Preconditions:** User authenticated
- **Steps:**
  1. Call getOrderById with valid ID
- **Expected:** Order details returned
- **Status:** ⏳ Not Implemented

#### TC-ORD-008: Get Orders by User ID
- **Priority:** Critical
- **Type:** Unit Test
- **Preconditions:** User authenticated
- **Steps:**
  1. Call getOrdersByUserId
  2. Verify only user's orders returned
- **Expected:** User's orders only
- **Status:** ⏳ Not Implemented

#### TC-ORD-009: Update Order Status - To Processing (Admin)
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Update status from pending to processing
  2. Verify WebSocket event emitted
- **Expected:** Status updated, event sent
- **Status:** ⏳ Not Implemented

#### TC-ORD-010: Update Order Status - To Shipped (Admin)
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Update status to shipped
  2. Verify shippedAt timestamp set
- **Expected:** Status and timestamp updated
- **Status:** ⏳ Not Implemented

#### TC-ORD-011: Update Order Status - To Delivered (Admin)
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Update status to delivered
  2. Verify deliveredAt timestamp set
- **Expected:** Status and timestamp updated
- **Status:** ⏳ Not Implemented

#### TC-ORD-012: Cancel Order
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Cancel pending order
  2. Verify cancelledAt timestamp set
- **Expected:** Order cancelled
- **Status:** ⏳ Not Implemented

#### TC-ORD-013: Cancel Order - Already Shipped
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Try to cancel shipped order
- **Expected:** 400 Bad Request, "Cannot cancel shipped order"
- **Status:** ⏳ Not Implemented

#### TC-ORD-014: Order Number Generation
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Create order
  2. Verify orderNumber format (ORD-timestamp-random)
- **Expected:** Unique order number generated
- **Status:** ⏳ Not Implemented

#### TC-ORD-015: Order Number Uniqueness
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Create 100 orders
  2. Verify all orderNumbers unique
- **Expected:** No duplicate order numbers
- **Status:** ⏳ Not Implemented

#### TC-ORD-016: Payment Status Update
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Update paymentStatus to paid
  2. Verify update saved
- **Expected:** Payment status updated
- **Status:** ⏳ Not Implemented

#### TC-ORD-017: Tracking Number Assignment
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Assign tracking number to shipped order
  2. Verify saved
- **Expected:** Tracking number assigned
- **Status:** ⏳ Not Implemented

#### TC-ORD-018: Delete Order (Admin Only)
- **Priority:** Low
- **Type:** Unit Test
- **Steps:**
  1. Delete order
  2. Verify removed from DB
- **Expected:** Order deleted
- **Status:** ⏳ Not Implemented

#### TC-ORD-019: WebSocket Event - Order Created
- **Priority:** Critical
- **Type:** Unit Test
- **Steps:**
  1. Create order
  2. Verify "orderCreated" event emitted
  3. Check event payload
- **Expected:** Event emitted with order data
- **Status:** ⏳ Not Implemented

#### TC-ORD-020: WebSocket Event - Order Status Changed
- **Priority:** Critical
- **Type:** Unit Test
- **Steps:**
  1. Update order status
  2. Verify "orderStatusChanged" event emitted
- **Expected:** Event emitted with new status
- **Status:** ⏳ Not Implemented

---

### Users Service (12 cases)

#### TC-USER-001: Get All Users (Admin Only)
- **Priority:** High
- **Type:** Unit Test
- **Preconditions:** Admin authenticated
- **Steps:**
  1. Call getAllUsers
- **Expected:** All users returned
- **Status:** ⏳ Not Implemented

#### TC-USER-002: Get User by ID - Own Profile
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. User gets own profile
- **Expected:** User data returned
- **Status:** ⏳ Not Implemented

#### TC-USER-003: Get User by ID - Other User (Non-Admin)
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Non-admin tries to get another user
- **Expected:** 403 Forbidden
- **Status:** ⏳ Not Implemented

#### TC-USER-004: Update User - Own Profile
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. User updates own name
  2. Verify changes saved
- **Expected:** Profile updated
- **Status:** ⏳ Not Implemented

#### TC-USER-005: Update User - Change Email
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. User changes email
  2. Verify email updated
  3. Check email_verified reset to false
- **Expected:** Email changed, needs re-verification
- **Status:** ⏳ Not Implemented

#### TC-USER-006: Update User - Invalid Email Format
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Try to update email to invalid format
- **Expected:** 400 Bad Request, validation error
- **Status:** ⏳ Not Implemented

#### TC-USER-007: Delete User (Admin Only)
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Admin deletes user
  2. Verify user removed
- **Expected:** User deleted
- **Status:** ⏳ Not Implemented

#### TC-USER-008: Delete User - Own Account (Non-Admin)
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Non-admin tries to delete own account
- **Expected:** 403 Forbidden
- **Status:** ⏳ Not Implemented

#### TC-USER-009: User Role Assignment (Admin)
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Admin assigns admin role to user
  2. Verify role added
- **Expected:** User has admin role
- **Status:** ⏳ Not Implemented

#### TC-USER-010: User Deactivation (Admin)
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Admin sets isActive=false
  2. User tries to login
- **Expected:** User deactivated, login fails
- **Status:** ⏳ Not Implemented

#### TC-USER-011: User Profile Picture Update
- **Priority:** Low
- **Type:** Unit Test
- **Steps:**
  1. User updates picture URL
  2. Verify saved
- **Expected:** Picture URL updated
- **Status:** ⏳ Not Implemented

#### TC-USER-012: User Phone Number Update
- **Priority:** Low
- **Type:** Unit Test
- **Steps:**
  1. User adds phone number
  2. Verify format validation
- **Expected:** Phone number saved if valid format
- **Status:** ⏳ Not Implemented

---

### Middleware Tests (8 cases)

#### TC-MID-001: Authentication Middleware - Valid Token
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Call protected endpoint with valid token
- **Expected:** Request proceeds
- **Status:** ⏳ Not Implemented

#### TC-MID-002: Authentication Middleware - No Token
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Call protected endpoint without token
- **Expected:** 401 Unauthorized
- **Status:** ⏳ Not Implemented

#### TC-MID-003: Authentication Middleware - Expired Token
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Call with expired token
- **Expected:** 401 Unauthorized, "Token expired"
- **Status:** ⏳ Not Implemented

#### TC-MID-004: Authorization Middleware - Admin Role Required
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Non-admin calls admin endpoint
- **Expected:** 403 Forbidden
- **Status:** ⏳ Not Implemented

#### TC-MID-005: Authorization Middleware - Self or Admin
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. User A tries to access User B's data
- **Expected:** 403 Forbidden
- **Status:** ⏳ Not Implemented

#### TC-MID-006: Validation Middleware - Email Validation
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Submit form with invalid email
- **Expected:** 400 Bad Request, validation errors
- **Status:** ⏳ Not Implemented

#### TC-MID-007: Error Handling Middleware - 404
- **Priority:** Low
- **Type:** Unit Test
- **Steps:**
  1. Call non-existent endpoint
- **Expected:** 404 Not Found, proper error format
- **Status:** ⏳ Not Implemented

#### TC-MID-008: Error Handling Middleware - 500
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Trigger server error
  2. Verify error caught and formatted
- **Expected:** 500 Internal Server Error, no stack trace exposed
- **Status:** ⏳ Not Implemented

---

## Unit Tests - Frontend

### Components (30 cases)

#### TC-COMP-001: ProductCard - Renders Correctly
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Render ProductCard with product data
  2. Verify name, price, image displayed
- **Expected:** All product details visible
- **Status:** ⏳ Not Implemented

#### TC-COMP-002: ProductCard - Add to Cart Button
- **Priority:** Critical
- **Type:** Unit Test
- **Steps:**
  1. Click "Add to Cart"
  2. Verify addToCart action dispatched
- **Expected:** Product added to cart
- **Status:** ⏳ Not Implemented

#### TC-COMP-003: ProductCard - Out of Stock Display
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Render product with stock=0
  2. Verify "Out of Stock" badge shown
  3. Verify button disabled
- **Expected:** Badge visible, button disabled
- **Status:** ⏳ Not Implemented

#### TC-COMP-004: ProductCard - Stock Warning
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Render product with stock=5
  2. Verify "Only 5 left" message
- **Expected:** Low stock warning shown
- **Status:** ⏳ Not Implemented

#### TC-COMP-005: Header - User Menu Display
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Render Header with authenticated user
  2. Verify user name displayed
- **Expected:** User dropdown with name
- **Status:** ⏳ Not Implemented

#### TC-COMP-006: Header - Cart Badge Count
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Render Header with 3 items in cart
  2. Verify badge shows "3"
- **Expected:** Cart badge displays correct count
- **Status:** ⏳ Not Implemented

#### TC-COMP-007: Header - Mobile Menu Toggle
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Click hamburger menu
  2. Verify mobile menu opens
- **Expected:** Mobile menu visible
- **Status:** ⏳ Not Implemented

#### TC-COMP-008: Header - Logout
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Click Logout
  2. Verify logout action dispatched
- **Expected:** User logged out
- **Status:** ⏳ Not Implemented

#### TC-COMP-009: Cart Item - Quantity Update
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Increase quantity
  2. Verify updateQuantity action
- **Expected:** Quantity updated in store
- **Status:** ⏳ Not Implemented

#### TC-COMP-010: Cart Item - Remove Item
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Click remove button
  2. Verify removeFromCart action
- **Expected:** Item removed from cart
- **Status:** ⏳ Not Implemented

#### TC-COMP-011: Form - Email Validation
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Enter invalid email
  2. Verify error message shown
- **Expected:** "Invalid email" error
- **Status:** ⏳ Not Implemented

#### TC-COMP-012: Form - Password Strength
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Enter weak password
  2. Verify strength indicator
- **Expected:** "Weak" indicator shown
- **Status:** ⏳ Not Implemented

#### TC-COMP-013: Button - Loading State
- **Priority:** Low
- **Type:** Unit Test
- **Steps:**
  1. Click submit button
  2. Verify loading spinner shows
- **Expected:** Button shows loading state
- **Status:** ⏳ Not Implemented

#### TC-COMP-014: Button - Disabled State
- **Priority:** Low
- **Type:** Unit Test
- **Steps:**
  1. Render button with disabled=true
  2. Try to click
- **Expected:** Button not clickable
- **Status:** ⏳ Not Implemented

#### TC-COMP-015: Modal - Opens on Trigger
- **Priority:** Low
- **Type:** Unit Test
- **Steps:**
  1. Click trigger button
  2. Verify modal opens
- **Expected:** Modal visible
- **Status:** ⏳ Not Implemented

#### TC-COMP-016: Modal - Closes on X
- **Priority:** Low
- **Type:** Unit Test
- **Steps:**
  1. Click X button
  2. Verify modal closes
- **Expected:** Modal hidden
- **Status:** ⏳ Not Implemented

#### TC-COMP-017: Toast - Success Notification
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Trigger success toast
  2. Verify message displayed
- **Expected:** Green toast with message
- **Status:** ⏳ Not Implemented

#### TC-COMP-018: Toast - Error Notification
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Trigger error toast
  2. Verify message displayed
- **Expected:** Red toast with error message
- **Status:** ⏳ Not Implemented

#### TC-COMP-019: Loading Spinner - Displays
- **Priority:** Low
- **Type:** Unit Test
- **Steps:**
  1. Set loading state
  2. Verify spinner shows
- **Expected:** Spinner visible
- **Status:** ⏳ Not Implemented

#### TC-COMP-020: Empty State - No Products
- **Priority:** Low
- **Type:** Unit Test
- **Steps:**
  1. Render products list with empty array
  2. Verify empty state message
- **Expected:** "No products found" message
- **Status:** ⏳ Not Implemented

#### TC-COMP-021: Pagination - Page Change
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Click page 2
  2. Verify page action dispatched
- **Expected:** Products for page 2 loaded
- **Status:** ⏳ Not Implemented

#### TC-COMP-022: Filter - Category Selection
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Select Electronics category
  2. Verify filter applied
- **Expected:** Only electronics shown
- **Status:** ⏳ Not Implemented

#### TC-COMP-023: Search - Query Input
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Type "headphones" in search
  2. Verify search action
- **Expected:** Search results filtered
- **Status:** ⏳ Not Implemented

#### TC-COMP-024: Sort - Price Ascending
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Select "Price: Low to High"
  2. Verify sort applied
- **Expected:** Products sorted by price ascending
- **Status:** ⏳ Not Implemented

#### TC-COMP-025: Rating Stars - Display
- **Priority:** Low
- **Type:** Unit Test
- **Steps:**
  1. Render rating with 4.5 stars
  2. Verify 4 filled, 1 half filled
- **Expected:** Rating displayed correctly
- **Status:** ⏳ Not Implemented

#### TC-COMP-026: Image - Fallback on Error
- **Priority:** Low
- **Type:** Unit Test
- **Steps:**
  1. Render image with broken URL
  2. Verify fallback displayed
- **Expected:** Placeholder/icon shown
- **Status:** ⏳ Not Implemented

#### TC-COMP-027: Link - Navigation
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Click product link
  2. Verify navigation to product page
- **Expected:** Navigates to /products/[id]
- **Status:** ⏳ Not Implemented

#### TC-COMP-028: Badge - Count Display
- **Priority:** Low
- **Type:** Unit Test
- **Steps:**
  1. Render badge with count=99
  2. Verify "99" displayed
- **Expected:** Badge shows "99"
- **Status:** ⏳ Not Implemented

#### TC-COMP-029: Badge - Max Count (99+)
- **Priority:** Low
- **Type:** Unit Test
- **Steps:**
  1. Render badge with count=150
  2. Verify "99+" displayed
- **Expected:** Badge shows "99+"
- **Status:** ⏳ Not Implemented

#### TC-COMP-030: Responsive - Mobile View
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Render component in mobile viewport
  2. Verify mobile layout applied
- **Expected:** Mobile-specific styles active
- **Status:** ⏳ Not Implemented

---

### Redux Slices (20 cases)

#### TC-REDUX-001: Auth Slice - Login Success
- **Priority:** Critical
- **Type:** Unit Test
- **Steps:**
  1. Dispatch login.fulfilled
  2. Check state updated
- **Expected:** isAuthenticated=true, user data set
- **Status:** ⏳ Not Implemented

#### TC-REDUX-002: Auth Slice - Login Failure
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Dispatch login.rejected
  2. Check error set
- **Expected:** error message set, loading=false
- **Status:** ⏳ Not Implemented

#### TC-REDUX-003: Auth Slice - Logout
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Dispatch logout
  2. Verify state cleared
- **Expected:** isAuthenticated=false, user=null
- **Status:** ⏳ Not Implemented

#### TC-REDUX-004: Products Slice - Fetch Products
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Dispatch fetchProducts
  2. Verify products loaded
- **Expected:** items array populated
- **Status:** ⏳ Not Implemented

#### TC-REDUX-005: Products Slice - Set Filters
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Dispatch setFilters with category
  2. Verify filter applied
- **Expected:** filters.category set
- **Status:** ⏳ Not Implemented

#### TC-REDUX-006: Products Slice - Clear Filters
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Dispatch clearFilters
  2. Verify filters reset
- **Expected:** filters={}, page=1
- **Status:** ⏳ Not Implemented

#### TC-REDUX-007: Cart Slice - Add Item
- **Priority:** Critical
- **Type:** Unit Test
- **Steps:**
  1. Dispatch addToCart with product
  2. Verify item added
- **Expected:** items array includes new item
- **Status:** ⏳ Not Implemented

#### TC-REDUX-008: Cart Slice - Add Existing Item
- **Priority:** Critical
- **Type:** Unit Test
- **Steps:**
  1. Add item that's already in cart
  2. Verify quantity increased
- **Expected:** Quantity incremented, not duplicate
- **Status:** ⏳ Not Implemented

#### TC-REDUX-009: Cart Slice - Remove Item
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Dispatch removeFromCart
  2. Verify item removed
- **Expected:** Item removed from array
- **Status:** ⏳ Not Implemented

#### TC-REDUX-010: Cart Slice - Update Quantity
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Dispatch updateQuantity
  2. Verify quantity changed
- **Expected:** Item quantity updated
- **Status:** ⏳ Not Implemented

#### TC-REDUX-011: Cart Slice - Clear Cart
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Dispatch clearCart
  2. Verify cart empty
- **Expected:** items=[], total=0
- **Status:** ⏳ Not Implemented

#### TC-REDUX-012: Cart Slice - Calculate Total
- **Priority:** Critical
- **Type:** Unit Test
- **Steps:**
  1. Add multiple items
  2. Verify total calculated correctly
- **Expected:** total = sum of (price × quantity)
- **Status:** ⏳ Not Implemented

#### TC-REDUX-013: Orders Slice - Fetch User Orders
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Dispatch fetchUserOrders
  2. Verify orders loaded
- **Expected:** orders array populated
- **Status:** ⏳ Not Implemented

#### TC-REDUX-014: Orders Slice - Create Order
- **Priority:** Critical
- **Type:** Unit Test
- **Steps:**
  1. Dispatch createOrder
  2. Verify order added
- **Expected:** New order in orders array
- **Status:** ⏳ Not Implemented

#### TC-REDUX-015: Orders Slice - Real-time Update
- **Priority:** Critical
- **Type:** Unit Test
- **Steps:**
  1. Receive WebSocket event
  2. Verify order updated in state
- **Expected:** Order status changed
- **Status:** ⏳ Not Implemented

#### TC-REDUX-016: Products Slice - Search
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Dispatch setFilters with search query
  2. Fetch products
- **Expected:** Filtered results
- **Status:** ⏳ Not Implemented

#### TC-REDUX-017: Products Slice - Pagination
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Dispatch setPage(2)
  2. Fetch products
- **Expected:** Page 2 products loaded
- **Status:** ⏳ Not Implemented

#### TC-REDUX-018: Auth Slice - Token Refresh
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Dispatch refreshToken
  2. Verify new token set
- **Expected:** Access token refreshed
- **Status:** ⏳ Not Implemented

#### TC-REDUX-019: Loading States
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Dispatch async action
  2. Check loading=true during pending
  3. Check loading=false when done
- **Expected:** Loading states correct
- **Status:** ⏳ Not Implemented

#### TC-REDUX-020: Error States
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Dispatch failing action
  2. Verify error message set
- **Expected:** Error message in state
- **Status:** ⏳ Not Implemented

---

### Hooks (10 cases)

#### TC-HOOK-001: useOrderSocket - Connection
- **Priority:** Critical
- **Type:** Unit Test
- **Steps:**
  1. Mount component using hook
  2. Verify socket connects
- **Expected:** Socket connection established
- **Status:** ⏳ Not Implemented

#### TC-HOOK-002: useOrderSocket - Event Listener
- **Priority:** Critical
- **Type:** Unit Test
- **Steps:**
  1. Emit orderCreated event
  2. Verify callback triggered
- **Expected:** Event handler called
- **Status:** ⏳ Not Implemented

#### TC-HOOK-003: useOrderSocket - Disconnect
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Unmount component
  2. Verify socket disconnects
- **Expected:** Cleanup performed
- **Status:** ⏳ Not Implemented

#### TC-HOOK-004: useAuth - Check Authentication
- **Priority:** High
- **Type:** Unit Test
- **Steps:**
  1. Use hook to check auth status
  2. Verify correct status returned
- **Expected:** isAuthenticated status correct
- **Status:** ⏳ Not Implemented

#### TC-HOOK-005: useCart - Get Cart Items
- **Priority:** Medium
- **Type:** Unit Test
- **Steps:**
  1. Use hook to get cart
  2. Verify items returned
- **Expected:** Cart items accessible
- **Status:** ⏳ Not Implemented

#### TC-HOOK-006: useDebounce - Input Debouncing
- **Priority:** Low
- **Type:** Unit Test
- **Steps:**
  1. Type rapidly in search
  2. Verify debounced value updates after delay
- **Expected:** Value updates after 500ms
- **Status:** ⏳ Not Implemented

#### TC-HOOK-007: useLocalStorage - Save Data
- **Priority:** Low
- **Type:** Unit Test
- **Steps:**
  1. Save data to localStorage
  2. Verify stored
- **Expected:** Data persisted
- **Status:** ⏳ Not Implemented

#### TC-HOOK-008: useLocalStorage - Load Data
- **Priority:** Low
- **Type:** Unit Test
- **Steps:**
  1. Load data from localStorage
  2. Verify retrieved
- **Expected:** Data loaded correctly
- **Status:** ⏳ Not Implemented

#### TC-HOOK-009: useMediaQuery - Responsive
- **Priority:** Low
- **Type:** Unit Test
- **Steps:**
  1. Check if mobile viewport
  2. Verify correct boolean returned
- **Expected:** isMobile=true on mobile
- **Status:** ⏳ Not Implemented

#### TC-HOOK-010: usePrevious - Track Previous Value
- **Priority:** Low
- **Type:** Unit Test
- **Steps:**
  1. Update value multiple times
  2. Verify previous value tracked
- **Expected:** Previous value accessible
- **Status:** ⏳ Not Implemented

---

## Integration Tests - APIs

### Auth API Integration (10 cases)

#### TC-API-AUTH-001: Complete Registration Flow
- **Priority:** Critical
- **Type:** Integration Test
- **Steps:**
  1. POST /api/v1/auth/register
  2. Verify user in database
  3. Verify password hashed
  4. Verify response format
- **Expected:** User created, 201 status
- **Status:** ⏳ Not Implemented

#### TC-API-AUTH-002: Complete Login Flow
- **Priority:** Critical
- **Type:** Integration Test
- **Steps:**
  1. POST /api/v1/auth/login
  2. Verify authorization code returned
  3. Check code in database
- **Expected:** Valid auth code, 200 status
- **Status:** ⏳ Not Implemented

#### TC-API-AUTH-003: Token Exchange Flow
- **Priority:** Critical
- **Type:** Integration Test
- **Steps:**
  1. Login to get code
  2. POST /api/v1/oauth/token with code
  3. Verify access_token, refresh_token
  4. Decode and verify JWT
- **Expected:** Valid tokens returned
- **Status:** ⏳ Not Implemented

#### TC-API-AUTH-004: Token Refresh Flow
- **Priority:** Critical
- **Type:** Integration Test
- **Steps:**
  1. Get tokens
  2. Wait for access token expiry
  3. Use refresh token to get new access token
  4. Verify new token works
- **Expected:** New access token issued
- **Status:** ⏳ Not Implemented

#### TC-API-AUTH-005: UserInfo Endpoint
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Authenticate and get token
  2. GET /api/v1/oauth/userinfo with token
  3. Verify user data
- **Expected:** User info returned
- **Status:** ⏳ Not Implemented

#### TC-API-AUTH-006: Token Revocation
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Get access token
  2. POST /api/v1/oauth/revoke
  3. Try to use revoked token
- **Expected:** Token invalid after revocation
- **Status:** ⏳ Not Implemented

#### TC-API-AUTH-007: Invalid Credentials
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. POST login with wrong password
  2. Verify 401 response
- **Expected:** 401 Unauthorized
- **Status:** ⏳ Not Implemented

#### TC-API-AUTH-008: Duplicate Email Registration
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Register user
  2. Try to register same email again
- **Expected:** 409 Conflict
- **Status:** ⏳ Not Implemented

#### TC-API-AUTH-009: OIDC Discovery
- **Priority:** Low
- **Type:** Integration Test
- **Steps:**
  1. GET /.well-known/openid-configuration
  2. Verify endpoints listed
- **Expected:** OIDC config returned
- **Status:** ⏳ Not Implemented

#### TC-API-AUTH-010: Rate Limiting
- **Priority:** Medium
- **Type:** Integration Test
- **Steps:**
  1. Make 100 login attempts rapidly
  2. Verify rate limit applied
- **Expected:** 429 Too Many Requests after limit
- **Status:** ⏳ Not Implemented

---

### Products API Integration (10 cases)

#### TC-API-PROD-001: Get All Products
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. GET /api/v1/products
  2. Verify array returned
  3. Check product structure
- **Expected:** 200 OK, products array
- **Status:** ⏳ Not Implemented

#### TC-API-PROD-002: Get Products with Pagination
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. GET /api/v1/products?page=2&limit=10
  2. Verify 10 products from page 2
- **Expected:** Correct page returned
- **Status:** ⏳ Not Implemented

#### TC-API-PROD-003: Filter by Category
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. GET /api/v1/products?category=Electronics
  2. Verify only electronics returned
- **Expected:** Filtered products
- **Status:** ⏳ Not Implemented

#### TC-API-PROD-004: Search Products
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. GET /api/v1/products?search=headphones
  2. Verify search results
- **Expected:** Matching products
- **Status:** ⏳ Not Implemented

#### TC-API-PROD-005: Sort by Price
- **Priority:** Medium
- **Type:** Integration Test
- **Steps:**
  1. GET /api/v1/products?sort=price
  2. Verify ascending order
- **Expected:** Products sorted low to high
- **Status:** ⏳ Not Implemented

#### TC-API-PROD-006: Get Product by ID
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. GET /api/v1/products/:id
  2. Verify product details
- **Expected:** Single product returned
- **Status:** ⏳ Not Implemented

#### TC-API-PROD-007: Create Product (Admin)
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. POST /api/v1/products with auth
  2. Verify product saved in DB
- **Expected:** 201 Created
- **Status:** ⏳ Not Implemented

#### TC-API-PROD-008: Create Product (Unauthorized)
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. POST /api/v1/products without auth
- **Expected:** 401 Unauthorized
- **Status:** ⏳ Not Implemented

#### TC-API-PROD-009: Update Product (Admin)
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. PUT /api/v1/products/:id
  2. Verify updates saved
- **Expected:** Product updated
- **Status:** ⏳ Not Implemented

#### TC-API-PROD-010: Delete Product (Admin)
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. DELETE /api/v1/products/:id
  2. Verify product removed
- **Expected:** 200 OK, product deleted
- **Status:** ⏳ Not Implemented

---

### Categories API Integration (8 cases)

#### TC-API-CAT-001: Get All Categories
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. GET /api/v1/categories
  2. Verify 8 categories returned
- **Expected:** All categories
- **Status:** ⏳ Not Implemented

#### TC-API-CAT-002: Get Category by ID
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. GET /api/v1/categories/:id
  2. Verify category details
- **Expected:** Category data
- **Status:** ⏳ Not Implemented

#### TC-API-CAT-003: Get Category by Slug
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. GET /api/v1/categories/slug/electronics
  2. Verify electronics category
- **Expected:** Correct category
- **Status:** ⏳ Not Implemented

#### TC-API-CAT-004: Create Category (Admin)
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. POST /api/v1/categories
  2. Verify saved in DB
- **Expected:** 201 Created
- **Status:** ⏳ Not Implemented

#### TC-API-CAT-005: Create Category (Non-Admin)
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. POST /api/v1/categories as non-admin
- **Expected:** 403 Forbidden
- **Status:** ⏳ Not Implemented

#### TC-API-CAT-006: Update Category (Admin)
- **Priority:** Medium
- **Type:** Integration Test
- **Steps:**
  1. PUT /api/v1/categories/:id
  2. Verify updates
- **Expected:** Category updated
- **Status:** ⏳ Not Implemented

#### TC-API-CAT-007: Delete Category (Admin)
- **Priority:** Medium
- **Type:** Integration Test
- **Steps:**
  1. DELETE /api/v1/categories/:id
  2. Verify removed
- **Expected:** Category deleted
- **Status:** ⏳ Not Implemented

#### TC-API-CAT-008: Product Count Accuracy
- **Priority:** Low
- **Type:** Integration Test
- **Steps:**
  1. Get category
  2. Count products in that category
  3. Compare with productCount field
- **Expected:** Count matches
- **Status:** ⏳ Not Implemented

---

### Orders API Integration (12 cases)

#### TC-API-ORD-001: Create Order
- **Priority:** Critical
- **Type:** Integration Test
- **Steps:**
  1. POST /api/v1/orders with items
  2. Verify order in database
  3. Check orderNumber generated
  4. Verify WebSocket event
- **Expected:** Order created, event emitted
- **Status:** ⏳ Not Implemented

#### TC-API-ORD-002: Get User Orders
- **Priority:** Critical
- **Type:** Integration Test
- **Steps:**
  1. GET /api/v1/orders/user/:userId
  2. Verify only user's orders returned
- **Expected:** User-specific orders
- **Status:** ⏳ Not Implemented

#### TC-API-ORD-003: Get Order by ID
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. GET /api/v1/orders/:id
  2. Verify order details
- **Expected:** Full order data
- **Status:** ⏳ Not Implemented

#### TC-API-ORD-004: Update Order Status (Admin)
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. PATCH /api/v1/orders/:id/status
  2. Verify status changed
  3. Check timestamp updated
- **Expected:** Status and timestamp updated
- **Status:** ⏳ Not Implemented

#### TC-API-ORD-005: Update Order Status (Non-Admin)
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Non-admin tries to update status
- **Expected:** 403 Forbidden
- **Status:** ⏳ Not Implemented

#### TC-API-ORD-006: Cancel Order
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Cancel pending order
  2. Verify status changed to cancelled
  3. Check cancelledAt set
- **Expected:** Order cancelled
- **Status:** ⏳ Not Implemented

#### TC-API-ORD-007: Get All Orders (Admin)
- **Priority:** Medium
- **Type:** Integration Test
- **Steps:**
  1. GET /api/v1/orders as admin
  2. Verify all orders returned
- **Expected:** All orders in system
- **Status:** ⏳ Not Implemented

#### TC-API-ORD-008: Get All Orders (Non-Admin)
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. GET /api/v1/orders as non-admin
- **Expected:** 403 Forbidden
- **Status:** ⏳ Not Implemented

#### TC-API-ORD-009: Update Order Details
- **Priority:** Medium
- **Type:** Integration Test
- **Steps:**
  1. PUT /api/v1/orders/:id
  2. Update shipping address
  3. Verify changes saved
- **Expected:** Order updated
- **Status:** ⏳ Not Implemented

#### TC-API-ORD-010: Delete Order (Admin)
- **Priority:** Low
- **Type:** Integration Test
- **Steps:**
  1. DELETE /api/v1/orders/:id
  2. Verify removed
- **Expected:** Order deleted
- **Status:** ⏳ Not Implemented

#### TC-API-ORD-011: WebSocket - Real-time Update
- **Priority:** Critical
- **Type:** Integration Test
- **Steps:**
  1. Connect WebSocket client
  2. Create order
  3. Verify client receives event
- **Expected:** Event received in real-time
- **Status:** ⏳ Not Implemented

#### TC-API-ORD-012: Order Total Calculation
- **Priority:** Critical
- **Type:** Integration Test
- **Steps:**
  1. Create order with multiple items
  2. Verify totalAmount calculated correctly
- **Expected:** Total = sum of (price × quantity)
- **Status:** ⏳ Not Implemented

---

### Users API Integration (10 cases)

#### TC-API-USER-001: Get All Users (Admin)
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. GET /api/v1/users as admin
  2. Verify all users returned
- **Expected:** All users
- **Status:** ⏳ Not Implemented

#### TC-API-USER-002: Get All Users (Non-Admin)
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. GET /api/v1/users as non-admin
- **Expected:** 403 Forbidden
- **Status:** ⏳ Not Implemented

#### TC-API-USER-003: Get User by ID (Own Profile)
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. GET /api/v1/users/:id for own profile
  2. Verify user data
- **Expected:** User data returned
- **Status:** ⏳ Not Implemented

#### TC-API-USER-004: Get User by ID (Other User)
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Non-admin gets another user's profile
- **Expected:** 403 Forbidden
- **Status:** ⏳ Not Implemented

#### TC-API-USER-005: Update User Profile
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. PUT /api/v1/users/:id
  2. Update name and phone
  3. Verify changes saved
- **Expected:** Profile updated
- **Status:** ⏳ Not Implemented

#### TC-API-USER-006: Update User Email
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Update email
  2. Verify email_verified reset
- **Expected:** Email changed, needs reverification
- **Status:** ⏳ Not Implemented

#### TC-API-USER-007: Delete User (Admin)
- **Priority:** Medium
- **Type:** Integration Test
- **Steps:**
  1. DELETE /api/v1/users/:id as admin
  2. Verify user removed
- **Expected:** User deleted
- **Status:** ⏳ Not Implemented

#### TC-API-USER-008: Delete User (Self)
- **Priority:** Medium
- **Type:** Integration Test
- **Steps:**
  1. Non-admin deletes own account
- **Expected:** 403 Forbidden (or 200 if allowed)
- **Status:** ⏳ Not Implemented

#### TC-API-USER-009: User Role Assignment
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Admin assigns admin role
  2. Verify role added
  3. Test new permissions
- **Expected:** User has new role
- **Status:** ⏳ Not Implemented

#### TC-API-USER-010: Deactivate User
- **Priority:** Medium
- **Type:** Integration Test
- **Steps:**
  1. Set isActive=false
  2. Try to login
- **Expected:** Login fails for deactivated user
- **Status:** ⏳ Not Implemented

---

## Integration Tests - Frontend

### Pages Integration (15 cases)

#### TC-FE-INT-001: Products Page - Load and Display
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Navigate to /products
  2. Verify API called
  3. Verify products displayed
- **Expected:** Products loaded from API
- **Status:** ⏳ Not Implemented

#### TC-FE-INT-002: Products Page - Category Filter
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Click Electronics category
  2. Verify API called with filter
  3. Verify filtered products shown
- **Expected:** Only electronics displayed
- **Status:** ⏳ Not Implemented

#### TC-FE-INT-003: Products Page - Search
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Type in search box
  2. Verify debounced API call
  3. Verify search results
- **Expected:** Search results displayed
- **Status:** ⏳ Not Implemented

#### TC-FE-INT-004: Products Page - Pagination
- **Priority:** Medium
- **Type:** Integration Test
- **Steps:**
  1. Click page 2
  2. Verify API called with page=2
  3. Verify new products loaded
- **Expected:** Page 2 products shown
- **Status:** ⏳ Not Implemented

#### TC-FE-INT-005: Product Detail Page - Load
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Navigate to /products/[id]
  2. Verify API called
  3. Verify product details shown
- **Expected:** Product details displayed
- **Status:** ⏳ Not Implemented

#### TC-FE-INT-006: Cart Page - Load Items
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Add items to cart
  2. Navigate to /cart
  3. Verify items displayed
- **Expected:** Cart items from Redux shown
- **Status:** ⏳ Not Implemented

#### TC-FE-INT-007: Cart Page - Update Quantity
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Change quantity
  2. Verify Redux updated
  3. Verify total recalculated
- **Expected:** Quantity and total updated
- **Status:** ⏳ Not Implemented

#### TC-FE-INT-008: Cart Page - Remove Item
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Click remove
  2. Verify Redux updated
  3. Verify item removed from display
- **Expected:** Item removed
- **Status:** ⏳ Not Implemented

#### TC-FE-INT-009: Checkout Page - Form Validation
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Submit with missing fields
  2. Verify errors shown
- **Expected:** Validation errors displayed
- **Status:** ⏳ Not Implemented

#### TC-FE-INT-010: Checkout Page - Order Creation
- **Priority:** Critical
- **Type:** Integration Test
- **Steps:**
  1. Fill checkout form
  2. Submit order
  3. Verify API called
  4. Verify order created
  5. Check redirect to orders page
- **Expected:** Order created, redirected
- **Status:** ⏳ Not Implemented

#### TC-FE-INT-011: Orders Page - Load User Orders
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Navigate to /orders
  2. Verify API called
  3. Verify orders displayed
- **Expected:** User orders shown
- **Status:** ⏳ Not Implemented

#### TC-FE-INT-012: Orders Page - Real-time Update
- **Priority:** Critical
- **Type:** Integration Test
- **Steps:**
  1. Open orders page
  2. Update order status (backend)
  3. Verify WebSocket event received
  4. Verify UI updated
- **Expected:** Order status updated in real-time
- **Status:** ⏳ Not Implemented

#### TC-FE-INT-013: Login Page - Successful Login
- **Priority:** Critical
- **Type:** Integration Test
- **Steps:**
  1. Enter credentials
  2. Submit
  3. Verify API called
  4. Verify Redux updated
  5. Check navigation to /products
- **Expected:** Logged in, redirected
- **Status:** ⏳ Not Implemented

#### TC-FE-INT-014: Login Page - Failed Login
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Enter wrong credentials
  2. Submit
  3. Verify error message shown
- **Expected:** Error displayed, not logged in
- **Status:** ⏳ Not Implemented

#### TC-FE-INT-015: Register Page - Successful Registration
- **Priority:** Critical
- **Type:** Integration Test
- **Steps:**
  1. Fill registration form
  2. Submit
  3. Verify API called
  4. Check redirect to login
- **Expected:** User registered, redirected
- **Status:** ⏳ Not Implemented

---

### Redux Integration (10 cases)

#### TC-FE-REDUX-001: Complete Login Flow
- **Priority:** Critical
- **Type:** Integration Test
- **Steps:**
  1. Dispatch login thunk
  2. Verify API called
  3. Check state updated
  4. Verify tokens stored
- **Expected:** Full login flow completes
- **Status:** ⏳ Not Implemented

#### TC-FE-REDUX-002: Complete Shopping Flow
- **Priority:** Critical
- **Type:** Integration Test
- **Steps:**
  1. Add items to cart
  2. Create order
  3. Verify cart cleared
  4. Check order in orders slice
- **Expected:** Complete flow works
- **Status:** ⏳ Not Implemented

#### TC-FE-REDUX-003: Token Refresh on Expiry
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Make API call with expired token
  2. Verify refresh attempted
  3. Check request retried
- **Expected:** Token refreshed automatically
- **Status:** ⏳ Not Implemented

#### TC-FE-REDUX-004: Logout and Clear State
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Logout
  2. Verify all slices cleared
  3. Check tokens removed
- **Expected:** All state cleared
- **Status:** ⏳ Not Implemented

#### TC-FE-REDUX-005: Persistent Cart
- **Priority:** Medium
- **Type:** Integration Test
- **Steps:**
  1. Add items to cart
  2. Reload page
  3. Verify cart persisted
- **Expected:** Cart items remain
- **Status:** ⏳ Not Implemented

#### TC-FE-REDUX-006: Error Handling
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Trigger API error
  2. Verify error in state
  3. Check error message displayed
- **Expected:** Errors handled gracefully
- **Status:** ⏳ Not Implemented

#### TC-FE-REDUX-007: Loading States
- **Priority:** Medium
- **Type:** Integration Test
- **Steps:**
  1. Trigger async action
  2. Check loading=true
  3. Wait for completion
  4. Check loading=false
- **Expected:** Loading states correct
- **Status:** ⏳ Not Implemented

#### TC-FE-REDUX-008: Optimistic Updates
- **Priority:** Low
- **Type:** Integration Test
- **Steps:**
  1. Update cart quantity
  2. Verify UI updates immediately
  3. Check API called in background
- **Expected:** Optimistic update works
- **Status:** ⏳ Not Implemented

#### TC-FE-REDUX-009: Concurrent Requests
- **Priority:** Medium
- **Type:** Integration Test
- **Steps:**
  1. Trigger multiple API calls
  2. Verify all complete
  3. Check no race conditions
- **Expected:** All requests handled correctly
- **Status:** ⏳ Not Implemented

#### TC-FE-REDUX-010: State Persistence
- **Priority:** Medium
- **Type:** Integration Test
- **Steps:**
  1. Set various state
  2. Refresh page
  3. Verify auth state persisted
- **Expected:** Auth persists, cart may persist
- **Status:** ⏳ Not Implemented

---

### API Client Integration (5 cases)

#### TC-FE-API-001: Request Interceptor
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Make authenticated request
  2. Verify token added to header
- **Expected:** Authorization header set
- **Status:** ⏳ Not Implemented

#### TC-FE-API-002: Response Interceptor - Success
- **Priority:** Medium
- **Type:** Integration Test
- **Steps:**
  1. Make request
  2. Verify response handled
- **Expected:** Data extracted correctly
- **Status:** ⏳ Not Implemented

#### TC-FE-API-003: Response Interceptor - 401
- **Priority:** Critical
- **Type:** Integration Test
- **Steps:**
  1. Make request with expired token
  2. Verify refresh attempted
  3. Check original request retried
- **Expected:** Token refreshed, request retried
- **Status:** ⏳ Not Implemented

#### TC-FE-API-004: Response Interceptor - Network Error
- **Priority:** High
- **Type:** Integration Test
- **Steps:**
  1. Trigger network error
  2. Verify error handled
  3. Check user notified
- **Expected:** Error caught and displayed
- **Status:** ⏳ Not Implemented

#### TC-FE-API-005: Request Timeout
- **Priority:** Medium
- **Type:** Integration Test
- **Steps:**
  1. Make slow request
  2. Verify timeout after 30s
- **Expected:** Request times out
- **Status:** ⏳ Not Implemented

---

## End-to-End Tests

### Critical User Flows (20 scenarios)

#### TC-E2E-001: Complete Registration Journey
- **Priority:** Critical
- **Type:** E2E Test (Cypress)
- **Steps:**
  1. Open /auth/register
  2. Fill form with valid data
  3. Submit
  4. Verify redirect to login
  5. Login with new credentials
  6. Verify logged in
- **Expected:** Can register and login
- **Status:** ⏳ Not Implemented

#### TC-E2E-002: Login and Browse Products
- **Priority:** Critical
- **Type:** E2E Test (Cypress)
- **Steps:**
  1. Login
  2. Navigate to /products
  3. Verify products displayed
  4. Click category filter
  5. Verify filtered products
- **Expected:** Can login and browse
- **Status:** ⏳ Not Implemented

#### TC-E2E-003: Complete Purchase Flow
- **Priority:** Critical
- **Type:** E2E Test (Cypress)
- **Steps:**
  1. Login
  2. Browse products
  3. Add 3 items to cart
  4. Go to cart
  5. Update quantities
  6. Proceed to checkout
  7. Fill shipping details
  8. Submit order
  9. Verify order confirmation
  10. Check order in history
- **Expected:** Complete purchase successful
- **Status:** ⏳ Not Implemented

#### TC-E2E-004: Search and Add to Cart
- **Priority:** High
- **Type:** E2E Test (Cypress)
- **Steps:**
  1. Search for "headphones"
  2. Click first result
  3. View product details
  4. Add to cart
  5. Verify cart badge updated
- **Expected:** Search and add to cart works
- **Status:** ⏳ Not Implemented

#### TC-E2E-005: Empty Cart Flow
- **Priority:** Medium
- **Type:** E2E Test (Cypress)
- **Steps:**
  1. Add items to cart
  2. Go to cart
  3. Remove all items
  4. Verify empty cart message
  5. Click "Browse Products"
  6. Verify redirected
- **Expected:** Empty cart handled gracefully
- **Status:** ⏳ Not Implemented

#### TC-E2E-006: Real-time Order Updates
- **Priority:** Critical
- **Type:** E2E Test (Cypress)
- **Steps:**
  1. Place order
  2. Keep orders page open
  3. Update status (via admin panel or API)
  4. Verify status updates in real-time
  5. Check toast notification
- **Expected:** WebSocket updates work
- **Status:** ⏳ Not Implemented

#### TC-E2E-007: Logout and Session Cleared
- **Priority:** High
- **Type:** E2E Test (Cypress)
- **Steps:**
  1. Login
  2. Add items to cart
  3. Logout
  4. Verify redirected to login
  5. Verify cart cleared
- **Expected:** Session cleared on logout
- **Status:** ⏳ Not Implemented

#### TC-E2E-008: Unauthorized Access
- **Priority:** High
- **Type:** E2E Test (Cypress)
- **Steps:**
  1. Without login, go to /orders
  2. Verify redirected to /auth/login
  3. Login
  4. Verify redirected back to /orders
- **Expected:** Protected routes require auth
- **Status:** ⏳ Not Implemented

#### TC-E2E-009: Token Expiry Handling
- **Priority:** High
- **Type:** E2E Test (Cypress)
- **Steps:**
  1. Login
  2. Wait for token expiry (or mock)
  3. Make request
  4. Verify token refreshed
  5. Request succeeds
- **Expected:** Token refresh seamless
- **Status:** ⏳ Not Implemented

#### TC-E2E-010: Mobile Responsive Flow
- **Priority:** High
- **Type:** E2E Test (Cypress)
- **Steps:**
  1. Set mobile viewport
  2. Login
  3. Browse products (2 columns)
  4. Use hamburger menu
  5. Complete checkout
- **Expected:** Mobile experience works
- **Status:** ⏳ Not Implemented

#### TC-E2E-011: Form Validation Errors
- **Priority:** High
- **Type:** E2E Test (Cypress)
- **Steps:**
  1. Open registration
  2. Submit with invalid email
  3. Verify error message
  4. Fix email
  5. Submit with weak password
  6. Verify error message
  7. Fix password
  8. Submit successfully
- **Expected:** Validation errors shown
- **Status:** ⏳ Not Implemented

#### TC-E2E-012: Network Error Recovery
- **Priority:** High
- **Type:** E2E Test (Cypress)
- **Steps:**
  1. Intercept and fail API request
  2. Verify error message shown
  3. Allow request
  4. Retry
  5. Verify succeeds
- **Expected:** Network errors handled
- **Status:** ⏳ Not Implemented

#### TC-E2E-013: Product Images Loading
- **Priority:** Medium
- **Type:** E2E Test (Cypress)
- **Steps:**
  1. Browse products
  2. Verify images load
  3. Check fallback for broken images
- **Expected:** Images display correctly
- **Status:** ⏳ Not Implemented

#### TC-E2E-014: Cart Persistence
- **Priority:** Medium
- **Type:** E2E Test (Cypress)
- **Steps:**
  1. Add items to cart
  2. Refresh page
  3. Verify cart persists
  4. Logout
  5. Login again
  6. Check if cart restored
- **Expected:** Cart persists (or cleared on logout)
- **Status:** ⏳ Not Implemented

#### TC-E2E-015: Multiple Browser Tabs
- **Priority:** Low
- **Type:** E2E Test (Cypress)
- **Steps:**
  1. Login in tab 1
  2. Open tab 2
  3. Verify logged in tab 2
  4. Logout in tab 1
  5. Check tab 2 status
- **Expected:** Session synced across tabs
- **Status:** ⏳ Not Implemented

#### TC-E2E-016: Browser Back/Forward
- **Priority:** Medium
- **Type:** E2E Test (Cypress)
- **Steps:**
  1. Navigate through pages
  2. Use browser back
  3. Verify correct page shown
  4. Use forward
  5. Verify navigation works
- **Expected:** Browser navigation works
- **Status:** ⏳ Not Implemented

#### TC-E2E-017: Keyboard Navigation
- **Priority:** Low
- **Type:** E2E Test (Cypress)
- **Steps:**
  1. Use Tab to navigate form
  2. Use Enter to submit
  3. Verify keyboard shortcuts work
- **Expected:** Keyboard accessible
- **Status:** ⏳ Not Implemented

#### TC-E2E-018: Screen Reader Compatibility
- **Priority:** Low
- **Type:** E2E Test (Manual)
- **Steps:**
  1. Enable screen reader
  2. Navigate site
  3. Verify ARIA labels read
- **Expected:** Screen reader compatible
- **Status:** ⏳ Not Implemented

#### TC-E2E-019: Page Performance
- **Priority:** Medium
- **Type:** E2E Test (Lighthouse)
- **Steps:**
  1. Run Lighthouse on key pages
  2. Check performance score > 90
  3. Check FCP < 1.5s
  4. Check LCP < 2.5s
- **Expected:** Performance targets met
- **Status:** ⏳ Not Implemented

#### TC-E2E-020: WebSocket Reconnection
- **Priority:** High
- **Type:** E2E Test (Cypress)
- **Steps:**
  1. Open orders page
  2. Disconnect network
  3. Reconnect
  4. Verify WebSocket reconnects
  5. Check real-time updates resume
- **Expected:** WebSocket reconnects
- **Status:** ⏳ Not Implemented

---

## Security Tests

### Authentication & Authorization (15 cases)

#### TC-SEC-001: JWT Token Validation
- **Priority:** Critical
- **Type:** Security Test
- **Steps:**
  1. Create invalid JWT
  2. Try to use it
  3. Verify rejected
- **Expected:** Invalid tokens rejected
- **Status:** ⏳ Not Implemented

#### TC-SEC-002: SQL Injection Prevention
- **Priority:** Critical
- **Type:** Security Test
- **Steps:**
  1. Send SQL injection in search
  2. Verify query escaped
  3. Check no data leaked
- **Expected:** SQL injection prevented
- **Status:** ⏳ Not Implemented

#### TC-SEC-003: XSS Prevention
- **Priority:** Critical
- **Type:** Security Test
- **Steps:**
  1. Submit form with `<script>` tag
  2. Verify sanitized
  3. Check script not executed
- **Expected:** XSS prevented
- **Status:** ⏳ Not Implemented

#### TC-SEC-004: CSRF Protection
- **Priority:** High
- **Type:** Security Test
- **Steps:**
  1. Make request without CSRF token
  2. Verify rejected
- **Expected:** CSRF protection active
- **Status:** ⏳ Not Implemented

#### TC-SEC-005: Password Strength Validation
- **Priority:** High
- **Type:** Security Test
- **Steps:**
  1. Try weak passwords
  2. Verify rejected
  3. Test strong password
  4. Verify accepted
- **Expected:** Only strong passwords allowed
- **Status:** ⏳ Not Implemented

#### TC-SEC-006: Rate Limiting
- **Priority:** High
- **Type:** Security Test
- **Steps:**
  1. Make 100 requests rapidly
  2. Verify rate limit applied
  3. Check 429 response
- **Expected:** Rate limiting active
- **Status:** ⏳ Not Implemented

#### TC-SEC-007: Session Management
- **Priority:** High
- **Type:** Security Test
- **Steps:**
  1. Check session timeout
  2. Verify inactive sessions cleared
- **Expected:** Sessions managed correctly
- **Status:** ⏳ Not Implemented

#### TC-SEC-008: Sensitive Data Exposure
- **Priority:** Critical
- **Type:** Security Test
- **Steps:**
  1. Check API responses
  2. Verify no passwords exposed
  3. Check tokens not in logs
- **Expected:** No sensitive data leaked
- **Status:** ⏳ Not Implemented

#### TC-SEC-009: CORS Policies
- **Priority:** High
- **Type:** Security Test
- **Steps:**
  1. Make request from different origin
  2. Verify CORS headers
  3. Check policy enforced
- **Expected:** CORS properly configured
- **Status:** ⏳ Not Implemented

#### TC-SEC-010: Secure Headers
- **Priority:** High
- **Type:** Security Test
- **Steps:**
  1. Check response headers
  2. Verify X-Frame-Options set
  3. Check CSP header
  4. Verify HSTS header
- **Expected:** Security headers present
- **Status:** ⏳ Not Implemented

#### TC-SEC-011: API Key Validation
- **Priority:** Medium
- **Type:** Security Test
- **Steps:**
  1. Make service-to-service call
  2. Verify API key required
  3. Test with invalid key
- **Expected:** API keys validated
- **Status:** ⏳ Not Implemented

#### TC-SEC-012: Role-Based Access Control
- **Priority:** Critical
- **Type:** Security Test
- **Steps:**
  1. Non-admin tries admin endpoint
  2. Verify 403 Forbidden
  3. Admin tries same endpoint
  4. Verify success
- **Expected:** RBAC enforced
- **Status:** ⏳ Not Implemented

#### TC-SEC-013: Input Sanitization
- **Priority:** High
- **Type:** Security Test
- **Steps:**
  1. Submit form with special characters
  2. Verify sanitized
  3. Check stored safely
- **Expected:** Input sanitized
- **Status:** ⏳ Not Implemented

#### TC-SEC-014: File Upload Security
- **Priority:** High
- **Type:** Security Test
- **Steps:**
  1. Try to upload malicious file
  2. Verify rejected
  3. Check file type validation
- **Expected:** Only allowed files accepted
- **Status:** ⏳ Not Implemented

#### TC-SEC-015: Dependency Vulnerabilities
- **Priority:** High
- **Type:** Security Test
- **Steps:**
  1. Run npm audit
  2. Check for vulnerabilities
  3. Verify no critical issues
- **Expected:** No critical vulnerabilities
- **Status:** ⏳ Not Implemented

---

## Performance Tests

### Load Testing (10 scenarios)

#### TC-PERF-001: 100 Concurrent Users - Browse Products
- **Priority:** High
- **Type:** Performance Test (Artillery)
- **Steps:**
  1. Simulate 100 users browsing
  2. Monitor response times
  3. Check error rate
- **Expected:** < 2s response, < 1% errors
- **Status:** ⏳ Not Implemented

#### TC-PERF-002: 50 Concurrent Users - Add to Cart
- **Priority:** High
- **Type:** Performance Test (Artillery)
- **Steps:**
  1. 50 users add to cart
  2. Monitor cart updates
  3. Check Redis performance
- **Expected:** < 1s response
- **Status:** ⏳ Not Implemented

#### TC-PERF-003: 25 Concurrent Checkouts
- **Priority:** Critical
- **Type:** Performance Test (Artillery)
- **Steps:**
  1. 25 users checkout simultaneously
  2. Monitor order creation
  3. Check database load
- **Expected:** All orders processed, < 3s
- **Status:** ⏳ Not Implemented

#### TC-PERF-004: Database Query Performance
- **Priority:** High
- **Type:** Performance Test
- **Steps:**
  1. Run complex queries
  2. Measure execution time
  3. Check index usage
- **Expected:** < 100ms for queries
- **Status:** ⏳ Not Implemented

#### TC-PERF-005: API Response Times
- **Priority:** High
- **Type:** Performance Test
- **Steps:**
  1. Test all endpoints
  2. Measure response times
  3. Identify slow endpoints
- **Expected:** < 200ms for simple, < 1s complex
- **Status:** ⏳ Not Implemented

#### TC-PERF-006: WebSocket Connection Limits
- **Priority:** Medium
- **Type:** Performance Test
- **Steps:**
  1. Open 1000 WebSocket connections
  2. Monitor server resources
  3. Check connection stability
- **Expected:** Supports 1000+ connections
- **Status:** ⏳ Not Implemented

#### TC-PERF-007: Memory Leaks
- **Priority:** High
- **Type:** Performance Test
- **Steps:**
  1. Run application for extended period
  2. Monitor memory usage
  3. Check for leaks
- **Expected:** No memory leaks
- **Status:** ⏳ Not Implemented

#### TC-PERF-008: CPU Usage Under Load
- **Priority:** Medium
- **Type:** Performance Test
- **Steps:**
  1. Simulate heavy load
  2. Monitor CPU usage
  3. Check for spikes
- **Expected:** < 80% CPU average
- **Status:** ⏳ Not Implemented

#### TC-PERF-009: Database Connection Pooling
- **Priority:** High
- **Type:** Performance Test
- **Steps:**
  1. Simulate many connections
  2. Monitor connection pool
  3. Check pool exhaustion
- **Expected:** Pool managed efficiently
- **Status:** ⏳ Not Implemented

#### TC-PERF-010: Frontend Performance
- **Priority:** High
- **Type:** Performance Test (Lighthouse)
- **Steps:**
  1. Run Lighthouse on all pages
  2. Check performance scores
  3. Monitor metrics (FCP, LCP, TTI)
- **Expected:** Performance > 90, FCP < 1.5s
- **Status:** ⏳ Not Implemented

---

## Test Summary

**Total Test Cases:** 252
- **Unit Tests - Backend:** 90
- **Unit Tests - Frontend:** 60
- **Integration Tests - APIs:** 50
- **Integration Tests - Frontend:** 30
- **End-to-End Tests:** 20
- **Security Tests:** 15
- **Performance Tests:** 10

**Priority Breakdown:**
- Critical: 32 cases
- High: 150 cases
- Medium: 55 cases
- Low: 15 cases

**Test Status:**
- ⏳ Not Implemented: 252
- 🚧 In Progress: 0
- ✅ Passed: 0
- ❌ Failed: 0
- ⏭️ Skipped: 0

---

**Next Steps:**
1. Review and approve test cases
2. Set up testing infrastructure
3. Implement unit tests (Phase 1)
4. Implement integration tests (Phase 2)
5. Implement E2E tests (Phase 3)
6. Run security and performance tests
7. Generate test coverage reports

**See [TEST_STRATEGY.md](TEST_STRATEGY.md) for implementation details.**
