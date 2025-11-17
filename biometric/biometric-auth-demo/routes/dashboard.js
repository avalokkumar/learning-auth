const express = require('express');
const router = express.Router();
const BiometricEngine = require('../services/biometricEngine');

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  next();
}

// Dashboard home
router.get('/', requireAuth, (req, res) => {
  const enrollmentStatus = BiometricEngine.getEnrollmentStatus(req.session.userId);
  const authHistory = BiometricEngine.getAuthHistory(req.session.userId);

  res.render('dashboard', {
    title: 'Dashboard',
    user: {
      username: req.session.username,
      fullName: req.session.fullName,
      email: req.session.email
    },
    enrollmentStatus,
    recentHistory: authHistory.slice(-5).reverse(),
    authMethod: req.session.authMethod || 'password'
  });
});

// Profile page
router.get('/profile', requireAuth, (req, res) => {
  const enrollmentStatus = BiometricEngine.getEnrollmentStatus(req.session.userId);
  const authHistory = BiometricEngine.getAuthHistory(req.session.userId);

  res.render('profile', {
    title: 'Profile',
    user: {
      username: req.session.username,
      fullName: req.session.fullName,
      email: req.session.email,
      loginTime: new Date(req.session.loginTime)
    },
    enrollmentStatus,
    authHistory: authHistory.reverse()
  });
});

// Fingerprint page
router.get('/fingerprint', requireAuth, (req, res) => {
  const enrollmentStatus = BiometricEngine.getEnrollmentStatus(req.session.userId);
  
  res.render('fingerprint', {
    title: 'Fingerprint Authentication',
    user: {
      username: req.session.username,
      fullName: req.session.fullName
    },
    enrolled: enrollmentStatus.biometrics.fingerprint.enrolled
  });
});

// Face recognition page
router.get('/face', requireAuth, (req, res) => {
  const enrollmentStatus = BiometricEngine.getEnrollmentStatus(req.session.userId);
  
  res.render('face', {
    title: 'Face Recognition',
    user: {
      username: req.session.username,
      fullName: req.session.fullName
    },
    enrolled: enrollmentStatus.biometrics.face.enrolled
  });
});

// Iris scan page
router.get('/iris', requireAuth, (req, res) => {
  const enrollmentStatus = BiometricEngine.getEnrollmentStatus(req.session.userId);
  
  res.render('iris', {
    title: 'Iris Scanning',
    user: {
      username: req.session.username,
      fullName: req.session.fullName
    },
    enrolled: enrollmentStatus.biometrics.iris.enrolled
  });
});

// Voice recognition page
router.get('/voice', requireAuth, (req, res) => {
  const enrollmentStatus = BiometricEngine.getEnrollmentStatus(req.session.userId);
  
  res.render('voice', {
    title: 'Voice Recognition',
    user: {
      username: req.session.username,
      fullName: req.session.fullName
    },
    enrolled: enrollmentStatus.biometrics.voice.enrolled
  });
});

// Multi-modal authentication page
router.get('/multi-modal', requireAuth, (req, res) => {
  const enrollmentStatus = BiometricEngine.getEnrollmentStatus(req.session.userId);
  
  res.render('multi-modal', {
    title: 'Multi-Modal Authentication',
    user: {
      username: req.session.username,
      fullName: req.session.fullName
    },
    enrollmentStatus
  });
});

// Enrollment center
router.get('/enrollment', requireAuth, (req, res) => {
  const enrollmentStatus = BiometricEngine.getEnrollmentStatus(req.session.userId);
  
  res.render('enrollment', {
    title: 'Enrollment Center',
    user: {
      username: req.session.username,
      fullName: req.session.fullName
    },
    enrollmentStatus
  });
});

module.exports = router;
