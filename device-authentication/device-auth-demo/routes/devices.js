/**
 * Device Management Routes
 * Handle device registration, management, and operations
 */

const express = require('express');
const router = express.Router();

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  next();
};

// Device registration page
router.get('/register', (req, res) => {
  res.render('device-register', {
    title: 'Register Device',
    user: req.session.user || null,
    error: null
  });
});

// Register new device
router.post('/register', async (req, res) => {
  const { name, type, manufacturer, model, serialNumber, macAddress } = req.body;
  
  if (!name || !type) {
    return res.render('device-register', {
      title: 'Register Device',
      user: req.session.user || null,
      error: 'Device name and type are required'
    });
  }
  
  try {
    const deviceAuthService = req.app.locals.deviceAuthService;
    
    const result = deviceAuthService.registerDevice({
      name,
      type,
      info: {
        manufacturer: manufacturer || '',
        model: model || '',
        serialNumber: serialNumber || ''
      },
      macAddress: macAddress || ''
    }, req);
    
    if (result.success) {
      res.redirect(`/devices/${result.device.id}`);
    } else {
      res.render('device-register', {
        title: 'Register Device',
        user: req.session.user || null,
        error: result.reason
      });
    }
  } catch (error) {
    console.error('Device registration error:', error);
    res.render('device-register', {
      title: 'Register Device',
      user: req.session.user || null,
      error: 'Registration failed'
    });
  }
});

// List all devices
router.get('/', requireAuth, (req, res) => {
  const deviceRegistry = req.app.locals.deviceRegistry;
  const devices = deviceRegistry.getAll();
  const stats = deviceRegistry.getStats();
  
  res.render('device-list', {
    title: 'Registered Devices',
    user: req.session.user,
    devices,
    stats
  });
});

// View specific device
router.get('/:id', requireAuth, (req, res) => {
  const deviceRegistry = req.app.locals.deviceRegistry;
  const device = deviceRegistry.getById(req.params.id);
  
  if (!device) {
    return res.status(404).render('404', {
      title: '404 - Device Not Found',
      user: req.session.user
    });
  }
  
  const deviceAuthService = req.app.locals.deviceAuthService;
  const authMethods = deviceAuthService.getDeviceAuthMethods(device.id);
  
  res.render('device-details', {
    title: `Device: ${device.name}`,
    user: req.session.user,
    device,
    authMethods
  });
});

// Generate API key for device
router.post('/:id/generate-api-key', requireAuth, async (req, res) => {
  const deviceAuthService = req.app.locals.deviceAuthService;
  
  try {
    const result = await deviceAuthService.generateDeviceAPIKey(req.params.id, {
      environment: req.body.environment || 'live',
      permissions: req.body.permissions || ['read']
    });
    
    res.json({
      success: true,
      apiKey: result.apiKey,
      keyPrefix: result.keyPrefix,
      warning: 'This is the only time the API key will be shown. Save it securely!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update device status
router.post('/:id/status', requireAuth, (req, res) => {
  const deviceRegistry = req.app.locals.deviceRegistry;
  const device = deviceRegistry.getById(req.params.id);
  
  if (!device) {
    return res.status(404).json({ success: false, error: 'Device not found' });
  }
  
  device.updateStatus(req.body.status);
  deviceRegistry.save();
  
  res.json({ success: true, device: device.getSummary() });
});

// Update device trust level
router.post('/:id/trust-level', requireAuth, (req, res) => {
  const deviceRegistry = req.app.locals.deviceRegistry;
  const device = deviceRegistry.getById(req.params.id);
  
  if (!device) {
    return res.status(404).json({ success: false, error: 'Device not found' });
  }
  
  device.updateTrustLevel(req.body.trustLevel);
  deviceRegistry.save();
  
  res.json({ success: true, device: device.getSummary() });
});

// Delete device
router.delete('/:id', requireAuth, (req, res) => {
  const deviceRegistry = req.app.locals.deviceRegistry;
  const deleted = deviceRegistry.delete(req.params.id);
  
  if (deleted) {
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, error: 'Device not found' });
  }
});

module.exports = router;
