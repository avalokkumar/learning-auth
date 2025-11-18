/**
 * HTTP Basic Authentication Service
 * Implements RFC 7617 - Basic Authentication Scheme
 */

const database = require('../database/Database');

class BasicAuthService {
  /**
   * Parse Basic Auth header
   * Format: Authorization: Basic base64(username:password)
   */
  parseAuthHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return null;
    }
    
    try {
      // Extract base64 credentials
      const base64Credentials = authHeader.substring(6);
      
      // Decode base64
      const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
      
      // Split username:password
      const separatorIndex = credentials.indexOf(':');
      if (separatorIndex === -1) {
        return null;
      }
      
      const username = credentials.substring(0, separatorIndex);
      const password = credentials.substring(separatorIndex + 1);
      
      return { username, password };
    } catch (error) {
      console.error('Error parsing Basic Auth header:', error);
      return null;
    }
  }
  
  /**
   * Authenticate with Basic Auth
   */
  async authenticate(authHeader) {
    const credentials = this.parseAuthHeader(authHeader);
    
    if (!credentials) {
      return { success: false, error: 'Invalid authorization header' };
    }
    
    // Find user
    const user = database.getUserByUsername(credentials.username);
    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }
    
    // Verify password
    const isValid = await database.verifyPassword(user, credentials.password);
    
    if (!isValid) {
      database.recordFailedLogin(user.id);
      return { success: false, error: 'Invalid credentials' };
    }
    
    // Record successful login
    database.recordLogin(user.id);
    
    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role
      }
    };
  }
  
  /**
   * Generate WWW-Authenticate challenge header
   */
  generateChallenge(realm = 'HTTP Auth Demo') {
    return `Basic realm="${realm}", charset="UTF-8"`;
  }
  
  /**
   * Encode credentials for Basic Auth
   * (Used for testing/documentation)
   */
  encodeCredentials(username, password) {
    const credentials = `${username}:${password}`;
    return Buffer.from(credentials).toString('base64');
  }
}

module.exports = new BasicAuthService();
