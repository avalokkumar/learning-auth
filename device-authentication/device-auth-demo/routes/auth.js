/**
 * Authentication Routes
 * Handles user and device authentication
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

// Simple user storage (in production, use a database)
const users = new Map();

// Initialize with demo users
users.set('admin', {
  username: 'admin',
  password: bcrypt.hashSync('admin123', 10),
  role: 'admin',
  name: 'Admin User'
});

users.set('device-manager', {
  username: 'device-manager',
  password: bcrypt.hashSync('manager123', 10),
  role: 'manager',
  name: 'Device Manager'
});

// Login page
router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  
  res.render('login', {
    title: 'Login',
    error: null
  });
});

// Login POST
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  const user = users.get(username);
  
  if (!user) {
    return res.render('login', {
      title: 'Login',
      error: 'Invalid username or password'
    });
  }
  
  // Verify password
  const passwordMatch = await bcrypt.compare(password, user.password);
  
  if (!passwordMatch) {
    return res.render('login', {
      title: 'Login',
      error: 'Invalid username or password'
    });
  }
  
  // Create session
  req.session.user = {
    username: user.username,
    role: user.role,
    name: user.name
  };
  
  res.redirect('/dashboard');
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
    }
    res.redirect('/');
  });
});

// Check authentication status
router.get('/status', (req, res) => {
  res.json({
    authenticated: !!req.session.user,
    user: req.session.user || null,
    device: req.session.device || null
  });
});

// Device authentication with API key
router.post('/device/api-key', async (req, res) => {
  const { apiKey } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({
      authenticated: false,
      error: 'API key is required'
    });
  }
  
  try {
    const deviceAuthService = req.app.locals.deviceAuthService;
    const result = await deviceAuthService.authenticateWithAPIKey(apiKey, req);
    
    if (result.authenticated) {
      // Store device info in session
      req.session.device = {
        id: result.entity.id,
        deviceId: result.entity.deviceId || result.entity.credentials.accountId,
        name: result.entity.name,
        type: result.type,
        authMethod: 'api_key'
      };
      
      return res.json({
        authenticated: true,
        device: req.session.device
      });
    } else {
      return res.status(401).json({
        authenticated: false,
        error: result.reason
      });
    }
  } catch (error) {
    console.error('API key authentication error:', error);
    return res.status(500).json({
      authenticated: false,
      error: 'Authentication failed'
    });
  }
});

// Device authentication with fingerprint
router.post('/device/fingerprint', (req, res) => {
  try {
    const deviceAuthService = req.app.locals.deviceAuthService;
    const result = deviceAuthService.authenticateWithFingerprint(req);
    
    if (result.authenticated) {
      // Store device info in session
      req.session.device = {
        id: result.device.id,
        deviceId: result.device.deviceId,
        name: result.device.name,
        type: result.device.type,
        authMethod: 'fingerprint'
      };
      
      return res.json({
        authenticated: true,
        device: req.session.device,
        fingerprint: result.fingerprint
      });
    } else {
      return res.status(401).json({
        authenticated: false,
        error: result.reason,
        fingerprint: result.fingerprint || null
      });
    }
  } catch (error) {
    console.error('Fingerprint authentication error:', error);
    return res.status(500).json({
      authenticated: false,
      error: 'Authentication failed'
    });
  }
});

// Test authentication page
router.get('/test', (req, res) => {
  res.render('auth-test', {
    title: 'Test Authentication',
    user: req.session.user || null
  });
});

module.exports = router;
