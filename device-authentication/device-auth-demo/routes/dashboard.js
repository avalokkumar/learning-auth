/**
 * Dashboard Routes
 * Main dashboard and overview pages
 */

const express = require('express');
const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  next();
};

// Main dashboard
router.get('/', requireAuth, (req, res) => {
  const deviceRegistry = req.app.locals.deviceRegistry;
  const serviceAccountRegistry = req.app.locals.serviceAccountRegistry;
  
  const deviceStats = deviceRegistry.getStats();
  const saStats = serviceAccountRegistry.getStats();
  
  // Get recent devices
  const recentDevices = deviceRegistry.getAll()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
  
  // Get active service accounts
  const activeServiceAccounts = serviceAccountRegistry.getActive().slice(0, 5);
  
  res.render('dashboard', {
    title: 'Dashboard',
    user: req.session.user,
    deviceStats,
    saStats,
    recentDevices,
    activeServiceAccounts
  });
});

// Device fingerprinting demo
router.get('/fingerprint', requireAuth, (req, res) => {
  const DeviceFingerprintService = require('../services/fingerprintService');
  const fingerprintService = new DeviceFingerprintService();
  
  const fingerprint = fingerprintService.generateFingerprint(req);
  const deviceInfo = fingerprintService.getDeviceInfo(fingerprint);
  
  res.render('fingerprint-demo', {
    title: 'Device Fingerprinting',
    user: req.session.user,
    fingerprint,
    deviceInfo
  });
});

// API Key management
router.get('/api-keys', requireAuth, (req, res) => {
  const deviceRegistry = req.app.locals.deviceRegistry;
  const serviceAccountRegistry = req.app.locals.serviceAccountRegistry;
  
  // Get devices with API keys
  const devicesWithKeys = deviceRegistry.getAll().filter(d => d.authMethods.apiKey);
  
  // Get service accounts
  const serviceAccounts = serviceAccountRegistry.getAll();
  
  res.render('api-keys', {
    title: 'API Key Management',
    user: req.session.user,
    devices: devicesWithKeys,
    serviceAccounts
  });
});

// Device trust levels overview
router.get('/trust-levels', requireAuth, (req, res) => {
  const deviceRegistry = req.app.locals.deviceRegistry;
  const stats = deviceRegistry.getStats();
  
  const devicesByTrust = {
    unknown: deviceRegistry.getByTrustLevel('unknown'),
    registered: deviceRegistry.getByTrustLevel('registered'),
    verified: deviceRegistry.getByTrustLevel('verified'),
    trusted: deviceRegistry.getByTrustLevel('trusted')
  };
  
  res.render('trust-levels', {
    title: 'Device Trust Levels',
    user: req.session.user,
    stats,
    devicesByTrust
  });
});

// mTLS simulator
router.get('/mtls-demo', requireAuth, (req, res) => {
  res.render('mtls-demo', {
    title: 'mTLS Connection Simulator',
    user: req.session.user
  });
});

// Service-to-Service auth demo
router.get('/m2m-demo', requireAuth, (req, res) => {
  const serviceAccountRegistry = req.app.locals.serviceAccountRegistry;
  const serviceAccounts = serviceAccountRegistry.getActive();
  
  res.render('m2m-demo', {
    title: 'Machine-to-Machine Authentication',
    user: req.session.user,
    serviceAccounts
  });
});

module.exports = router;
