/**
 * API Key Management Service
 * Handles generation, validation, and rotation of API keys
 */

const crypto = require('crypto');
const bcrypt = require('bcrypt');

class APIKeyService {
  constructor() {
    this.SALT_ROUNDS = 10;
    this.KEY_LENGTH = 32; // 32 bytes = 256 bits
  }
  
  /**
   * Generate a new API key
   * @param {String} prefix - Key prefix (e.g., 'sk_live_', 'sk_test_')
   * @returns {String} API key
   */
  generateKey(prefix = 'sk_live_') {
    const randomBytes = crypto.randomBytes(this.KEY_LENGTH);
    const key = prefix + randomBytes.toString('base64url');
    return key;
  }
  
  /**
   * Hash an API key for secure storage
   * @param {String} key - Plain API key
   * @returns {Promise<String>} Hashed key
   */
  async hashKey(key) {
    return await bcrypt.hash(key, this.SALT_ROUNDS);
  }
  
  /**
   * Verify an API key against its hash
   * @param {String} key - Plain API key to verify
   * @param {String} hash - Stored hash
   * @returns {Promise<Boolean>} True if key matches hash
   */
  async verifyKey(key, hash) {
    return await bcrypt.compare(key, hash);
  }
  
  /**
   * Extract key prefix from API key
   * @param {String} key - API key
   * @returns {String} Key prefix (first 12 characters)
   */
  getKeyPrefix(key) {
    return key.substring(0, Math.min(12, key.length));
  }
  
  /**
   * Generate API key for device
   * @param {String} deviceId - Device identifier
   * @param {Object} options - Key options
   * @returns {Object} API key data
   */
  async generateDeviceKey(deviceId, options = {}) {
    const {
      environment = 'live', // live, test
      permissions = ['read'],
      rateLimit = {
        requestsPerMinute: 60,
        requestsPerDay: 1000
      }
    } = options;
    
    // Generate key with environment prefix
    const prefix = environment === 'test' ? 'sk_test_' : 'sk_live_';
    const apiKey = this.generateKey(prefix);
    const keyHash = await this.hashKey(apiKey);
    const keyPrefix = this.getKeyPrefix(apiKey);
    
    return {
      apiKey: apiKey, // Return to user ONCE
      keyHash: keyHash, // Store this
      keyPrefix: keyPrefix, // Store for identification
      deviceId: deviceId,
      permissions: permissions,
      rateLimit: rateLimit,
      environment: environment,
      createdAt: new Date().toISOString(),
      expiresAt: null,
      active: true
    };
  }
  
  /**
   * Generate API key for service account
   * @param {String} accountId - Service account identifier
   * @param {Object} options - Key options
   * @returns {Object} API key data
   */
  async generateServiceKey(accountId, options = {}) {
    const {
      scopes = ['read'],
      permissions = [],
      rateLimit = {
        requestsPerMinute: 100,
        requestsPerHour: 1000
      },
      expiresIn = null // milliseconds or null for no expiration
    } = options;
    
    const prefix = 'sa_live_'; // Service Account prefix
    const apiKey = this.generateKey(prefix);
    const keyHash = await this.hashKey(apiKey);
    const keyPrefix = this.getKeyPrefix(apiKey);
    
    const expiresAt = expiresIn 
      ? new Date(Date.now() + expiresIn).toISOString()
      : null;
    
    return {
      apiKey: apiKey,
      keyHash: keyHash,
      keyPrefix: keyPrefix,
      accountId: accountId,
      scopes: scopes,
      permissions: permissions,
      rateLimit: rateLimit,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt,
      active: true
    };
  }
  
  /**
   * Validate API key format
   * @param {String} key - API key to validate
   * @returns {Object} Validation result
   */
  validateKeyFormat(key) {
    if (!key || typeof key !== 'string') {
      return { valid: false, reason: 'Key is required and must be a string' };
    }
    
    // Check if key has valid prefix
    const validPrefixes = ['sk_live_', 'sk_test_', 'sa_live_', 'sa_test_'];
    const hasValidPrefix = validPrefixes.some(prefix => key.startsWith(prefix));
    
    if (!hasValidPrefix) {
      return { valid: false, reason: 'Invalid key prefix' };
    }
    
    // Check minimum length (prefix + 32 bytes base64url encoded)
    if (key.length < 50) {
      return { valid: false, reason: 'Key too short' };
    }
    
    // Check if key contains only valid base64url characters after prefix
    const keyBody = key.substring(key.indexOf('_') + 1);
    const base64urlRegex = /^[A-Za-z0-9_-]+$/;
    
    if (!base64urlRegex.test(keyBody)) {
      return { valid: false, reason: 'Key contains invalid characters' };
    }
    
    return { valid: true };
  }
  
  /**
   * Parse API key to extract metadata
   * @param {String} key - API key
   * @returns {Object} Key metadata
   */
  parseKey(key) {
    let prefix = '';
    let environment = 'unknown';
    let type = 'unknown';
    
    if (key.startsWith('sk_live_')) {
      prefix = 'sk_live_';
      environment = 'live';
      type = 'device';
    } else if (key.startsWith('sk_test_')) {
      prefix = 'sk_test_';
      environment = 'test';
      type = 'device';
    } else if (key.startsWith('sa_live_')) {
      prefix = 'sa_live_';
      environment = 'live';
      type = 'service';
    } else if (key.startsWith('sa_test_')) {
      prefix = 'sa_test_';
      environment = 'test';
      type = 'service';
    }
    
    return {
      prefix: this.getKeyPrefix(key),
      fullPrefix: prefix,
      environment: environment,
      type: type
    };
  }
  
  /**
   * Generate rotation token for key rotation
   * @returns {String} Rotation token
   */
  generateRotationToken() {
    return crypto.randomBytes(16).toString('hex');
  }
  
  /**
   * Calculate key age in days
   * @param {String} createdAt - ISO date string
   * @returns {Number} Age in days
   */
  getKeyAge(createdAt) {
    const created = new Date(createdAt);
    const now = new Date();
    const diff = now - created;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
  
  /**
   * Check if key should be rotated
   * @param {String} createdAt - ISO date string
   * @param {Number} rotationDays - Days until rotation required
   * @returns {Boolean} True if key should be rotated
   */
  shouldRotate(createdAt, rotationDays = 90) {
    const age = this.getKeyAge(createdAt);
    return age >= rotationDays;
  }
  
  /**
   * Check if key is expired
   * @param {String} expiresAt - ISO date string or null
   * @returns {Boolean} True if key is expired
   */
  isExpired(expiresAt) {
    if (!expiresAt) return false;
    return new Date() > new Date(expiresAt);
  }
  
  /**
   * Mask API key for display (show only prefix)
   * @param {String} key - API key
   * @returns {String} Masked key
   */
  maskKey(key) {
    const prefix = this.getKeyPrefix(key);
    return `${prefix}${'*'.repeat(32)}`;
  }
  
  /**
   * Generate key info for display
   * @param {Object} keyData - Key data object
   * @returns {Object} Key info
   */
  getKeyInfo(keyData) {
    const metadata = this.parseKey(keyData.keyPrefix || keyData.apiKey);
    const age = keyData.createdAt ? this.getKeyAge(keyData.createdAt) : 0;
    const expired = keyData.expiresAt ? this.isExpired(keyData.expiresAt) : false;
    const shouldRotate = keyData.createdAt ? this.shouldRotate(keyData.createdAt) : false;
    
    return {
      prefix: keyData.keyPrefix,
      type: metadata.type,
      environment: metadata.environment,
      age: age,
      expired: expired,
      shouldRotate: shouldRotate,
      active: keyData.active && !expired,
      createdAt: keyData.createdAt,
      expiresAt: keyData.expiresAt,
      lastUsed: keyData.lastUsed || null
    };
  }
  
  /**
   * Validate rate limit
   * @param {Object} usage - Current usage stats
   * @param {Object} limits - Rate limits
   * @returns {Object} Validation result
   */
  checkRateLimit(usage, limits) {
    const result = {
      allowed: true,
      reason: null,
      resetIn: null
    };
    
    // Check requests per minute
    if (usage.requestsLastMinute >= limits.requestsPerMinute) {
      result.allowed = false;
      result.reason = 'Rate limit exceeded: requests per minute';
      result.resetIn = 60 - (Date.now() % 60000) / 1000;
      return result;
    }
    
    // Check requests per hour (if specified)
    if (limits.requestsPerHour && usage.requestsLastHour >= limits.requestsPerHour) {
      result.allowed = false;
      result.reason = 'Rate limit exceeded: requests per hour';
      result.resetIn = 3600 - (Date.now() % 3600000) / 1000;
      return result;
    }
    
    // Check requests per day
    if (limits.requestsPerDay && usage.requestsToday >= limits.requestsPerDay) {
      result.allowed = false;
      result.reason = 'Rate limit exceeded: requests per day';
      
      // Calculate seconds until midnight
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      result.resetIn = Math.floor((midnight - now) / 1000);
      
      return result;
    }
    
    return result;
  }
}

module.exports = APIKeyService;
