/**
 * Authentication Routes
 */
const express = require('express');
const router = express.Router();
const database = require('../database/Database');
const bearerAuthService = require('../services/bearerAuthService');
const apiKeyService = require('../services/apiKeyService');

// Login with username/password
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  const user = database.getUserByUsername(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const isValid = await database.verifyPassword(user, password);
  if (!isValid) {
    database.recordFailedLogin(user.id);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  database.recordLogin(user.id);
  
  // Create session
  const session = database.createSession(user.id, 'password');
  req.session.authenticated = true;
  req.session.userId = user.id;
  req.session.sessionId = session.id;
  req.session.user = {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    role: user.role
  };
  
  res.json({
    success: true,
    user: req.session.user
  });
});

// Logout
router.post('/logout', (req, res) => {
  if (req.session.sessionId) {
    database.deleteSession(req.session.sessionId);
  }
  
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

// Get token (for Bearer auth)
router.post('/token', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  const user = database.getUserByUsername(username);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const isValid = await database.verifyPassword(user, password);
  if (!isValid) {
    database.recordFailedLogin(user.id);
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  database.recordLogin(user.id);
  
  const tokens = bearerAuthService.generateTokens(user);
  
  res.json(tokens);
});

// Refresh token
router.post('/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  
  if (!refresh_token) {
    return res.status(400).json({ error: 'Refresh token required' });
  }
  
  const result = await bearerAuthService.refreshAccessToken(refresh_token);
  
  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }
  
  res.json(result.tokens);
});

// Generate API key
router.post('/api-key', async (req, res) => {
  if (!req.session.authenticated) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'API key name required' });
  }
  
  const apiKey = await apiKeyService.generateApiKey(req.session.userId, name);
  
  res.json({
    success: true,
    apiKey: apiKey.apiKey, // Full key shown only once
    id: apiKey.id,
    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix
  });
});

// Revoke API key
router.delete('/api-key/:id', (req, res) => {
  if (!req.session.authenticated) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  apiKeyService.revokeApiKey(req.params.id);
  
  res.json({ success: true });
});

module.exports = router;
