const { v4: uuidv4 } = require('uuid');

class OAuth2Utils {
  /**
   * Generate authorization code
   */
  static generateAuthorizationCode() {
    return uuidv4();
  }

  /**
   * Parse scope string to array
   */
  static parseScope(scopeString) {
    if (!scopeString) return [];
    return scopeString.split(' ').filter(s => s.length > 0);
  }

  /**
   * Validate scope
   */
  static validateScope(requestedScope, allowedScope) {
    const requested = this.parseScope(requestedScope);
    const allowed = Array.isArray(allowedScope) ? allowedScope : this.parseScope(allowedScope);

    return requested.every(scope => allowed.includes(scope));
  }

  /**
   * Check if scope includes OpenID
   */
  static isOpenIDRequest(scope) {
    const scopes = Array.isArray(scope) ? scope : this.parseScope(scope);
    return scopes.includes('openid');
  }

  /**
   * Build authorization response
   */
  static buildAuthorizationResponse(redirectUri, code, state) {
    const url = new URL(redirectUri);
    url.searchParams.append('code', code);
    if (state) {
      url.searchParams.append('state', state);
    }
    return url.toString();
  }

  /**
   * Build error response
   */
  static buildErrorResponse(redirectUri, error, errorDescription, state) {
    const url = new URL(redirectUri);
    url.searchParams.append('error', error);
    if (errorDescription) {
      url.searchParams.append('error_description', errorDescription);
    }
    if (state) {
      url.searchParams.append('state', state);
    }
    return url.toString();
  }

  /**
   * Validate redirect URI
   */
  static validateRedirectUri(redirectUri, allowedUris) {
    return allowedUris.includes(redirectUri);
  }

  /**
   * Calculate token expiry date
   */
  static calculateExpiry(expiresIn) {
    const now = new Date();

    // Parse expiry time (e.g., "15m", "7d", "1h")
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid expiry format');
    }

    const [, value, unit] = match;
    const amount = parseInt(value);

    switch (unit) {
      case 's':
        return new Date(now.getTime() + amount * 1000);
      case 'm':
        return new Date(now.getTime() + amount * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + amount * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + amount * 24 * 60 * 60 * 1000);
      default:
        throw new Error('Invalid expiry unit');
    }
  }
}

module.exports = OAuth2Utils;
