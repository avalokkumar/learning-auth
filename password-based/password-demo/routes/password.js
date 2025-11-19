const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const database = require('../database/Database');
const passwordService = require('../services/passwordService');
const { requireAuth } = require('../middleware/auth');

// ============================================
// PASSWORD CHANGE
// ============================================

router.post('/change', requireAuth, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }),
  body('confirmPassword').custom((value, { req }) => value === req.body.newPassword)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    // Verify current password
    const isValid = await passwordService.verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Validate new password
    const validation = await passwordService.validatePassword(newPassword, user.id);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors[0], warnings: validation.warnings });
    }

    // Hash new password
    const { hash, salt } = await passwordService.hashPassword(newPassword);

    // Update password
    database.updatePassword(user.id, hash, salt);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

// ============================================
// PASSWORD STRENGTH CHECK
// ============================================

router.post('/strength', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    const strength = passwordService.getPasswordStrength(password);
    res.json(strength);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check password strength' });
  }
});

// ============================================
// PASSWORD VALIDATION
// ============================================

router.post('/validate', async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user?.id;

    const validation = await passwordService.validatePassword(password, userId);
    res.json(validation);
  } catch (error) {
    res.status(500).json({ error: 'Validation failed' });
  }
});

// ============================================
// GENERATE STRONG PASSWORD
// ============================================

router.get('/generate', (req, res) => {
  try {
    const length = parseInt(req.query.length) || 16;
    const password = passwordService.generateStrongPassword(length);
    const strength = passwordService.getPasswordStrength(password);
    
    res.json({ password, strength });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate password' });
  }
});

module.exports = router;
