/**
 * Device Authentication Service
 * Handles device authentication using multiple methods
 */

const DeviceFingerprintService = require('./fingerprintService');
const APIKeyService = require('./apiKeyService');

class DeviceAuthService {
  constructor(deviceRegistry, serviceAccountRegistry) {
    this.deviceRegistry = deviceRegistry;
    this.serviceAccountRegistry = serviceAccountRegistry;
    this.fingerprintService = new DeviceFingerprintService();
    this.apiKeyService = new APIKeyService();
  }
  
  /**
   * Authenticate device using API key
   * @param {String} apiKey - API key
   * @param {Object} req - Request object
   * @returns {Promise<Object>} Authentication result
   */
  async authenticateWithAPIKey(apiKey, req) {
    // Validate key format
    const formatCheck = this.apiKeyService.validateKeyFormat(apiKey);
    if (!formatCheck.valid) {
      return {
        authenticated: false,
        reason: formatCheck.reason,
        device: null
      };
    }
    
    // Parse key to get metadata
    const keyMetadata = this.apiKeyService.parseKey(apiKey);
    const keyPrefix = this.apiKeyService.getKeyPrefix(apiKey);
    
    let entity = null;
    let isDevice = false;
    
    // Check if it's a device key or service account key
    if (keyMetadata.type === 'device') {
      entity = this.deviceRegistry.getByApiKeyPrefix(keyPrefix);
      isDevice = true;
    } else if (keyMetadata.type === 'service') {
      entity = this.serviceAccountRegistry.getByKeyPrefix(keyPrefix);
      isDevice = false;
    }
    
    if (!entity) {
      return {
        authenticated: false,
        reason: 'Invalid API key',
        device: null
      };
    }
    
    // Verify the key hash
    const keyHash = isDevice ? entity.apiKey.keyHash : entity.credentials.apiKeyHash;
    const isValid = await this.apiKeyService.verifyKey(apiKey, keyHash);
    
    if (!isValid) {
      if (isDevice) entity.recordAuthFailure();
      return {
        authenticated: false,
        reason: 'Invalid API key',
        device: null
      };
    }
    
    // Check if key is expired
    const expiresAt = isDevice ? null : entity.expiresAt;
    if (this.apiKeyService.isExpired(expiresAt)) {
      return {
        authenticated: false,
        reason: 'API key has expired',
        device: null
      };
    }
    
    // Check if entity is active
    if (entity.status !== 'active') {
      return {
        authenticated: false,
        reason: `${isDevice ? 'Device' : 'Service account'} is not active`,
        device: null
      };
    }
    
    // Check IP whitelist for service accounts
    if (!isDevice && entity.ipWhitelist.length > 0) {
      const clientIP = this.fingerprintService.getClientIP(req);
      if (!entity.isIPWhitelisted(clientIP)) {
        return {
          authenticated: false,
          reason: 'IP address not whitelisted',
          device: null
        };
      }
    }
    
    // Record successful authentication
    if (isDevice) {
      entity.recordAuthentication();
      this.deviceRegistry.save();
    } else {
      entity.recordUsage(true);
      this.serviceAccountRegistry.save();
    }
    
    return {
      authenticated: true,
      type: keyMetadata.type,
      entity: entity,
      method: 'api_key'
    };
  }
  
  /**
   * Authenticate device using fingerprint
   * @param {Object} req - Request object
   * @returns {Object} Authentication result
   */
  authenticateWithFingerprint(req) {
    // Generate fingerprint from request
    const fingerprint = this.fingerprintService.generateFingerprint(req);
    
    // Look up device by fingerprint
    const device = this.deviceRegistry.getByFingerprint(fingerprint.hash);
    
    if (!device) {
      return {
        authenticated: false,
        reason: 'Device fingerprint not recognized',
        fingerprint: fingerprint,
        device: null
      };
    }
    
    // Check if device is active
    if (device.status !== 'active') {
      return {
        authenticated: false,
        reason: 'Device is not active',
        device: device
      };
    }
    
    // Check if fingerprint has changed significantly
    if (device.fingerprint) {
      const changes = this.fingerprintService.detectChanges(
        device.fingerprint,
        fingerprint
      );
      
      if (changes.significant) {
        device.recordAuthFailure();
        this.deviceRegistry.save();
        
        return {
          authenticated: false,
          reason: 'Device fingerprint has changed significantly',
          changes: changes,
          device: device
        };
      }
    }
    
    // Record successful authentication
    device.recordAuthentication();
    this.deviceRegistry.save();
    
    return {
      authenticated: true,
      device: device,
      fingerprint: fingerprint,
      method: 'fingerprint'
    };
  }
  
  /**
   * Register new device
   * @param {Object} deviceData - Device information
   * @param {Object} req - Request object
   * @returns {Object} Registration result
   */
  registerDevice(deviceData, req) {
    // Generate fingerprint
    const fingerprint = this.fingerprintService.generateFingerprint(req);
    
    // Check if device with same fingerprint exists
    const existing = this.deviceRegistry.getByFingerprint(fingerprint.hash);
    if (existing) {
      return {
        success: false,
        reason: 'Device with this fingerprint already registered',
        device: existing
      };
    }
    
    // Create device object
    const device = this.deviceRegistry.register({
      name: deviceData.name,
      type: deviceData.type,
      status: 'pending',
      trustLevel: 'registered',
      info: deviceData.info || {},
      network: {
        ipAddress: this.fingerprintService.getClientIP(req),
        macAddress: deviceData.macAddress || '',
        location: deviceData.location || ''
      },
      fingerprint: fingerprint
    });
    
    return {
      success: true,
      device: device,
      fingerprint: fingerprint
    };
  }
  
  /**
   * Generate API key for device
   * @param {String} deviceId - Device ID
   * @param {Object} options - Key options
   * @returns {Promise<Object>} API key data
   */
  async generateDeviceAPIKey(deviceId, options = {}) {
    const device = this.deviceRegistry.getById(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }
    
    // Generate API key
    const keyData = await this.apiKeyService.generateDeviceKey(deviceId, options);
    
    // Update device with key information
    device.apiKey = {
      keyPrefix: keyData.keyPrefix,
      keyHash: keyData.keyHash,
      permissions: keyData.permissions,
      rateLimit: keyData.rateLimit
    };
    device.authMethods.apiKey = true;
    device.updateTrustLevel('verified');
    device.updateStatus('active');
    
    this.deviceRegistry.save();
    
    return {
      device: device,
      apiKey: keyData.apiKey, // Return key ONCE
      keyPrefix: keyData.keyPrefix,
      createdAt: keyData.createdAt
    };
  }
  
  /**
   * Verify device status and trust level
   * @param {String} deviceId - Device ID
   * @returns {Object} Verification result
   */
  verifyDevice(deviceId) {
    const device = this.deviceRegistry.getById(deviceId);
    if (!device) {
      return {
        verified: false,
        reason: 'Device not found'
      };
    }
    
    // Check device status
    if (device.status !== 'active') {
      return {
        verified: false,
        reason: `Device status is ${device.status}`,
        device: device
      };
    }
    
    // Check trust level
    if (device.trustLevel === 'unknown') {
      return {
        verified: false,
        reason: 'Device trust level is unknown',
        device: device
      };
    }
    
    return {
      verified: true,
      device: device,
      trustLevel: device.trustLevel,
      authMethods: device.authMethods
    };
  }
  
  /**
   * Get device authentication methods
   * @param {String} deviceId - Device ID
   * @returns {Array} Available authentication methods
   */
  getDeviceAuthMethods(deviceId) {
    const device = this.deviceRegistry.getById(deviceId);
    if (!device) {
      return [];
    }
    
    const methods = [];
    
    if (device.authMethods.certificate) {
      methods.push({
        type: 'certificate',
        enabled: true,
        details: device.certificate
      });
    }
    
    if (device.authMethods.apiKey) {
      methods.push({
        type: 'api_key',
        enabled: true,
        details: {
          keyPrefix: device.apiKey.keyPrefix,
          permissions: device.apiKey.permissions
        }
      });
    }
    
    if (device.authMethods.fingerprint || device.fingerprint) {
      methods.push({
        type: 'fingerprint',
        enabled: device.authMethods.fingerprint,
        details: {
          confidence: device.fingerprint?.confidence || 0,
          generatedAt: device.fingerprint?.generatedAt || null
        }
      });
    }
    
    return methods;
  }
}

module.exports = DeviceAuthService;
