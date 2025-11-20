# Test Execution Guide - LaunchpadMERN E-Commerce Platform

**Date:** 2025-11-19
**Status:** Complete Testing Guide

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Test Environment Setup](#test-environment-setup)
3. [Running Tests by Service](#running-tests-by-service)
4. [Running All Tests](#running-all-tests)
5. [Coverage Reports](#coverage-reports)
6. [CI/CD Integration](#cicd-integration)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Prerequisites

### Required Software:
- **Node.js**: v18+
- **npm**: v9+
- **MongoDB**: v6+ (for integration tests)
- **Docker**: (optional, for isolated testing)

### Check Versions:
```bash
node --version
npm --version
mongod --version
```

---

## 🔧 Test Environment Setup

### Step 1: Install Test Dependencies for All Services

Run this script to install test dependencies across all services:

**File:** `scripts/install-test-dependencies.sh`

```bash
#!/bin/bash

echo "Installing test dependencies for all services..."

# Backend services
services=("auth" "products" "categories" "users" "orders")

for service in "${services[@]}"
do
  echo ""
  echo "========================================"
  echo "Installing dependencies for $service service..."
  echo "========================================"

  cd "services/$service"

  # Install Jest and testing utilities
  npm install --save-dev \
    jest \
    supertest \
    mongodb-memory-server \
    sinon \
    @faker-js/faker \
    cross-env

  # Create package.json test scripts if not exists
  npm pkg set scripts.test="cross-env NODE_ENV=test jest"
  npm pkg set scripts.test:watch="cross-env NODE_ENV=test jest --watch"
  npm pkg set scripts.test:coverage="cross-env NODE_ENV=test jest --coverage"
  npm pkg set scripts.test:verbose="cross-env NODE_ENV=test jest --verbose"

  cd ../..
done

# Frontend
echo ""
echo "========================================"
echo "Installing dependencies for frontend..."
echo "========================================"

cd frontend

npm install --save-dev \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jest \
  jest-environment-jsdom \
  cypress \
  @faker-js/faker

# Create package.json test scripts
npm pkg set scripts.test="jest"
npm pkg set scripts.test:watch="jest --watch"
npm pkg set scripts.test:coverage="jest --coverage"
npm pkg set scripts.test:e2e="cypress run"
npm pkg set scripts.test:e2e:open="cypress open"

cd ..

# Performance testing
echo ""
echo "========================================"
echo "Installing Artillery for performance testing..."
echo "========================================"

npm install -g artillery

echo ""
echo "✅ All test dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "1. Create test files based on SAMPLE_TEST_IMPLEMENTATIONS.md"
echo "2. Run tests: cd services/auth && npm test"
echo "3. Generate coverage: npm run test:coverage"
```

**Make it executable and run:**
```bash
chmod +x scripts/install-test-dependencies.sh
./scripts/install-test-dependencies.sh
```

---

### Step 2: Create Test Database

**File:** `scripts/setup-test-database.sh`

```bash
#!/bin/bash

echo "Setting up test database..."

# Create test database user
mongosh <<EOF
use launchpad_test;

db.createUser({
  user: "testuser",
  pwd: "testpassword",
  roles: [
    { role: "readWrite", db: "launchpad_test" }
  ]
});

print("Test database user created successfully!");
EOF

echo "✅ Test database setup complete!"
```

---

### Step 3: Environment Variables for Testing

Create test environment files for each service:

**File:** `services/auth/.env.test`

```bash
NODE_ENV=test
PORT=3000
MONGODB_URI=mongodb://testuser:testpassword@localhost:27017/launchpad_test
JWT_SECRET=test-jwt-secret-key-do-not-use-in-production
REFRESH_TOKEN_SECRET=test-refresh-secret-key
ISSUER=http://localhost:3000
AUDIENCE=http://localhost:3006

# OAuth2 Client
CLIENT_ID=ecommerce-client
CLIENT_SECRET=ecommerce-secret
REDIRECT_URI=http://localhost:3006/callback

# Test mode flags
SKIP_EMAIL_VERIFICATION=true
ENABLE_TEST_MODE=true
```

**Repeat for other services** (products, categories, users, orders) with appropriate ports.

**File:** `frontend/.env.test`

```bash
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:8080
NEXT_PUBLIC_AUTH_SERVICE_URL=http://localhost:3000
NEXT_PUBLIC_PRODUCTS_SERVICE_URL=http://localhost:3001
NEXT_PUBLIC_CATEGORIES_SERVICE_URL=http://localhost:3002
NEXT_PUBLIC_USERS_SERVICE_URL=http://localhost:3003
NEXT_PUBLIC_ORDERS_SERVICE_URL=http://localhost:3004

NODE_ENV=test
```

---

## 🧪 Running Tests by Service

### Auth Service Tests

```bash
cd services/auth

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode (for development)
npm run test:watch

# Run specific test file
npm test -- tests/unit/controllers/authController.test.js

# Run only tests matching pattern
npm test -- --testNamePattern="registration"

# Run with verbose output
npm run test:verbose
```

**Expected Output:**
```
PASS tests/unit/controllers/authController.test.js
  Auth Controller - User Registration
    ✓ TC-AUTH-001: Should register user with valid data (245ms)
    ✓ TC-AUTH-002: Should reject registration with duplicate email (98ms)
    ✓ TC-AUTH-003: Should reject registration with invalid email (45ms)
    ✓ TC-AUTH-004: Should reject weak password (52ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
Snapshots:   0 total
Time:        2.134s
```

---

### Products Service Tests

```bash
cd services/products

# Run all tests
npm test

# Run unit tests only
npm test -- tests/unit

# Run integration tests only
npm test -- tests/integration

# Run with coverage threshold
npm run test:coverage -- --coverageThreshold='{"global":{"lines":80}}'
```

---

### Categories Service Tests

```bash
cd services/categories

# Run all tests
npm test

# Run specific test suite
npm test -- categoryController.test.js

# Generate HTML coverage report
npm run test:coverage -- --coverageReporters=html
# Open coverage/index.html in browser
```

---

### Users Service Tests

```bash
cd services/users

# Run all tests
npm test

# Run tests with debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Run tests for a specific file
npm test -- userController.test.js
```

---

### Orders Service Tests

```bash
cd services/orders

# Run all tests (including WebSocket tests)
npm test

# Run only order creation tests
npm test -- --testNamePattern="create order"

# Run with coverage
npm run test:coverage

# Run integration tests with real database
TEST_USE_REAL_DB=true npm test -- tests/integration
```

---

### Frontend Component Tests

```bash
cd frontend

# Run all component tests
npm test

# Run specific component tests
npm test -- ProductCard.test.tsx

# Run Redux tests
npm test -- store/__tests__

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Update snapshots
npm test -- -u
```

---

### Frontend E2E Tests (Cypress)

```bash
cd frontend

# Open Cypress interactive UI
npm run test:e2e:open

# Run all E2E tests headless
npm run test:e2e

# Run specific test file
npx cypress run --spec "cypress/e2e/completePurchaseFlow.cy.js"

# Run with specific browser
npx cypress run --browser chrome

# Run with video recording
npx cypress run --record

# Run in headed mode
npx cypress run --headed
```

**Cypress Test Output:**
```
  E2E - Complete Purchase Flow
    ✓ TC-E2E-003: Should complete entire purchase flow (25432ms)
    ✓ TC-E2E-004: Should redirect guest user to login (3245ms)

  2 passing (29s)
```

---

## 🚀 Running All Tests

### Run All Backend Tests

**File:** `scripts/run-all-backend-tests.sh`

```bash
#!/bin/bash

echo "Running all backend service tests..."

services=("auth" "products" "categories" "users" "orders")
failed_services=()
passed_services=()

for service in "${services[@]}"
do
  echo ""
  echo "========================================"
  echo "Testing $service service..."
  echo "========================================"

  cd "services/$service"

  if npm test; then
    echo "✅ $service tests passed"
    passed_services+=("$service")
  else
    echo "❌ $service tests failed"
    failed_services+=("$service")
  fi

  cd ../..
done

echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
echo "Passed: ${#passed_services[@]} services"
for service in "${passed_services[@]}"; do
  echo "  ✅ $service"
done

echo ""
echo "Failed: ${#failed_services[@]} services"
for service in "${failed_services[@]}"; do
  echo "  ❌ $service"
done

if [ ${#failed_services[@]} -eq 0 ]; then
  echo ""
  echo "🎉 All backend tests passed!"
  exit 0
else
  echo ""
  echo "⚠️  Some tests failed. Please review the output above."
  exit 1
fi
```

**Run:**
```bash
chmod +x scripts/run-all-backend-tests.sh
./scripts/run-all-backend-tests.sh
```

---

### Run All Frontend Tests

**File:** `scripts/run-all-frontend-tests.sh`

```bash
#!/bin/bash

echo "Running all frontend tests..."

cd frontend

# Run unit and integration tests
echo "Running unit and integration tests..."
npm test

unit_result=$?

# Run E2E tests
echo ""
echo "Running E2E tests..."
npm run test:e2e

e2e_result=$?

cd ..

# Summary
echo ""
echo "========================================"
echo "Frontend Test Summary"
echo "========================================"

if [ $unit_result -eq 0 ]; then
  echo "✅ Unit/Integration tests passed"
else
  echo "❌ Unit/Integration tests failed"
fi

if [ $e2e_result -eq 0 ]; then
  echo "✅ E2E tests passed"
else
  echo "❌ E2E tests failed"
fi

if [ $unit_result -eq 0 ] && [ $e2e_result -eq 0 ]; then
  echo ""
  echo "🎉 All frontend tests passed!"
  exit 0
else
  echo ""
  echo "⚠️  Some tests failed."
  exit 1
fi
```

---

### Run Complete Test Suite

**File:** `scripts/run-all-tests.sh`

```bash
#!/bin/bash

echo "========================================="
echo "LaunchpadMERN Complete Test Suite"
echo "========================================="

# Start test database
echo "Starting test database..."
docker-compose -f docker-compose.test.yml up -d mongodb
sleep 5

# Backend tests
echo ""
./scripts/run-all-backend-tests.sh
backend_result=$?

# Frontend tests
echo ""
./scripts/run-all-frontend-tests.sh
frontend_result=$?

# Performance tests (optional)
echo ""
echo "========================================"
echo "Running performance tests..."
echo "========================================"
artillery run tests/performance/artillery-load-test.yml
perf_result=$?

# Cleanup
echo ""
echo "Cleaning up test environment..."
docker-compose -f docker-compose.test.yml down

# Final summary
echo ""
echo "========================================="
echo "Complete Test Suite Summary"
echo "========================================="

if [ $backend_result -eq 0 ]; then
  echo "✅ Backend tests: PASSED"
else
  echo "❌ Backend tests: FAILED"
fi

if [ $frontend_result -eq 0 ]; then
  echo "✅ Frontend tests: PASSED"
else
  echo "❌ Frontend tests: FAILED"
fi

if [ $perf_result -eq 0 ]; then
  echo "✅ Performance tests: PASSED"
else
  echo "⚠️  Performance tests: FAILED (non-critical)"
fi

if [ $backend_result -eq 0 ] && [ $frontend_result -eq 0 ]; then
  echo ""
  echo "🎉 All critical tests passed!"
  exit 0
else
  echo ""
  echo "⚠️  Some critical tests failed. Please review."
  exit 1
fi
```

**Run:**
```bash
chmod +x scripts/run-all-tests.sh
./scripts/run-all-tests.sh
```

---

## 📊 Coverage Reports

### Generate Coverage for Single Service

```bash
cd services/auth

# Generate coverage with default reporters (text, json)
npm run test:coverage

# Generate HTML coverage report
npm run test:coverage -- --coverageReporters=html

# Open HTML report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

---

### Generate Combined Coverage Report

**File:** `scripts/generate-coverage-report.sh`

```bash
#!/bin/bash

echo "Generating coverage reports for all services..."

services=("auth" "products" "categories" "users" "orders")

# Create coverage directory
mkdir -p coverage-reports

for service in "${services[@]}"
do
  echo ""
  echo "Generating coverage for $service..."

  cd "services/$service"
  npm run test:coverage -- --coverageReporters=json --coverageReporters=text

  # Copy coverage to reports directory
  cp -r coverage ../../coverage-reports/$service-coverage

  cd ../..
done

# Frontend coverage
echo ""
echo "Generating coverage for frontend..."
cd frontend
npm run test:coverage -- --coverageReporters=json --coverageReporters=html
cp -r coverage ../coverage-reports/frontend-coverage
cd ..

echo ""
echo "✅ Coverage reports generated in coverage-reports/"
echo ""
echo "Summary:"
for service in "${services[@]}"; do
  if [ -f "coverage-reports/$service-coverage/coverage-summary.json" ]; then
    node -e "
      const coverage = require('./coverage-reports/$service-coverage/coverage-summary.json');
      const total = coverage.total;
      console.log('$service: ' +
        'Lines: ' + total.lines.pct + '% | ' +
        'Functions: ' + total.functions.pct + '% | ' +
        'Branches: ' + total.branches.pct + '%'
      );
    "
  fi
done
```

**Run:**
```bash
chmod +x scripts/generate-coverage-report.sh
./scripts/generate-coverage-report.sh
```

---

### Coverage Report Interpretation

**Example Coverage Output:**
```
------------------|---------|----------|---------|---------|-------------------
File              | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
------------------|---------|----------|---------|---------|-------------------
All files         |   85.23 |    78.45 |   89.12 |   85.67 |
 controllers/     |   92.15 |    85.23 |   95.45 |   92.34 |
  authController  |   94.23 |    88.12 |   96.78 |   94.56 | 145-148,234
  userController  |   90.12 |    82.34 |   94.12 |   90.23 | 78,123-126
 models/          |   88.45 |    75.12 |   85.67 |   88.78 |
  User.js         |   88.45 |    75.12 |   85.67 |   88.78 | 56,89-92
 middleware/      |   78.34 |    70.23 |   80.12 |   78.56 |
  auth.js         |   78.34 |    70.23 |   80.12 |   78.56 | 45-52,78-82
------------------|---------|----------|---------|---------|-------------------
```

**What the metrics mean:**
- **Statements**: % of code statements executed
- **Branch**: % of conditional branches (if/else) tested
- **Functions**: % of functions called
- **Lines**: % of code lines executed
- **Uncovered Lines**: Lines not covered by tests (need more tests)

**Target Coverage:**
- ✅ **Excellent**: > 90%
- ✅ **Good**: 80-90%
- ⚠️ **Fair**: 70-80%
- ❌ **Poor**: < 70%

---

## 🔄 CI/CD Integration

### GitHub Actions Workflow

**File:** `.github/workflows/test.yml`

```yaml
name: Run Tests

on:
  push:
    branches: [ master, develop ]
  pull_request:
    branches: [ master, develop ]

jobs:
  backend-tests:
    name: Backend Tests
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:6
        ports:
          - 27017:27017
        env:
          MONGO_INITDB_ROOT_USERNAME: testuser
          MONGO_INITDB_ROOT_PASSWORD: testpassword

    strategy:
      matrix:
        service: [auth, products, categories, users, orders]

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: services/${{ matrix.service }}/package-lock.json

      - name: Install dependencies
        run: |
          cd services/${{ matrix.service }}
          npm ci

      - name: Run tests
        run: |
          cd services/${{ matrix.service }}
          npm run test:coverage
        env:
          NODE_ENV: test
          MONGODB_URI: mongodb://testuser:testpassword@localhost:27017/test
          JWT_SECRET: test-secret

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./services/${{ matrix.service }}/coverage/coverage-final.json
          flags: ${{ matrix.service }}
          name: ${{ matrix.service }}-coverage

  frontend-tests:
    name: Frontend Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Run unit tests
        run: |
          cd frontend
          npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./frontend/coverage/coverage-final.json
          flags: frontend
          name: frontend-coverage

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Start services
        run: |
          docker-compose -f docker-compose.test.yml up -d
          sleep 30  # Wait for services to be ready

      - name: Run Cypress tests
        run: |
          cd frontend
          npm ci
          npm run test:e2e

      - name: Upload Cypress screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: cypress-screenshots
          path: frontend/cypress/screenshots

      - name: Upload Cypress videos
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: cypress-videos
          path: frontend/cypress/videos

      - name: Cleanup
        if: always()
        run: docker-compose -f docker-compose.test.yml down

  code-quality:
    name: Code Quality
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Run ESLint
        run: |
          npm install -g eslint
          find services -name "*.js" | xargs eslint

      - name: Check test coverage thresholds
        run: |
          ./scripts/check-coverage-thresholds.sh
```

---

### Coverage Threshold Checker

**File:** `scripts/check-coverage-thresholds.sh`

```bash
#!/bin/bash

echo "Checking coverage thresholds..."

# Define thresholds
BACKEND_THRESHOLD=80
FRONTEND_THRESHOLD=70

services=("auth" "products" "categories" "users" "orders")
failed=0

for service in "${services[@]}"
do
  coverage_file="services/$service/coverage/coverage-summary.json"

  if [ -f "$coverage_file" ]; then
    lines_pct=$(node -e "console.log(require('./$coverage_file').total.lines.pct)")

    if (( $(echo "$lines_pct < $BACKEND_THRESHOLD" | bc -l) )); then
      echo "❌ $service: Coverage $lines_pct% < $BACKEND_THRESHOLD%"
      failed=1
    else
      echo "✅ $service: Coverage $lines_pct% >= $BACKEND_THRESHOLD%"
    fi
  else
    echo "⚠️  $service: No coverage file found"
    failed=1
  fi
done

# Check frontend
frontend_coverage="frontend/coverage/coverage-summary.json"
if [ -f "$frontend_coverage" ]; then
  lines_pct=$(node -e "console.log(require('./$frontend_coverage').total.lines.pct)")

  if (( $(echo "$lines_pct < $FRONTEND_THRESHOLD" | bc -l) )); then
    echo "❌ frontend: Coverage $lines_pct% < $FRONTEND_THRESHOLD%"
    failed=1
  else
    echo "✅ frontend: Coverage $lines_pct% >= $FRONTEND_THRESHOLD%"
  fi
else
  echo "⚠️  frontend: No coverage file found"
  failed=1
fi

exit $failed
```

---

## 🐛 Troubleshooting

### Common Issues and Solutions

#### 1. Tests Timing Out

**Problem:**
```
Timeout - Async callback was not invoked within the 5000 ms timeout
```

**Solution:**
```javascript
// Increase timeout for specific test
test('slow operation', async () => {
  // test code
}, 10000); // 10 second timeout

// Or increase globally in jest.config.js
module.exports = {
  testTimeout: 10000
};
```

---

#### 2. MongoDB Connection Issues

**Problem:**
```
MongoServerError: Authentication failed
```

**Solution:**
```bash
# Check MongoDB is running
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod

# Verify connection
mongosh --eval "db.adminCommand('ping')"

# Use MongoDB Memory Server for tests (recommended)
npm install --save-dev mongodb-memory-server
```

---

#### 3. Port Already in Use

**Problem:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**
```bash
# Find process using port
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port for tests
PORT=3099 npm test
```

---

#### 4. Module Not Found

**Problem:**
```
Cannot find module '@testing-library/react'
```

**Solution:**
```bash
# Install missing dependencies
npm install --save-dev @testing-library/react

# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

---

#### 5. Snapshot Tests Failing

**Problem:**
```
Snapshot test failed. Review the changes and update with -u
```

**Solution:**
```bash
# Update snapshots if changes are intentional
npm test -- -u

# Or update specific snapshot
npm test -- ComponentName.test.js -u
```

---

#### 6. Cypress Cannot Find Elements

**Problem:**
```
Timed out retrying: Expected to find element: [data-testid="product-card"]
```

**Solution:**
```javascript
// Increase timeout
cy.get('[data-testid="product-card"]', { timeout: 10000 })

// Wait for API call to complete
cy.intercept('GET', '/api/v1/products').as('getProducts');
cy.visit('/products');
cy.wait('@getProducts');
cy.get('[data-testid="product-card"]').should('exist');

// Add data-testid attributes to components
<div data-testid="product-card">...</div>
```

---

#### 7. Coverage Not Updating

**Problem:**
Coverage reports show old data

**Solution:**
```bash
# Clear Jest cache
npx jest --clearCache

# Delete coverage directory
rm -rf coverage

# Run tests with coverage again
npm run test:coverage
```

---

#### 8. Mock Functions Not Working

**Problem:**
```
Expected mock function to have been called, but it was not called
```

**Solution:**
```javascript
// Clear mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Verify mock was set up correctly
console.log(mockFunction.mock.calls);

// Use waitFor for async calls
await waitFor(() => {
  expect(mockFunction).toHaveBeenCalled();
});
```

---

## 📈 Best Practices

### 1. Test Organization
```
services/auth/
├── tests/
│   ├── unit/
│   │   ├── controllers/
│   │   ├── models/
│   │   └── middleware/
│   ├── integration/
│   │   └── api/
│   ├── fixtures/
│   │   ├── users.json
│   │   └── tokens.json
│   └── setup.js
```

### 2. Test Naming Convention
```javascript
// Format: TC-[SERVICE]-[NUMBER]: [Description]
test('TC-AUTH-001: Should register user with valid data', () => {
  // test code
});
```

### 3. Use Test Data Factories
```javascript
// tests/factories/userFactory.js
const { faker } = require('@faker-js/faker');

function createUser(overrides = {}) {
  return {
    email: faker.internet.email(),
    name: faker.person.fullName(),
    password: 'TestPassword123!',
    ...overrides
  };
}

module.exports = { createUser };
```

### 4. Clean Up After Tests
```javascript
afterEach(async () => {
  await User.deleteMany({});
  await Order.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});
```

---

## ✅ Summary

You now have a complete test execution guide including:

1. ✅ **Setup Scripts** - Automated dependency installation
2. ✅ **Test Commands** - For all services and test types
3. ✅ **Coverage Reports** - Generation and interpretation
4. ✅ **CI/CD Integration** - GitHub Actions workflows
5. ✅ **Troubleshooting** - Common issues and solutions

**Next Steps:**
1. Run `./scripts/install-test-dependencies.sh` to set up all dependencies
2. Create test files based on [SAMPLE_TEST_IMPLEMENTATIONS.md](SAMPLE_TEST_IMPLEMENTATIONS.md)
3. Run tests for each service: `cd services/auth && npm test`
4. Generate coverage reports: `./scripts/generate-coverage-report.sh`
5. Set up CI/CD with the provided GitHub Actions workflow

---

**Your comprehensive test suite is ready to implement! 🎉**
