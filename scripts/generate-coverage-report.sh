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
  cp -r coverage ../../coverage-reports/$service-coverage 2>/dev/null || echo "No coverage generated for $service"

  cd ../..
done

# Frontend coverage
echo ""
echo "Generating coverage for frontend..."
cd frontend
npm run test:coverage -- --coverageReporters=json --coverageReporters=html
cp -r coverage ../coverage-reports/frontend-coverage 2>/dev/null || echo "No coverage generated for frontend"
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
    " 2>/dev/null || echo "$service: Coverage data available"
  fi
done
