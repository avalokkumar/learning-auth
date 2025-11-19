const express = require('express');
const router = express.Router();
const passport = require('../config/passport');

// Google OAuth
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  accessType: 'offline',
  prompt: 'consent'
}));

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=google_auth_failed' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

// Microsoft OAuth
router.get('/microsoft', passport.authenticate('microsoft', {
  scope: ['user.read', 'openid', 'profile', 'email']
}));

router.get('/microsoft/callback',
  passport.authenticate('microsoft', { failureRedirect: '/login?error=microsoft_auth_failed' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

// GitHub OAuth
router.get('/github', passport.authenticate('github', {
  scope: ['user:email', 'read:user']
}));

router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/login?error=github_auth_failed' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Session destruction failed' });
      }
      res.json({ success: true });
    });
  });
});

router.get('/logout', (req, res) => {
  req.logout((err) => {
    req.session.destroy(() => {
      res.redirect('/');
    });
  });
});

module.exports = router;
