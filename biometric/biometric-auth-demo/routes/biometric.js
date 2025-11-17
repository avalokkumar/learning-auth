const express = require('express');
const router = express.Router();
const BiometricEngine = require('../services/biometricEngine');

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// Enroll fingerprint
router.post('/enroll/fingerprint', requireAuth, async (req, res) => {
  try {
    const { fingerprintData } = req.body;
    
    const result = BiometricEngine.enrollFingerprint(
      req.session.userId,
      fingerprintData || { finger: 'index', quality: 95 }
    );

    res.json({
      success: true,
      ...result,
      message: 'Fingerprint enrolled successfully'
    });
  } catch (error) {
    console.error('Fingerprint enrollment error:', error);
    res.status(500).json({ error: 'Enrollment failed' });
  }
});

// Verify fingerprint
router.post('/verify/fingerprint', requireAuth, async (req, res) => {
  try {
    const { fingerprintData } = req.body;
    
    const result = BiometricEngine.verifyFingerprint(
      req.session.userId,
      fingerprintData || { simulateSuccess: true }
    );

    // Update session if successful
    if (result.success) {
      req.session.lastBiometricAuth = Date.now();
      req.session.authMethod = 'fingerprint';
    }

    res.json(result);
  } catch (error) {
    console.error('Fingerprint verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Enroll face
router.post('/enroll/face', requireAuth, async (req, res) => {
  try {
    const { faceData } = req.body;
    
    const result = BiometricEngine.enrollFace(
      req.session.userId,
      faceData || { quality: 90, is3D: true }
    );

    res.json({
      success: true,
      ...result,
      message: 'Face template enrolled successfully'
    });
  } catch (error) {
    console.error('Face enrollment error:', error);
    res.status(500).json({ error: 'Enrollment failed' });
  }
});

// Verify face
router.post('/verify/face', requireAuth, async (req, res) => {
  try {
    const { faceData } = req.body;
    
    const result = BiometricEngine.verifyFace(
      req.session.userId,
      faceData || { simulateSuccess: true, livenessCheck: true }
    );

    if (result.success) {
      req.session.lastBiometricAuth = Date.now();
      req.session.authMethod = 'face';
    }

    res.json(result);
  } catch (error) {
    console.error('Face verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Enroll iris
router.post('/enroll/iris', requireAuth, async (req, res) => {
  try {
    const { irisData } = req.body;
    
    const result = BiometricEngine.enrollIris(
      req.session.userId,
      irisData || { eye: 'both', quality: 98 }
    );

    res.json({
      success: true,
      ...result,
      message: 'Iris pattern enrolled successfully'
    });
  } catch (error) {
    console.error('Iris enrollment error:', error);
    res.status(500).json({ error: 'Enrollment failed' });
  }
});

// Verify iris
router.post('/verify/iris', requireAuth, async (req, res) => {
  try {
    const { irisData } = req.body;
    
    const result = BiometricEngine.verifyIris(
      req.session.userId,
      irisData || { simulateSuccess: true }
    );

    if (result.success) {
      req.session.lastBiometricAuth = Date.now();
      req.session.authMethod = 'iris';
    }

    res.json(result);
  } catch (error) {
    console.error('Iris verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Enroll voice
router.post('/enroll/voice', requireAuth, async (req, res) => {
  try {
    const { voiceData } = req.body;
    
    const result = BiometricEngine.enrollVoice(
      req.session.userId,
      voiceData || { passphrase: 'my voice is my password', quality: 85 }
    );

    res.json({
      success: true,
      ...result,
      message: 'Voice print enrolled successfully'
    });
  } catch (error) {
    console.error('Voice enrollment error:', error);
    res.status(500).json({ error: 'Enrollment failed' });
  }
});

// Verify voice
router.post('/verify/voice', requireAuth, async (req, res) => {
  try {
    const { voiceData } = req.body;
    
    const result = BiometricEngine.verifyVoice(
      req.session.userId,
      voiceData || { simulateSuccess: true, passphrase: 'my voice is my password' }
    );

    if (result.success) {
      req.session.lastBiometricAuth = Date.now();
      req.session.authMethod = 'voice';
    }

    res.json(result);
  } catch (error) {
    console.error('Voice verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Multi-modal authentication
router.post('/verify/multi-modal', requireAuth, async (req, res) => {
  try {
    const { biometricData } = req.body;
    
    const result = BiometricEngine.verifyMultiModal(
      req.session.userId,
      biometricData || {
        fingerprint: { simulateSuccess: true },
        face: { simulateSuccess: true, livenessCheck: true }
      }
    );

    if (result.success) {
      req.session.lastBiometricAuth = Date.now();
      req.session.authMethod = 'multi-modal';
    }

    res.json(result);
  } catch (error) {
    console.error('Multi-modal verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Get enrollment status
router.get('/enrollment/status', requireAuth, (req, res) => {
  try {
    const status = BiometricEngine.getEnrollmentStatus(req.session.userId);
    res.json(status);
  } catch (error) {
    console.error('Enrollment status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Get authentication history
router.get('/history', requireAuth, (req, res) => {
  try {
    const history = BiometricEngine.getAuthHistory(req.session.userId);
    res.json({ history });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

module.exports = router;
