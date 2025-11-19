const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

class JWTManager {
  /**
   * Generate Access Token (JWT)
   */
  static generateAccessToken(user, scope = []) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles,
      scope: scope,
      token_type: 'access_token',
      jti: uuidv4()
    };

    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m',
      issuer: process.env.ISSUER,
      audience: process.env.CLIENT_ID
    });
  }

  /**
   * Generate Refresh Token (Opaque string stored in DB)
   */
  static generateRefreshToken() {
    return uuidv4();
  }

  /**
   * Generate ID Token (OpenID Connect)
   */
  static generateIDToken(user, nonce = null) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      email_verified: user.email_verified,
      name: user.name,
      given_name: user.given_name,
      family_name: user.family_name,
      picture: user.picture,
      phone_number: user.phone_number,
      phone_number_verified: user.phone_number_verified,
      address: user.address,
      updated_at: user.updatedAt,
      iat: Math.floor(Date.now() / 1000),
      token_type: 'id_token'
    };

    if (nonce) {
      payload.nonce = nonce;
    }

    return jwt.sign(payload, process.env.ID_TOKEN_SECRET, {
      expiresIn: process.env.ID_TOKEN_EXPIRY || '1h',
      issuer: process.env.ISSUER,
      audience: process.env.CLIENT_ID
    });
  }

  /**
   * Verify Access Token
   */
  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
        issuer: process.env.ISSUER
      });
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  /**
   * Verify ID Token
   */
  static verifyIDToken(token) {
    try {
      return jwt.verify(token, process.env.ID_TOKEN_SECRET, {
        issuer: process.env.ISSUER
      });
    } catch (error) {
      throw new Error('Invalid ID token');
    }
  }

  /**
   * Decode token without verification (for inspection)
   */
  static decodeToken(token) {
    return jwt.decode(token);
  }
}

module.exports = JWTManager;
