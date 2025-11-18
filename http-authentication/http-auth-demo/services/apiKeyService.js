/**
 * API Key Authentication Service
 * Custom header: X-API-Key
 */

const database = require('../database/Database');

class ApiKeyService {
  /**
   * Parse API key from headers
   * Supports multiple header formats:
   * - X-API-Key: key
   * - Authorization: ApiKey key
   */
  parseApiKey(headers) {
    // Check X-API-Key header
    if (headers['x-api-key']) {
      return headers['x-api-key'];
    }
    
    // Check Authorization header with ApiKey scheme
    const authHeader = headers['authorization'];
    if (authHeader && authHeader.startsWith('ApiKey ')) {
      return authHeader.substring(7);
    }
    
    return null;
  }
  
  /**
   * Authenticate with API key
   */
  async authenticate(headers) {
    const apiKey = this.parseApiKey(headers);
    
    if (!apiKey) {
      return { success: false, error: 'API key not provided' };
    }
    
    // Verify API key
    const keyRecord = await database.verifyApiKey(apiKey);
    
    if (!keyRecord) {
      return { success: false, error: 'Invalid API key' };
    }
    
    // Get user
    const user = database.getUserById(keyRecord.userId);
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
      apiKey: {
        id: keyRecord.id,
        name: keyRecord.name,
        usageCount: keyRecord.usageCount
      }
    };
  }
  
  /**
   * Generate new API key for user
   */
  async generateApiKey(userId, name) {
    return await database.createApiKey(userId, name);
  }
  
  /**
   * Get user's API keys
   */
  getUserApiKeys(userId) {
    return database.getApiKeysByUser(userId);
  }
  
  /**
   * Revoke API key
   */
  revokeApiKey(apiKeyId) {
    database.revokeApiKey(apiKeyId);
  }
}

module.exports = new ApiKeyService();
