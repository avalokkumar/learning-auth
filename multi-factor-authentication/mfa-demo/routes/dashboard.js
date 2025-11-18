const express = require('express');
const router = express.Router();
const database = require('../database/Database');

// Middleware
const requireAuth = (req, res, next) => {
  if (!req.session.authenticated) {
    return res.redirect('/auth/login');
  }
  next();
};

// Dashboard
router.get('/', requireAuth, (req, res) => {
  const user = database.getUserById(req.session.userId);
  const stats = database.getStats();
  const mfaMethods = database.getMFAMethodsByUser(user.id);
  
  res.render('dashboard', {
    title: 'Dashboard',
    user: req.session.user,
    fullUser: user,
    mfaMethods,
    stats
  });
});

// Profile
router.get('/profile', requireAuth, (req, res) => {
  const user = database.getUserById(req.session.userId);
  const auditLogs = database.getUserAuditLogs(user.id, 20);
  
  res.render('profile', {
    title: 'Profile',
    user: req.session.user,
    fullUser: user,
    auditLogs
  });
});

// MFA Settings
router.get('/mfa-settings', requireAuth, (req, res) => {
  const user = database.getUserById(req.session.userId);
  const mfaMethods = database.getMFAMethodsByUser(user.id);
  const backupCodesCount = database.getBackupCodesCount(user.id);
  
  res.render('mfa-settings', {
    title: 'MFA Settings',
    user: req.session.user,
    fullUser: user,
    mfaMethods,
    backupCodesCount
  });
});

// Features page
router.get('/features', requireAuth, (req, res) => {
  res.render('features', {
    title: 'MFA Features',
    user: req.session.user
  });
});

module.exports = router;
