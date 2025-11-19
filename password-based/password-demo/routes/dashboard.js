const express = require('express');
const router = express.Router();
const database = require('../database/Database');
const passwordService = require('../services/passwordService');
const { requireAuth, requireNoAuth } = require('../middleware/auth');

// Login page
router.get('/login', requireNoAuth, (req, res) => {
  res.render('login', {
    title: 'Login',
    error: req.query.error || null
  });
});

// Register page
router.get('/register', requireNoAuth, (req, res) => {
  res.render('register', {
    title: 'Register'
  });
});

// Dashboard
router.get('/dashboard', requireAuth, (req, res) => {
  const stats = database.getStats();
  const daysUntilExpiry = passwordService.daysUntilExpiry(req.user);
  
  res.render('dashboard', {
    title: 'Dashboard',
    stats,
    daysUntilExpiry
  });
});

// Profile
router.get('/profile', requireAuth, (req, res) => {
  const auditLogs = database.getUserAuditLogs(req.user.id, 20);
  const trustedDevices = database.getTrustedDevices(req.user.id);
  const passwordHistory = database.getPasswordHistory(req.user.id);
  
  res.render('profile', {
    title: 'Profile',
    auditLogs,
    trustedDevices,
    passwordHistory
  });
});

// Password management page
router.get('/password-management', requireAuth, (req, res) => {
  const daysUntilExpiry = passwordService.daysUntilExpiry(req.user);
  const passwordExpired = passwordService.isPasswordExpired(req.user);
  
  res.render('password-management', {
    title: 'Password Management',
    daysUntilExpiry,
    passwordExpired
  });
});

// Features page
router.get('/features', (req, res) => {
  res.render('features', {
    title: 'Features'
  });
});

// Security page
router.get('/security', requireAuth, (req, res) => {
  res.render('security', {
    title: 'Security Settings'
  });
});

module.exports = router;
