#!/bin/bash

echo "========================================="
echo "LaunchpadMERN Complete Test Suite"
echo "========================================="

# Backend tests
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

# Frontend tests
echo ""
echo "========================================"
echo "Testing frontend..."
echo "========================================"

cd frontend

if npm test; then
  echo "✅ Frontend tests passed"
  passed_services+=("frontend")
else
  echo "❌ Frontend tests failed"
  failed_services+=("frontend")
fi

cd ..

# Final summary
echo ""
echo "========================================="
echo "Complete Test Suite Summary"
echo "========================================="
echo "Passed: ${#passed_services[@]} components"
for service in "${passed_services[@]}"; do
  echo "  ✅ $service"
done

echo ""
echo "Failed: ${#failed_services[@]} components"
for service in "${failed_services[@]}"; do
  echo "  ❌ $service"
done

if [ ${#failed_services[@]} -eq 0 ]; then
  echo ""
  echo "🎉 All tests passed!"
  exit 0
else
  echo ""
  echo "⚠️  Some tests failed. Please review the output above."
  exit 1
fi
