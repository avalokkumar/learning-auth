const express = require('express');
const router = express.Router();
const database = require('../database/Database');
const { requireAuth } = require('../middleware/auth');

// Login page
router.get('/login', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.render('login', {
    title: 'Login',
    error: req.query.error || null
  });
});

// Dashboard
router.get('/dashboard', requireAuth, (req, res) => {
  const stats = database.getStats();
  const tokens = database.getDecryptedTokens(req.user.id);
  res.render('dashboard', {
    title: 'Dashboard',
    stats,
    tokens
  });
});

// Profile
router.get('/profile', requireAuth, (req, res) => {
  const auditLogs = database.getUserAuditLogs(req.user.id, 20);
  const tokens = database.getDecryptedTokens(req.user.id);
  res.render('profile', {
    title: 'Profile',
    auditLogs,
    tokens
  });
});

// Features page
router.get('/features', (req, res) => {
  res.render('features', {
    title: 'OAuth Features'
  });
});

// Providers page
router.get('/providers', (req, res) => {
  res.render('providers', {
    title: 'OAuth Providers'
  });
});

// Tokens page
router.get('/tokens', requireAuth, (req, res) => {
  const tokens = database.getDecryptedTokens(req.user.id);
  const oauthSessions = database.getOAuthSessionsByUser(req.user.id);
  res.render('tokens', {
    title: 'Token Management',
    tokens,
    oauthSessions
  });
});

module.exports = router;
