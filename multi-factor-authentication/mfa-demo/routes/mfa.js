const express = require('express');
const router = express.Router();
const database = require('../database/Database');
const totpService = require('../services/totpService');
const otpService = require('../services/otpService');

// Middleware to require authentication
const requireAuth = (req, res, next) => {
  if (!req.session.authenticated) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// ============================================
// MFA VERIFICATION (During Login)
// ============================================

// Verify MFA during login
router.post('/verify', async (req, res) => {
  const { mfaSessionId, method, code } = req.body;
  
  const mfaSession = database.getMFASession(mfaSessionId);
  if (!mfaSession) {
    return res.status(401).json({ error: 'MFA session expired' });
  }
  
  const user = database.getUserById(mfaSession.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  let verified = false;
  
  // Verify based on method
  if (method === 'totp') {
    const totpMethod = database.getMFAMethod(user.id, 'totp');
    if (!totpMethod) {
      return res.status(400).json({ error: 'TOTP not enrolled' });
    }
    
    verified = totpService.verifyToken(totpMethod.secret, code);
    if (verified) {
      database.updateMFAMethodUsage(totpMethod.id);
    }
  } else if (method === 'sms' || method === 'email') {
    const result = otpService.verifyOTP(user.id, code, method);
    verified = result.success;
    
    if (!verified) {
      database.recordFailedMFA(user.id);
      return res.status(401).json({ error: result.error });
    }
  } else if (method === 'backup') {
    const result = database.verifyBackupCode(user.id, code);
    verified = result.success;
    
    if (!verified) {
      return res.status(401).json({ error: result.error });
    }
  }
  
  if (!verified) {
    database.recordFailedMFA(user.id);
    return res.status(401).json({ error: 'Invalid code' });
  }
  
  // MFA verified - complete login
  database.completeMFASession(mfaSessionId);
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
  
  // Clean up MFA session
  database.deleteMFASession(mfaSessionId);
  
  res.json({ success: true, user: req.session.user });
});

// Request OTP (SMS or Email)
router.post('/request-otp', async (req, res) => {
  const { mfaSessionId, method } = req.body;
  
  const mfaSession = database.getMFASession(mfaSessionId);
  if (!mfaSession) {
    return res.status(401).json({ error: 'MFA session expired' });
  }
  
  const user = database.getUserById(mfaSession.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  try {
    if (method === 'sms') {
      await otpService.sendSMSOTP(user.id, user.phone);
    } else if (method === 'email') {
      await otpService.sendEmailOTP(user.id, user.email);
    } else {
      return res.status(400).json({ error: 'Invalid OTP method' });
    }
    
    res.json({ success: true, message: 'OTP sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// ============================================
// MFA ENROLLMENT
// ============================================

// Enroll TOTP
router.post('/enroll/totp', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Check if already enrolled
    const existing = database.getMFAMethod(userId, 'totp');
    if (existing) {
      return res.status(400).json({ error: 'TOTP already enrolled' });
    }
    
    const user = database.getUserById(userId);
    const { secret, otpauth_url } = totpService.generateSecret(user.username);
    const qrCode = await totpService.generateQRCode(otpauth_url);
    
    // Store temporarily in session for verification
    req.session.totpEnrollment = { secret, otpauth_url };
    
    res.json({
      secret,
      qrCode,
      manualEntry: secret
    });
  } catch (error) {
    console.error('TOTP enrollment error:', error);
    res.status(500).json({ error: 'Failed to enroll TOTP: ' + error.message });
  }
});

// Verify and complete TOTP enrollment
router.post('/enroll/totp/verify', requireAuth, async (req, res) => {
  const { code } = req.body;
  const userId = req.session.userId;
  
  if (!req.session.totpEnrollment) {
    return res.status(400).json({ error: 'No enrollment in progress' });
  }
  
  const { secret } = req.session.totpEnrollment;
  const verified = totpService.verifyToken(secret, code);
  
  if (!verified) {
    return res.status(401).json({ error: 'Invalid code' });
  }
  
  // Save MFA method
  database.enrollMFAMethod(userId, {
    type: 'totp',
    data: { secret }
  });
  
  // Update user MFA status
  database.updateUserMFAStatus(userId, true, 'totp');
  
  // Clean up session
  delete req.session.totpEnrollment;
  
  res.json({ success: true, message: 'TOTP enrolled successfully' });
});

// Enroll SMS
router.post('/enroll/sms', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = database.getUserById(userId);
    
    if (!user.phone) {
      return res.status(400).json({ error: 'No phone number on file' });
    }
    
    // Send verification OTP
    await otpService.sendSMSOTP(userId, user.phone);
    
    res.json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    console.error('SMS enrollment error:', error);
    res.status(500).json({ error: 'Failed to send SMS: ' + error.message });
  }
});

// Verify and complete SMS enrollment
router.post('/enroll/sms/verify', requireAuth, async (req, res) => {
  const { code } = req.body;
  const userId = req.session.userId;
  
  const result = otpService.verifyOTP(userId, code, 'sms');
  
  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }
  
  // Save MFA method
  database.enrollMFAMethod(userId, {
    type: 'sms',
    data: {}
  });
  
  // Update user MFA status if not already set
  const user = database.getUserById(userId);
  if (!user.mfaEnabled) {
    database.updateUserMFAStatus(userId, true, 'sms');
  }
  
  res.json({ success: true, message: 'SMS OTP enrolled successfully' });
});

// Enroll Email (similar to SMS)
router.post('/enroll/email', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = database.getUserById(userId);
    
    await otpService.sendEmailOTP(userId, user.email);
    
    res.json({ success: true, message: 'Verification code sent to email' });
  } catch (error) {
    console.error('Email enrollment error:', error);
    res.status(500).json({ error: 'Failed to send email: ' + error.message });
  }
});

router.post('/enroll/email/verify', requireAuth, async (req, res) => {
  const { code } = req.body;
  const userId = req.session.userId;
  
  const result = otpService.verifyOTP(userId, code, 'email');
  
  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }
  
  database.enrollMFAMethod(userId, {
    type: 'email',
    data: {}
  });
  
  const user = database.getUserById(userId);
  if (!user.mfaEnabled) {
    database.updateUserMFAStatus(userId, true, 'email');
  }
  
  res.json({ success: true, message: 'Email OTP enrolled successfully' });
});

// Generate backup codes
router.post('/backup-codes/generate', requireAuth, (req, res) => {
  const userId = req.session.userId;
  
  const codes = database.generateBackupCodes(userId);
  
  res.json({
    success: true,
    codes: codes.map(c => c.code)
  });
});

// Get backup codes count
router.get('/backup-codes/count', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const count = database.getBackupCodesCount(userId);
  
  res.json({ count });
});

// Disable MFA method
router.post('/disable/:type', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { type } = req.params;
  
  const method = database.getMFAMethod(userId, type);
  if (!method) {
    return res.status(404).json({ error: 'Method not found' });
  }
  
  database.disableMFAMethod(method.id);
  
  // Check if any methods remain
  const remainingMethods = database.getMFAMethodsByUser(userId);
  if (remainingMethods.length === 0) {
    database.updateUserMFAStatus(userId, false, null);
  }
  
  res.json({ success: true });
});

module.exports = router;
