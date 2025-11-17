const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const riskEngine = require('../services/riskEngine');

// Mock user database (in production, use a real database)
const users = new Map([
  ['demo', {
    id: '1',
    username: 'demo',
    password: bcrypt.hashSync('demo123', 10),
    email: 'demo@example.com',
    role: 'user'
  }],
  ['admin', {
    id: '2',
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    email: 'admin@example.com',
    role: 'admin'
  }]
]);

// GET /auth/login - Show login page
router.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('login', {
    title: 'Login',
    error: null,
    message: req.query.message || null
  });
});

// POST /auth/login - Process login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Get user
    const user = users.get(username);

    if (!user) {
      return res.render('login', {
        title: 'Login',
        error: 'Invalid username or password',
        message: null
      });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      // Record failed attempt
      const context = buildContext(req, user.id, 'login');
      riskEngine.recordLoginAttempt(user.id, false, context);

      return res.render('login', {
        title: 'Login',
        error: 'Invalid username or password',
        message: null
      });
    }

    // Build context for risk assessment
    const context = buildContext(req, user.id, 'login');

    // Calculate risk score
    const riskAssessment = await riskEngine.calculateRiskScore(context);

    // Record successful attempt
    riskEngine.recordLoginAttempt(user.id, true, context);

    // Store risk assessment in session
    req.session.riskAssessment = riskAssessment;
    req.session.deviceId = context.deviceId;

    // Handle based on risk level
    if (riskAssessment.recommendation.action === 'BLOCK') {
      return res.render('login', {
        title: 'Login',
        error: 'Access denied due to high security risk. Please contact support.',
        message: null
      });
    }

    if (riskAssessment.recommendation.action === 'CHALLENGE') {
      // Store pending auth info
      req.session.pendingAuth = {
        userId: user.id,
        username: user.username,
        requireMFA: true,
        mfaType: riskAssessment.recommendation.mfaType
      };

      return res.redirect('/auth/verify');
    }

    // Low risk - allow direct login
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.loginTime = Date.now();

    // Update user profile
    updateUserProfile(user.id, context);

    res.redirect('/dashboard');

  } catch (error) {
    console.error('Login error:', error);
    res.render('login', {
      title: 'Login',
      error: 'An error occurred during login',
      message: null
    });
  }
});

// GET /auth/verify - Show MFA verification page
router.get('/verify', (req, res) => {
  if (!req.session.pendingAuth) {
    return res.redirect('/auth/login');
  }

  res.render('verify', {
    title: 'Additional Verification Required',
    riskAssessment: req.session.riskAssessment,
    mfaType: req.session.pendingAuth.mfaType
  });
});

// POST /auth/verify - Process MFA verification
router.post('/verify', async (req, res) => {
  const { verificationCode } = req.body;

  if (!req.session.pendingAuth) {
    return res.redirect('/auth/login');
  }

  // Mock verification (in production, verify actual OTP/code)
  // Accept "123456" as valid code for demo
  if (verificationCode === '123456') {
    const user = Array.from(users.values()).find(u => u.id === req.session.pendingAuth.userId);

    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.loginTime = Date.now();
    req.session.mfaVerified = true;

    // Clear pending auth
    delete req.session.pendingAuth;

    // Update user profile
    const context = buildContext(req, user.id, 'mfa_verify');
    updateUserProfile(user.id, context);

    return res.redirect('/dashboard');
  }

  res.render('verify', {
    title: 'Additional Verification Required',
    riskAssessment: req.session.riskAssessment,
    mfaType: req.session.pendingAuth.mfaType,
    error: 'Invalid verification code. Try 123456 for demo.'
  });
});

// GET /auth/logout - Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/auth/login?message=You have been logged out successfully');
  });
});

// Helper: Build context for risk assessment
function buildContext(req, userId, action) {
  const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
  const userAgent = req.get('user-agent') || '';

  // Generate device fingerprint
  const deviceId = riskEngine.generateDeviceFingerprint(
    userAgent,
    req.get('accept-language') || '',
    req.get('accept-encoding') || ''
  );

  return {
    userId,
    ipAddress,
    userAgent,
    deviceId,
    action,
    session: req.session,
    timestamp: Date.now()
  };
}

// Helper: Update user profile with login data
function updateUserProfile(userId, context) {
  const profile = riskEngine.getUserProfile(userId) || {};

  // Add device if new
  if (!profile.knownDevices || !profile.knownDevices.includes(context.deviceId)) {
    const knownDevices = profile.knownDevices || [];
    knownDevices.push(context.deviceId);
    profile.knownDevices = knownDevices.slice(-5); // Keep last 5 devices
  }

  // Add location if new
  const geoip = require('geoip-lite');
  const geo = geoip.lookup(context.ipAddress);
  if (geo) {
    const knownLocations = profile.knownLocations || [];
    const locationExists = knownLocations.some(loc =>
      loc.country === geo.country && loc.city === geo.city
    );

    if (!locationExists) {
      knownLocations.push(geo);
      profile.knownLocations = knownLocations.slice(-5); // Keep last 5 locations
    }

    profile.lastLocation = geo;
    profile.lastLocationTime = Date.now();
  }

  // Track login hours
  const hour = new Date().getHours();
  const typicalLoginHours = profile.typicalLoginHours || [];
  if (!typicalLoginHours.includes(hour)) {
    typicalLoginHours.push(hour);
  }
  profile.typicalLoginHours = typicalLoginHours;

  // Increment login count
  profile.loginCount = (profile.loginCount || 0) + 1;

  riskEngine.updateUserProfile(userId, profile);
}

module.exports = router;
