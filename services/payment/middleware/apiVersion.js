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
