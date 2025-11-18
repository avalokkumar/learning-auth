/**
 * API Routes - Demonstrates all HTTP authentication methods
 */

const express = require('express');
const router = express.Router();
const {
  basicAuth,
  digestAuth,
  bearerAuth,
  apiKeyAuth,
  multiAuth,
  optionalAuth
} = require('../middleware/authMiddleware');
const database = require('../database/Database');

// ============================================
// PUBLIC ENDPOINTS (No Auth Required)
// ============================================

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    stats: database.getStats()
  });
});

// ============================================
// BASIC AUTH ENDPOINTS
// ============================================

// Basic auth protected endpoint
router.get('/basic/user', basicAuth, (req, res) => {
  res.json({
    message: 'Authenticated with HTTP Basic Auth',
    authMethod: 'basic',
    user: req.user
  });
});

// Basic auth with role check
router.get('/basic/admin', basicAuth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  res.json({
    message: 'Admin access granted',
    authMethod: 'basic',
    user: req.user,
    allUsers: database.getAllUsers()
  });
});

// ============================================
// DIGEST AUTH ENDPOINTS
// ============================================

// Digest auth protected endpoint
router.get('/digest/user', digestAuth, (req, res) => {
  res.json({
    message: 'Authenticated with HTTP Digest Auth',
    authMethod: 'digest',
    user: req.user
  });
});

// Digest auth with role check
router.get('/digest/admin', digestAuth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  res.json({
    message: 'Admin access granted',
    authMethod: 'digest',
    user: req.user
  });
});

// ============================================
// BEARER TOKEN (JWT) ENDPOINTS
// ============================================

// Bearer token protected endpoint
router.get('/bearer/user', bearerAuth, (req, res) => {
  res.json({
    message: 'Authenticated with Bearer Token',
    authMethod: 'bearer',
    user: req.user,
    tokenPayload: req.tokenPayload
  });
});

// Bearer token with role check
router.get('/bearer/admin', bearerAuth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  res.json({
    message: 'Admin access granted',
    authMethod: 'bearer',
    user: req.user
  });
});

// ============================================
// API KEY ENDPOINTS
// ============================================

// API key protected endpoint
router.get('/apikey/user', apiKeyAuth, (req, res) => {
  res.json({
    message: 'Authenticated with API Key',
    authMethod: 'apikey',
    user: req.user,
    apiKeyInfo: req.apiKeyInfo
  });
});

// API key with role check
router.get('/apikey/admin', apiKeyAuth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  res.json({
    message: 'Admin access granted',
    authMethod: 'apikey',
    user: req.user
  });
});

// ============================================
// MULTI-AUTH ENDPOINTS (Accepts Multiple Methods)
// ============================================

// Accepts Basic OR Bearer auth
router.get('/user', multiAuth('basic', 'bearer', 'apikey'), (req, res) => {
  res.json({
    message: 'Authenticated successfully',
    authMethod: req.authMethod,
    user: req.user
  });
});

// Accepts any auth method
router.get('/profile', multiAuth('basic', 'digest', 'bearer', 'apikey'), (req, res) => {
  const fullUser = database.getUserById(req.user.id);
  const auditLogs = database.getUserAuditLogs(req.user.id, 10);
  
  res.json({
    message: 'Profile retrieved',
    authMethod: req.authMethod,
    user: {
      ...req.user,
      lastLogin: fullUser.lastLogin,
      loginCount: fullUser.stats.loginCount
    },
    recentActivity: auditLogs
  });
});

// ============================================
// OPTIONAL AUTH ENDPOINTS
// ============================================

// Public endpoint with optional auth
router.get('/public', optionalAuth, (req, res) => {
  res.json({
    message: 'Public endpoint (auth optional)',
    authenticated: !!req.user,
    authMethod: req.authMethod || 'none',
    user: req.user || null
  });
});

// ============================================
// DATA ENDPOINTS
// ============================================

// Get all users (admin only)
router.get('/users', multiAuth('basic', 'bearer', 'apikey'), (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const users = database.getAllUsers();
  res.json({ users });
});

// Get audit logs (admin only)
router.get('/audit', multiAuth('basic', 'bearer', 'apikey'), (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  const limit = parseInt(req.query.limit) || 100;
  const logs = database.getAuditLogs(limit);
  
  res.json({ logs });
});

// Get user's audit logs
router.get('/audit/me', multiAuth('basic', 'bearer', 'apikey'), (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const logs = database.getUserAuditLogs(req.user.id, limit);
  
  res.json({ logs });
});

// ============================================
// EXAMPLE CRUD ENDPOINTS
// ============================================

// Example resource - Protected with multiple auth methods
const resources = new Map();

// List resources
router.get('/resources', multiAuth('basic', 'bearer', 'apikey'), (req, res) => {
  const userResources = Array.from(resources.values())
    .filter(r => r.userId === req.user.id);
  
  res.json({ resources: userResources });
});

// Create resource
router.post('/resources', multiAuth('basic', 'bearer', 'apikey'), (req, res) => {
  const { name, data } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Resource name required' });
  }
  
  const resource = {
    id: require('uuid').v4(),
    userId: req.user.id,
    name,
    data: data || {},
    createdAt: new Date().toISOString()
  };
  
  resources.set(resource.id, resource);
  
  res.status(201).json(resource);
});

// Get resource
router.get('/resources/:id', multiAuth('basic', 'bearer', 'apikey'), (req, res) => {
  const resource = resources.get(req.params.id);
  
  if (!resource) {
    return res.status(404).json({ error: 'Resource not found' });
  }
  
  if (resource.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  res.json(resource);
});

// Update resource
router.put('/resources/:id', multiAuth('basic', 'bearer', 'apikey'), (req, res) => {
  const resource = resources.get(req.params.id);
  
  if (!resource) {
    return res.status(404).json({ error: 'Resource not found' });
  }
  
  if (resource.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const { name, data } = req.body;
  if (name) resource.name = name;
  if (data) resource.data = data;
  resource.updatedAt = new Date().toISOString();
  
  res.json(resource);
});

// Delete resource
router.delete('/resources/:id', multiAuth('basic', 'bearer', 'apikey'), (req, res) => {
  const resource = resources.get(req.params.id);
  
  if (!resource) {
    return res.status(404).json({ error: 'Resource not found' });
  }
  
  if (resource.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  resources.delete(req.params.id);
  
  res.json({ success: true });
});

module.exports = router;
