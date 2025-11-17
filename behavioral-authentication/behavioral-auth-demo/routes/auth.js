const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const behavioralEngine = require('../services/behavioralEngine');

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

// Login handler with behavioral data
router.post('/login', async (req, res) => {
  try {
    const { username, password, behavioralData } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    // Check user exists
    const user = users.get(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    // Parse behavioral data
    let parsedBehavioralData = {};
    if (behavioralData) {
      try {
        parsedBehavioralData = typeof behavioralData === 'string' 
          ? JSON.parse(behavioralData) 
          : behavioralData;
      } catch (e) {
        console.error('Failed to parse behavioral data:', e);
      }
    }

    // Check if user is in learning phase
    const isLearning = behavioralEngine.isLearningPhase(username);

    let confidenceAssessment = null;
    
    if (!isLearning && parsedBehavioralData.keystrokeData && parsedBehavioralData.keystrokeData.length > 0) {
      // Analyze behavioral data
      confidenceAssessment = await behavioralEngine.calculateConfidenceScore(
        parsedBehavioralData,
        username
      );
    }

    // Update user profile with behavioral data
    if (parsedBehavioralData.keystrokeData || parsedBehavioralData.mouseData) {
      behavioralEngine.updateUserProfile(username, parsedBehavioralData);
    }

    // Create session
    req.session.userId = username;
    req.session.username = user.username;
    req.session.fullName = user.fullName;
    req.session.email = user.email;
    req.session.loginTime = Date.now();
    req.session.isLearningPhase = isLearning;

    // Determine if additional verification is needed
    let requiresVerification = false;
    if (confidenceAssessment && confidenceAssessment.confidence === 'LOW' || 
        confidenceAssessment && confidenceAssessment.confidence === 'VERY_LOW') {
      requiresVerification = true;
    }

    res.json({
      success: true,
      redirect: '/dashboard',
      isLearningPhase: isLearning,
      confidenceAssessment,
      requiresVerification,
      message: isLearning ? 'Learning your behavior patterns...' : 'Login successful'
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

// Re-authentication endpoint for low confidence scenarios
router.post('/re-authenticate', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ success: false, error: 'Not logged in' });
  }

  try {
    const { password, behavioralData } = req.body;
    const user = users.get(req.session.userId);

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ success: false, error: 'Invalid password' });
    }

    // Parse and update behavioral data
    if (behavioralData) {
      const parsedData = typeof behavioralData === 'string' 
        ? JSON.parse(behavioralData) 
        : behavioralData;
      
      behavioralEngine.updateUserProfile(req.session.userId, parsedData);
    }

    // Mark as recently verified
    req.session.recentlyVerified = Date.now();

    res.json({
      success: true,
      message: 'Re-authentication successful'
    });

  } catch (error) {
    console.error('Re-authentication error:', error);
    res.status(500).json({ success: false, error: 'Re-authentication failed' });
  }
});

module.exports = router;
