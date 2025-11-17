const express = require('express');
const router = express.Router();
const behavioralEngine = require('../services/behavioralEngine');

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  next();
}

// Dashboard home
router.get('/', requireAuth, (req, res) => {
  const profile = behavioralEngine.getUserProfile(req.session.userId);
  const history = behavioralEngine.getBehavioralHistory(req.session.userId);
  const isLearning = behavioralEngine.isLearningPhase(req.session.userId);

  res.render('dashboard', {
    title: 'Dashboard',
    user: {
      username: req.session.username,
      fullName: req.session.fullName,
      email: req.session.email
    },
    profile,
    recentHistory: history.slice(-10).reverse(),
    isLearningPhase: isLearning,
    sessionsNeeded: isLearning ? (3 - profile.totalSessions) : 0
  });
});

// Profile page
router.get('/profile', requireAuth, (req, res) => {
  const profile = behavioralEngine.getUserProfile(req.session.userId);
  const history = behavioralEngine.getBehavioralHistory(req.session.userId);

  res.render('profile', {
    title: 'Profile',
    user: {
      username: req.session.username,
      fullName: req.session.fullName,
      email: req.session.email
    },
    profile,
    history: history.reverse(),
    loginTime: new Date(req.session.loginTime)
  });
});

// Behavioral analysis page
router.get('/analysis', requireAuth, (req, res) => {
  const profile = behavioralEngine.getUserProfile(req.session.userId);
  const history = behavioralEngine.getBehavioralHistory(req.session.userId);

  res.render('analysis', {
    title: 'Behavioral Analysis',
    user: {
      username: req.session.username,
      fullName: req.session.fullName
    },
    profile,
    history
  });
});

// Typing test page to build/test keystroke profile
router.get('/typing-test', requireAuth, (req, res) => {
  const profile = behavioralEngine.getUserProfile(req.session.userId);
  
  res.render('typing-test', {
    title: 'Typing Test',
    user: {
      username: req.session.username,
      fullName: req.session.fullName
    },
    profile
  });
});

// Mouse tracking test page
router.get('/mouse-test', requireAuth, (req, res) => {
  const profile = behavioralEngine.getUserProfile(req.session.userId);
  
  res.render('mouse-test', {
    title: 'Mouse Tracking Test',
    user: {
      username: req.session.username,
      fullName: req.session.fullName
    },
    profile
  });
});

// Touch test page (for mobile)
router.get('/touch-test', requireAuth, (req, res) => {
  const profile = behavioralEngine.getUserProfile(req.session.userId);
  
  res.render('touch-test', {
    title: 'Touch Gesture Test',
    user: {
      username: req.session.username,
      fullName: req.session.fullName
    },
    profile
  });
});

// Continuous monitoring demo page
router.get('/continuous-auth', requireAuth, (req, res) => {
  const profile = behavioralEngine.getUserProfile(req.session.userId);
  const history = behavioralEngine.getBehavioralHistory(req.session.userId);
  
  res.render('continuous-auth', {
    title: 'Continuous Authentication',
    user: {
      username: req.session.username,
      fullName: req.session.fullName
    },
    profile,
    recentHistory: history.slice(-5).reverse()
  });
});

// API: Get current behavioral stats
router.get('/api/stats', requireAuth, (req, res) => {
  const profile = behavioralEngine.getUserProfile(req.session.userId);
  const history = behavioralEngine.getBehavioralHistory(req.session.userId);

  res.json({
    profile: {
      totalSessions: profile.totalSessions,
      keystrokeSamples: profile.keystrokeDynamics.samples.length,
      mouseSamples: profile.mouseDynamics.samples.length,
      touchSamples: profile.touchDynamics.samples.length,
      lastUpdated: profile.lastUpdated
    },
    recentScores: history.slice(-10).map(h => ({
      timestamp: h.timestamp,
      score: h.score,
      confidence: h.confidence
    }))
  });
});

// API: Submit typing test results
router.post('/api/typing-test', requireAuth, async (req, res) => {
  try {
    const { behavioralData } = req.body;
    
    if (!behavioralData || !behavioralData.keystrokeData) {
      return res.status(400).json({ error: 'Invalid data' });
    }

    // Calculate confidence score
    const assessment = await behavioralEngine.calculateConfidenceScore(
      behavioralData,
      req.session.userId
    );

    // Update profile
    behavioralEngine.updateUserProfile(req.session.userId, behavioralData);

    res.json({
      success: true,
      assessment
    });

  } catch (error) {
    console.error('Typing test error:', error);
    res.status(500).json({ error: 'Test submission failed' });
  }
});

// API: Submit mouse test results
router.post('/api/mouse-test', requireAuth, async (req, res) => {
  try {
    const { behavioralData } = req.body;
    
    if (!behavioralData || !behavioralData.mouseData) {
      return res.status(400).json({ error: 'Invalid data' });
    }

    // Calculate confidence score
    const assessment = await behavioralEngine.calculateConfidenceScore(
      behavioralData,
      req.session.userId
    );

    // Update profile
    behavioralEngine.updateUserProfile(req.session.userId, behavioralData);

    res.json({
      success: true,
      assessment
    });

  } catch (error) {
    console.error('Mouse test error:', error);
    res.status(500).json({ error: 'Test submission failed' });
  }
});

module.exports = router;
