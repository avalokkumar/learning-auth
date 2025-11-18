/**
 * Web Routes - UI Pages
 */
const express = require('express');
const router = express.Router();
const { sessionAuth } = require('../middleware/authMiddleware');
const database = require('../database/Database');

// Home page
router.get('/', (req, res) => {
  const stats = database.getStats();
  res.render('index', {
    title: 'HTTP Authentication Demo',
    user: req.session.user || null,
    stats
  });
});

// Login page
router.get('/login', (req, res) => {
  if (req.session.authenticated) {
    return res.redirect('/dashboard');
  }
  
  res.render('login', {
    title: 'Login',
    user: null,
    error: null
  });
});

// Dashboard (requires login)
router.get('/dashboard', sessionAuth, (req, res) => {
  const stats = database.getStats();
  const userStats = database.getUserById(req.session.userId);
  
  res.render('dashboard', {
    title: 'Dashboard',
    user: req.session.user,
    userStats,
    stats
  });
});

// Profile page
router.get('/profile', sessionAuth, (req, res) => {
  const user = database.getUserById(req.session.userId);
  const auditLogs = database.getUserAuditLogs(req.session.userId, 20);
  
  res.render('profile', {
    title: 'Profile',
    user: req.session.user,
    fullUser: user,
    auditLogs
  });
});

// API Keys management page
router.get('/api-keys', sessionAuth, (req, res) => {
  const apiKeys = database.getApiKeysByUser(req.session.userId);
  
  res.render('api-keys', {
    title: 'API Keys',
    user: req.session.user,
    apiKeys
  });
});

// Authentication methods demo page
router.get('/auth-demo', sessionAuth, (req, res) => {
  res.render('auth-demo', {
    title: 'Authentication Methods Demo',
    user: req.session.user
  });
});

// Documentation page
router.get('/docs', (req, res) => {
  res.render('docs', {
    title: 'API Documentation',
    user: req.session.user || null
  });
});

module.exports = router;
