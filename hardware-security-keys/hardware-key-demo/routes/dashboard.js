/**
 * Dashboard Routes
 */
const express = require('express');
const router = express.Router();

// Auth middleware
const requireAuth = (req, res, next) => {
  if (!req.session.authenticated) {
    return res.redirect('/auth/login');
  }
  next();
};

// Main dashboard
router.get('/', requireAuth, (req, res) => {
  const userRegistry = req.app.locals.userRegistry;
  const webAuthnService = req.app.locals.webAuthnService;
  const user = userRegistry.getById(req.session.user.id);
  
  if (!user) {
    return res.redirect('/auth/login');
  }
  
  // Enrich credentials with authenticator info
  const enrichedCredentials = user.credentials.map(cred => {
    const info = webAuthnService.getAuthenticatorInfo(cred.aaguid);
    const transportDisplay = webAuthnService.getTransportDisplay(cred.transports);
    
    return {
      ...cred,
      authenticatorInfo: info,
      transportDisplay,
      credentialID: Buffer.from(cred.credentialID).toString('base64url')
    };
  });
  
  res.render('dashboard', {
    title: 'Dashboard',
    user: req.session.user,
    fullUser: user,
    credentials: enrichedCredentials
  });
});

// Profile page
router.get('/profile', requireAuth, (req, res) => {
  const userRegistry = req.app.locals.userRegistry;
  const user = userRegistry.getById(req.session.user.id);
  
  if (!user) {
    return res.redirect('/auth/login');
  }
  
  res.render('profile', {
    title: 'Profile',
    user: req.session.user,
    fullUser: user
  });
});

// Add security key page
router.get('/add-key', requireAuth, (req, res) => {
  res.render('add-key', {
    title: 'Add Security Key',
    user: req.session.user
  });
});

// Add security key (generate options)
router.post('/add-key/options', requireAuth, async (req, res) => {
  try {
    const userRegistry = req.app.locals.userRegistry;
    const webAuthnService = req.app.locals.webAuthnService;
    const user = userRegistry.getById(req.session.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const options = await webAuthnService.generateRegistrationOptions(user);
    res.json(options);
  } catch (error) {
    console.error('Add key options error:', error);
    res.status(500).json({ error: 'Failed to generate options' });
  }
});

// Add security key (verify)
router.post('/add-key/verify', requireAuth, async (req, res) => {
  try {
    const { response, name } = req.body;
    const userRegistry = req.app.locals.userRegistry;
    const webAuthnService = req.app.locals.webAuthnService;
    const user = userRegistry.getById(req.session.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const verification = await webAuthnService.verifyRegistrationResponse(user, response);
    
    if (verification.verified) {
      verification.credential.name = name || `Security Key ${user.credentials.length + 1}`;
      user.addCredential(verification.credential);
      userRegistry.save();
      
      res.json({
        verified: true,
        message: 'Security key added successfully'
      });
    } else {
      res.status(400).json({
        verified: false,
        error: verification.error || 'Verification failed'
      });
    }
  } catch (error) {
    console.error('Add key verification error:', error);
    res.status(500).json({ error: error.message || 'Verification failed' });
  }
});

// Remove security key
router.delete('/key/:credentialId', requireAuth, (req, res) => {
  try {
    const userRegistry = req.app.locals.userRegistry;
    const user = userRegistry.getById(req.session.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const credentialID = Buffer.from(req.params.credentialId, 'base64url');
    const removed = user.removeCredential(credentialID);
    
    if (removed) {
      userRegistry.save();
      res.json({ success: true, message: 'Security key removed' });
    } else {
      res.status(404).json({ error: 'Security key not found' });
    }
  } catch (error) {
    console.error('Remove key error:', error);
    res.status(500).json({ error: 'Failed to remove key' });
  }
});

module.exports = router;
