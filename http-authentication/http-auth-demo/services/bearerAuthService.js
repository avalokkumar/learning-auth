/**
 * Bearer Token Authentication Service
 * Implements RFC 6750 - Bearer Token Usage
 * Uses JWT (JSON Web Tokens)
 */

const jwt = require('jsonwebtoken');
const database = require('../database/Database');

class BearerAuthService {
  constructor() {
    this.secret = 'http-auth-demo-jwt-secret-change-in-production';
    this.algorithm = 'HS256';
    this.accessTokenExpiry = '1h'; // 1 hour
    this.refreshTokenExpiry = '7d'; // 7 days
  }
  
  /**
   * Generate access token (JWT)
   */
  generateAccessToken(user) {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      type: 'access'
    };
    
    const token = jwt.sign(payload, this.secret, {
      algorithm: this.algorithm,
      expiresIn: this.accessTokenExpiry,
      issuer: 'http-auth-demo',
      audience: 'http-auth-demo-api'
    });
    
    // Store in database
    database.createToken(user.id, token, 3600); // 1 hour in seconds
    
    return token;
  }
  
  /**
   * Generate refresh token
   */
  generateRefreshToken(user) {
    const refreshToken = database.createRefreshToken(user.id);
    return refreshToken.token;
  }
  
  /**
   * Generate both tokens
   */
  generateTokens(user) {
    return {
      access_token: this.generateAccessToken(user),
      refresh_token: this.generateRefreshToken(user),
      token_type: 'Bearer',
      expires_in: 3600
    };
  }
  
  /**
   * Parse Bearer token from Authorization header
   */
  parseAuthHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    return authHeader.substring(7);
  }
  
  /**
   * Verify and decode JWT token
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: [this.algorithm],
        issuer: 'http-auth-demo',
        audience: 'http-auth-demo-api'
      });
      
      return { valid: true, payload: decoded };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return { valid: false, error: 'Token expired', expired: true };
      } else if (error.name === 'JsonWebTokenError') {
        return { valid: false, error: 'Invalid token' };
      } else {
        return { valid: false, error: error.message };
      }
    }
  }
  
  /**
   * Authenticate with Bearer token
   */
  async authenticate(authHeader) {
    const token = this.parseAuthHeader(authHeader);
    
    if (!token) {
      return { success: false, error: 'Invalid authorization header' };
    }
    
    // Verify JWT
    const verification = this.verifyToken(token);
    
    if (!verification.valid) {
      return { success: false, error: verification.error, expired: verification.expired };
    }
    
    // Check if token exists in database and not revoked
    const tokenRecord = database.getTokenByString(token);
    if (!tokenRecord) {
      return { success: false, error: 'Token not found or revoked' };
    }
    
    // Get user
    const user = database.getUserById(verification.payload.sub);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role
      },
      payload: verification.payload
    };
  }
  
  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshTokenString) {
    // Get refresh token from database
    const refreshToken = database.getRefreshToken(refreshTokenString);
    
    if (!refreshToken) {
      return { success: false, error: 'Invalid or expired refresh token' };
    }
    
    // Get user
    const user = database.getUserById(refreshToken.userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    
    // Mark refresh token as used
    database.useRefreshToken(refreshToken.id);
    
    // Generate new tokens
    const tokens = this.generateTokens(user);
    
    return {
      success: true,
      tokens
    };
  }
  
  /**
   * Revoke token
   */
  revokeToken(token) {
    const tokenRecord = database.getTokenByString(token);
    if (tokenRecord) {
      database.revokeToken(tokenRecord.id);
      return true;
    }
    return false;
  }
  
  /**
   * Generate WWW-Authenticate challenge header
   */
  generateChallenge(error = null, errorDescription = null) {
    let challenge = 'Bearer realm="HTTP Auth Demo"';
    
    if (error) {
      challenge += `, error="${error}"`;
    }
    
    if (errorDescription) {
      challenge += `, error_description="${errorDescription}"`;
    }
    
    return challenge;
  }
  
  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token) {
    return jwt.decode(token, { complete: true });
  }
}

module.exports = new BearerAuthService();
