const express = require('express');
const router = express.Router();
const database = require('../database/Database');

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

// Login POST
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
  
  // Check if MFA is enabled
  if (user.mfaEnabled) {
    // Create MFA session
    const mfaSession = database.createMFASession(user.id);
    
    return res.json({
      requiresMFA: true,
      mfaSessionId: mfaSession.id,
      availableMethods: database.getMFAMethodsByUser(user.id).map(m => m.type)
    });
  }
  
  // No MFA - complete login
  database.recordLogin(user.id);
  const session = database.createSession(user.id);
  
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
  
  res.json({ success: true, user: req.session.user });
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

module.exports = router;
