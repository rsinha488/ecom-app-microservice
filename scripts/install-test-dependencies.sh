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

echo ""
echo "✅ All test dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "1. Create test files based on SAMPLE_TEST_IMPLEMENTATIONS.md"
echo "2. Run tests: cd services/auth && npm test"
echo "3. Generate coverage: npm run test:coverage"
