#!/bin/bash

# Script to apply API versioning and production configs to all services

echo "Applying API versioning and production-ready configurations..."

# Services to update
services=("categories" "users" "orders")

for service in "${services[@]}"; do
    echo "Processing ${service} service..."

    # Create directories
    mkdir -p "${service}/routes/v1"
    mkdir -p "${service}/middleware"

    # Copy apiVersion middleware
    if [ ! -f "${service}/middleware/apiVersion.js" ]; then
        cat > "${service}/middleware/apiVersion.js" << 'EOF'
/**
 * API Versioning Middleware
 */

const validateVersion = (req, res, next) => {
  const version = req.params.version;
  const supportedVersions = ['v1'];

  if (!supportedVersions.includes(version)) {
    return res.status(400).json({
      error: 'unsupported_version',
      error_description: `API version ${version} is not supported`,
      supported_versions: supportedVersions,
      current_version: 'v1'
    });
  }

  req.apiVersion = version;
  next();
};

const setVersionHeaders = (req, res, next) => {
  res.setHeader('X-API-Version', req.apiVersion || 'v1');
  res.setHeader('X-API-Deprecated', 'false');
  next();
};

module.exports = {
  validateVersion,
  setVersionHeaders
};
EOF
    fi

    echo "✓ ${service} middleware created"
done

echo ""
echo "API versioning structure created!"
echo "Please update server.js files manually for each service."
