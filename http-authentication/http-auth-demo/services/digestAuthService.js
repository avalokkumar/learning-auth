/**
 * HTTP Digest Authentication Service
 * Implements RFC 7616 - Digest Authentication Scheme
 */

const crypto = require('crypto');
const database = require('../database/Database');

class DigestAuthService {
  constructor() {
    this.nonces = new Map(); // Store active nonces
    this.nonceTimeout = 300000; // 5 minutes
    this.realm = 'HTTP Auth Demo';
  }
  
  /**
   * Generate a new nonce
   */
  generateNonce() {
    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();
    
    this.nonces.set(nonce, {
      created: timestamp,
      count: 0
    });
    
    // Cleanup old nonces
    this.cleanupNonces();
    
    return nonce;
  }
  
  /**
   * Generate opaque value
   */
  generateOpaque() {
    return crypto.randomBytes(16).toString('hex');
  }
  
  /**
   * Clean up expired nonces
   */
  cleanupNonces() {
    const now = Date.now();
    for (const [nonce, data] of this.nonces.entries()) {
      if (now - data.created > this.nonceTimeout) {
        this.nonces.delete(nonce);
      }
    }
  }
  
  /**
   * Generate WWW-Authenticate challenge header
   */
  generateChallenge(stale = false) {
    const nonce = this.generateNonce();
    const opaque = this.generateOpaque();
    
    return {
      header: `Digest realm="${this.realm}", ` +
              `qop="auth,auth-int", ` +
              `nonce="${nonce}", ` +
              `opaque="${opaque}", ` +
              `algorithm=MD5` +
              (stale ? `, stale=true` : ''),
      nonce,
      opaque
    };
  }
  
  /**
   * Parse Digest Auth header
   */
  parseAuthHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Digest ')) {
      return null;
    }
    
    const params = {};
    const regex = /(\w+)=(?:"([^"]+)"|([^\s,]+))/g;
    let match;
    
    while ((match = regex.exec(authHeader.substring(7))) !== null) {
      params[match[1]] = match[2] || match[3];
    }
    
    return params;
  }
  
  /**
   * Calculate MD5 hash
   */
  md5(data) {
    return crypto.createHash('md5').update(data).digest('hex');
  }
  
  /**
   * Validate Digest authentication
   */
  async authenticate(authHeader, method, uri) {
    const params = this.parseAuthHeader(authHeader);
    
    if (!params) {
      return { success: false, error: 'Invalid authorization header' };
    }
    
    // Required parameters
    const required = ['username', 'realm', 'nonce', 'uri', 'response'];
    for (const param of required) {
      if (!params[param]) {
        return { success: false, error: `Missing parameter: ${param}` };
      }
    }
    
    // Validate nonce
    const nonceData = this.nonces.get(params.nonce);
    if (!nonceData) {
      return { success: false, error: 'Invalid or expired nonce', stale: true };
    }
    
    // Check nonce age
    if (Date.now() - nonceData.created > this.nonceTimeout) {
      this.nonces.delete(params.nonce);
      return { success: false, error: 'Nonce expired', stale: true };
    }
    
    // Verify nonce count (prevents replay)
    if (params.nc) {
      const nc = parseInt(params.nc, 16);
      if (nc <= nonceData.count) {
        return { success: false, error: 'Nonce count invalid (replay attack?)' };
      }
      nonceData.count = nc;
    }
    
    // Find user
    const user = database.getUserByUsername(params.username);
    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }
    
    // Calculate expected response
    const expectedResponse = this.calculateResponse(
      user.ha1,
      params.nonce,
      method,
      params.uri,
      params.qop,
      params.nc,
      params.cnonce
    );
    
    // Compare responses
    if (params.response !== expectedResponse) {
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
   * Calculate Digest response
   * Response = MD5(HA1:nonce:nc:cnonce:qop:HA2)
   */
  calculateResponse(ha1, nonce, method, uri, qop, nc, cnonce) {
    // HA2 = MD5(method:uri)
    const ha2 = this.md5(`${method}:${uri}`);
    
    // Response depends on qop
    if (qop) {
      // With qop (auth or auth-int)
      return this.md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
    } else {
      // Without qop (legacy)
      return this.md5(`${ha1}:${nonce}:${ha2}`);
    }
  }
  
  /**
   * Calculate HA1 for a user
   * HA1 = MD5(username:realm:password)
   * This should be pre-calculated and stored
   */
  calculateHA1(username, password) {
    return this.md5(`${username}:${this.realm}:${password}`);
  }
  
  /**
   * Generate authentication info header for response
   */
  generateAuthInfo(nonce, qop, nc, cnonce, ha1, uri) {
    // Calculate rspauth for client verification
    const ha2 = this.md5(`:${uri}`);
    const rspauth = this.md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
    
    const nextnonce = this.generateNonce();
    
    return {
      header: `qop=${qop}, ` +
              `rspauth="${rspauth}", ` +
              `cnonce="${cnonce}", ` +
              `nc=${nc}, ` +
              `nextnonce="${nextnonce}"`,
      nextnonce
    };
  }
}

module.exports = new DigestAuthService();
