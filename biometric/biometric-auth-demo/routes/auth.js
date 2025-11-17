const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Demo users (in production, use a real database)
const users = new Map([
  ['demo', {
    username: 'demo',
    password: bcrypt.hashSync('demo123', 10),
    email: 'demo@example.com',
    fullName: 'Demo User',
    createdAt: Date.now()
  }],
  ['admin', {
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    email: 'admin@example.com',
    fullName: 'Admin User',
    createdAt: Date.now()
  }]
]);

// Login page
router.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }

  res.render('login', {
    title: 'Login',
    error: req.query.error,
    message: req.query.message
  });
});

// Traditional login (password-based)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    const user = users.get(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Create session
    req.session.userId = username;
    req.session.username = user.username;
    req.session.fullName = user.fullName;
    req.session.email = user.email;
    req.session.loginTime = Date.now();
    req.session.authMethod = 'password';

    res.json({
      success: true,
      redirect: '/dashboard',
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during login'
    });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

module.exports = router;
