/**
 * API Routes
 * Device authentication API endpoints
 */

const express = require('express');
const router = express.Router();

// API key authentication middleware
const authenticateAPIKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      message: 'Please provide an API key in X-API-Key header or api_key query parameter'
    });
  }
  
  try {
    const deviceAuthService = req.app.locals.deviceAuthService;
    const result = await deviceAuthService.authenticateWithAPIKey(apiKey, req);
    
    if (!result.authenticated) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: result.reason
      });
    }
    
    req.authenticatedEntity = result.entity;
    req.authType = result.type;
    next();
  } catch (error) {
    res.status(500).json({
      error: 'Authentication error',
      message: error.message
    });
  }
};

// Public endpoint - no auth required
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Device Authentication API'
  });
});

// Get device information (requires API key)
router.get('/device/info', authenticateAPIKey, (req, res) => {
  const entity = req.authenticatedEntity;
  
  res.json({
    id: entity.id,
    deviceId: entity.deviceId || entity.credentials.accountId,
    name: entity.name,
    type: entity.type,
    status: entity.status,
    trustLevel: entity.trustLevel,
    authMethods: entity.authMethods || {},
    stats: entity.stats
  });
});

// Send telemetry data (requires API key)
router.post('/telemetry', authenticateAPIKey, (req, res) => {
  const entity = req.authenticatedEntity;
  const telemetryData = req.body;
  
  // In a real application, store telemetry data
  console.log(`Telemetry from ${entity.name}:`, telemetryData);
  
  // Update device stats
  entity.stats.lastSeen = new Date().toISOString();
  entity.stats.dataTransferred += JSON.stringify(telemetryData).length;
  
  if (entity.type === 'service') {
    entity.recordUsage(true, JSON.stringify(telemetryData).length);
    req.app.locals.serviceAccountRegistry.save();
  } else {
    req.app.locals.deviceRegistry.save();
  }
  
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    message: 'Telemetry received'
  });
});

// Get device status (requires API key)
router.get('/device/status', authenticateAPIKey, (req, res) => {
  const entity = req.authenticatedEntity;
  
  res.json({
    deviceId: entity.deviceId || entity.credentials.accountId,
    status: entity.status,
    online: entity.stats.lastSeen 
      ? (Date.now() - new Date(entity.stats.lastSeen).getTime()) < 300000 // 5 minutes
      : false,
    lastSeen: entity.stats.lastSeen,
    connectionsCount: entity.stats.connectionsCount || entity.stats.totalRequests
  });
});

// Update device configuration (requires API key)
router.post('/device/config', authenticateAPIKey, (req, res) => {
  const entity = req.authenticatedEntity;
  const config = req.body;
  
  // In a real application, update device configuration
  console.log(`Configuration update for ${entity.name}:`, config);
  
  res.json({
    success: true,
    message: 'Configuration updated',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint - echo request
router.post('/echo', authenticateAPIKey, (req, res) => {
  res.json({
    authenticated: true,
    entity: {
      id: req.authenticatedEntity.id,
      name: req.authenticatedEntity.name,
      type: req.authType
    },
    receivedData: req.body,
    timestamp: new Date().toISOString()
  });
});

// Get device fingerprint
router.get('/fingerprint', (req, res) => {
  const DeviceFingerprintService = require('../services/fingerprintService');
  const fingerprintService = new DeviceFingerprintService();
  
  const fingerprint = fingerprintService.generateFingerprint(req);
  const deviceInfo = fingerprintService.getDeviceInfo(fingerprint);
  
  res.json({
    fingerprint: fingerprint.hash,
    confidence: fingerprint.confidence,
    deviceInfo: deviceInfo,
    characteristics: fingerprint.characteristics
  });
});

// Verify device fingerprint
router.post('/fingerprint/verify', async (req, res) => {
  const { fingerprintHash } = req.body;
  
  if (!fingerprintHash) {
    return res.status(400).json({
      error: 'Fingerprint hash required'
    });
  }
  
  const deviceRegistry = req.app.locals.deviceRegistry;
  const device = deviceRegistry.getByFingerprint(fingerprintHash);
  
  if (!device) {
    return res.json({
      verified: false,
      message: 'Fingerprint not recognized'
    });
  }
  
  res.json({
    verified: true,
    device: {
      id: device.id,
      deviceId: device.deviceId,
      name: device.name,
      trustLevel: device.trustLevel
    }
  });
});

module.exports = router;
