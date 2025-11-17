const express = require('express');
const router = express.Router();
const riskEngine = require('../services/riskEngine');

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  next();
}

// Risk assessment middleware
function assessRisk(action) {
  return async (req, res, next) => {
    try {
      const context = {
        userId: req.session.userId,
        ipAddress: req.ip || req.connection.remoteAddress || '127.0.0.1',
        userAgent: req.get('user-agent') || '',
        deviceId: req.session.deviceId,
        action,
        session: req.session,
        timestamp: Date.now()
      };

      const riskAssessment = await riskEngine.calculateRiskScore(context);
      req.riskAssessment = riskAssessment;

      // Check if step-up auth required
      if (riskAssessment.recommendation.action === 'BLOCK') {
        return res.render('blocked', {
          title: 'Access Denied',
          riskAssessment
        });
      }

      if (riskAssessment.recommendation.action === 'CHALLENGE' &&
          !req.session.recentlyVerified) {
        req.session.returnTo = req.originalUrl;
        return res.redirect('/dashboard/stepup');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Dashboard home
router.get('/', requireAuth, async (req, res) => {
  const context = {
    userId: req.session.userId,
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.get('user-agent') || '',
    deviceId: req.session.deviceId,
    action: 'view_dashboard',
    session: req.session
  };

  const riskAssessment = await riskEngine.calculateRiskScore(context);

  res.render('dashboard', {
    title: 'Dashboard',
    username: req.session.username,
    role: req.session.role,
    riskAssessment,
    loginTime: new Date(req.session.loginTime)
  });
});

// Profile page
router.get('/profile', requireAuth, assessRisk('view_profile'), (req, res) => {
  const profile = riskEngine.getUserProfile(req.session.userId) || {};

  res.render('profile', {
    title: 'Profile',
    username: req.session.username,
    role: req.session.role,
    profile,
    riskAssessment: req.riskAssessment
  });
});

// Settings page (sensitive operation)
router.get('/settings', requireAuth, assessRisk('view_settings'), (req, res) => {
  res.render('settings', {
    title: 'Settings',
    username: req.session.username,
    riskAssessment: req.riskAssessment,
    message: req.query.message || null
  });
});

// Change email (sensitive operation)
router.post('/settings/email', requireAuth, assessRisk('change_email'), async (req, res) => {
  const { newEmail } = req.body;

  // Simulate email change
  console.log(`Email change requested for user ${req.session.username}: ${newEmail}`);

  res.redirect('/dashboard/settings?message=Email change request processed (demo mode)');
});

// Change password (sensitive operation)
router.post('/settings/password', requireAuth, assessRisk('change_password'), async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Simulate password change
  console.log(`Password change requested for user ${req.session.username}`);

  res.redirect('/dashboard/settings?message=Password changed successfully (demo mode)');
});

// Transfer funds (high-risk operation)
router.get('/transfer', requireAuth, assessRisk('view_transfer'), (req, res) => {
  res.render('transfer', {
    title: 'Transfer Funds',
    username: req.session.username,
    riskAssessment: req.riskAssessment,
    message: req.query.message || null
  });
});

router.post('/transfer', requireAuth, assessRisk('transfer'), async (req, res) => {
  const { recipient, amount } = req.body;

  // Log transfer attempt
  console.log(`Transfer request: ${req.session.username} -> ${recipient}: $${amount}`);
  console.log(`Risk Score: ${req.riskAssessment.score} (${req.riskAssessment.level})`);

  res.redirect('/dashboard/transfer?message=Transfer processed (demo mode)');
});

// Step-up authentication page
router.get('/stepup', requireAuth, (req, res) => {
  res.render('stepup', {
    title: 'Additional Verification Required',
    username: req.session.username,
    returnTo: req.session.returnTo || '/dashboard'
  });
});

router.post('/stepup', requireAuth, async (req, res) => {
  const { verificationCode } = req.body;

  // Accept "123456" for demo
  if (verificationCode === '123456') {
    req.session.recentlyVerified = true;
    req.session.verifiedAt = Date.now();

    // Clear verification after 5 minutes
    setTimeout(() => {
      delete req.session.recentlyVerified;
    }, 5 * 60 * 1000);

    const returnTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;

    return res.redirect(returnTo);
  }

  res.render('stepup', {
    title: 'Additional Verification Required',
    username: req.session.username,
    returnTo: req.session.returnTo || '/dashboard',
    error: 'Invalid verification code. Try 123456 for demo.'
  });
});

// Risk analysis page
router.get('/risk-analysis', requireAuth, async (req, res) => {
  const context = {
    userId: req.session.userId,
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.get('user-agent') || '',
    deviceId: req.session.deviceId,
    action: 'view_risk_analysis',
    session: req.session
  };

  const riskAssessment = await riskEngine.calculateRiskScore(context);
  const profile = riskEngine.getUserProfile(req.session.userId) || {};
  const loginAttempts = riskEngine.getLoginAttempts(req.session.userId);

  res.render('risk-analysis', {
    title: 'Risk Analysis',
    username: req.session.username,
    riskAssessment,
    profile,
    loginAttempts: loginAttempts.slice(-10), // Last 10 attempts
    geoip: require('geoip-lite').lookup(context.ipAddress)
  });
});

// API endpoint for real-time risk check
router.get('/api/risk-check', requireAuth, async (req, res) => {
  const context = {
    userId: req.session.userId,
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.get('user-agent') || '',
    deviceId: req.session.deviceId,
    action: req.query.action || 'api_check',
    session: req.session
  };

  const riskAssessment = await riskEngine.calculateRiskScore(context);

  res.json({
    success: true,
    riskAssessment
  });
});

module.exports = router;
