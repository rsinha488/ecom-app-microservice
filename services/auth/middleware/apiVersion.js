/**
 * API Versioning Middleware
 * Supports versioning through URL path: /v1/endpoint
 */

/**
 * Validate API version
 */
const validateVersion = (req, res, next) => {
  const version = req.params.version;
  const supportedVersions = ['v1'];

  if (!supportedVersions.includes(version)) {
    return res.status(400).json({
      error: 'unsupported_version',
      error_description: `API version ${version} is not supported`,
      supported_versions: supportedVersions,
      current_version: 'v1',
      documentation: `${process.env.ISSUER}/docs/api/${version}`
    });
  }

  req.apiVersion = version;
  next();
};

/**
 * Set version headers in response
 */
const setVersionHeaders = (req, res, next) => {
  res.setHeader('X-API-Version', req.apiVersion || 'v1');
  res.setHeader('X-API-Deprecated', 'false');
  next();
};

/**
 * Deprecation warning middleware
 */
const deprecationWarning = (deprecatedVersion, sunsetDate) => {
  return (req, res, next) => {
    res.setHeader('X-API-Deprecated', 'true');
    res.setHeader('X-API-Sunset-Date', sunsetDate);
    res.setHeader('Warning', `299 - "API version ${deprecatedVersion} is deprecated and will be sunset on ${sunsetDate}"`);
    next();
  };
};

module.exports = {
  validateVersion,
  setVersionHeaders,
  deprecationWarning
};
