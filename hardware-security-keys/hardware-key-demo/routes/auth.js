/**
 * Authentication Routes
 */
const express = require('express');
const router = express.Router();

// Registration page
router.get('/register', (req, res) => {
  if (req.session.authenticated) {
    return res.redirect('/dashboard');
  }
  
  res.render('register', {
    title: 'Register',
    user: null,
    error: null
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

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
    }
    res.redirect('/');
  });
});

// Check authentication status
router.get('/status', (req, res) => {
  res.json({
    authenticated: !!req.session.authenticated,
    user: req.session.user || null
  });
});

module.exports = router;
