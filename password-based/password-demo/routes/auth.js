const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const database = require('../database/Database');
const passwordService = require('../services/passwordService');
const { requireNoAuth } = require('../middleware/auth');

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again after 15 minutes'
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Too many registration attempts, please try again after an hour'
});

// ============================================
// PASSWORD-BASED REGISTRATION
// ============================================

router.post('/register', requireNoAuth, registerLimiter, [
  body('username').trim().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('confirmPassword').custom((value, { req }) => value === req.body.password)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, firstName, lastName } = req.body;

    // Check if user already exists
    if (database.getUserByUsername(username)) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    if (database.getUserByEmail(email)) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Validate password
    const validation = await passwordService.validatePassword(password);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors[0] });
    }

    // Hash password
    const { hash, salt } = await passwordService.hashPassword(password);

    // Create user
    const user = database.createUser({
      username,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      firstName: firstName || '',
      lastName: lastName || ''
    });

    // Auto login after registration
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Registration successful but login failed' });
      }
      res.json({ success: true, redirect: '/dashboard' });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ============================================
// PASSWORD-BASED LOGIN
// ============================================

router.post('/login', requireNoAuth, loginLimiter, [
  body('username').trim().notEmpty(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const { username, password } = req.body;
    const ipAddress = req.ip;

    // Find user
    const user = database.getUserByUsername(username) || database.getUserByEmail(username);
    if (!user) {
      database.recordFailedAttempt(username, ipAddress);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is locked
    if (database.isAccountLocked(user.id)) {
      return res.status(423).json({ error: 'Account is locked. Please try again later or contact support.' });
    }

    // Verify password
    const isValid = await passwordService.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      database.recordFailedAttempt(user.id, ipAddress);
      user.stats.failedLoginCount++;
      user.stats.lastFailedLogin = new Date().toISOString();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if password expired
    if (passwordService.isPasswordExpired(user)) {
      user.requirePasswordChange = true;
      return res.status(403).json({ 
        error: 'Password expired', 
        requirePasswordChange: true,
        userId: user.id
      });
    }

    // Clear failed attempts
    database.clearFailedAttempts(user.id, ipAddress);

    // Create session
    database.createSession(user.id, {
      ipAddress,
      userAgent: req.get('user-agent')
    });

    // Login user
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Login failed' });
      }

      // Check password expiry warning
      const daysLeft = passwordService.daysUntilExpiry(user);
      let warning = null;
      if (daysLeft && daysLeft <= 7) {
        warning = `Your password will expire in ${daysLeft} days`;
      }

      res.json({ success: true, redirect: '/dashboard', warning });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ============================================
// OAUTH ROUTES
// ============================================

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=google_failed' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

// GitHub OAuth
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/login?error=github_failed' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

// ============================================
// LOGOUT
// ============================================

router.post('/logout', (req, res) => {
  const userId = req.user?.id;
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    if (userId) {
      database.deleteAllUserSessions(userId);
    }
    req.session.destroy((err) => {
      res.json({ success: true });
    });
  });
});

router.get('/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.redirect('/');
    });
  });
});

module.exports = router;
