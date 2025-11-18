/**
 * WebAuthn API Routes
 * Handle FIDO2/WebAuthn registration and authentication
 */

const express = require('express');
const router = express.Router();

// Generate registration options
router.post('/register/options', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const userRegistry = req.app.locals.userRegistry;
    const webAuthnService = req.app.locals.webAuthnService;
    
    // Check if user already exists
    let user = userRegistry.getByUsername(username);
    
    if (!user) {
      // Create new user
      user = userRegistry.create({
        username,
        displayName: username
      });
    }
    
    // Store user ID in session for verification
    req.session.currentUserId = user.id;
    req.session.registrationUsername = username;
    
    // Generate registration options
    const options = await webAuthnService.generateRegistrationOptions(user, {
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: undefined // Allow both USB keys and platform authenticators
      }
    });
    
    res.json(options);
  } catch (error) {
    console.error('Registration options error:', error);
    res.status(500).json({ error: 'Failed to generate registration options' });
  }
});

// Verify registration
router.post('/register/verify', async (req, res) => {
  try {
    const { response, name } = req.body;
    
    if (!req.session.currentUserId) {
      return res.status(400).json({ error: 'No registration in progress' });
    }
    
    const userRegistry = req.app.locals.userRegistry;
    const webAuthnService = req.app.locals.webAuthnService;
    
    const user = userRegistry.getById(req.session.currentUserId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify registration response
    const verification = await webAuthnService.verifyRegistrationResponse(user, response);
    
    if (verification.verified) {
      // Add credential to user
      verification.credential.name = name || `Security Key ${user.credentials.length + 1}`;
      user.addCredential(verification.credential);
      userRegistry.save();
      
      // Auto-login after registration
      req.session.user = user.getSummary();
      req.session.authenticated = true;
      
      // Clean up
      delete req.session.currentUserId;
      delete req.session.registrationUsername;
      
      res.json({
        verified: true,
        message: 'Security key registered successfully',
        credential: {
          name: verification.credential.name,
          id: verification.credential.id
        }
      });
    } else {
      res.status(400).json({
        verified: false,
        error: verification.error || 'Registration verification failed'
      });
    }
  } catch (error) {
    console.error('Registration verification error:', error);
    res.status(500).json({ error: error.message || 'Registration verification failed' });
  }
});

// Generate authentication options
router.post('/authenticate/options', async (req, res) => {
  try {
    const { username } = req.body;
    
    const userRegistry = req.app.locals.userRegistry;
    const webAuthnService = req.app.locals.webAuthnService;
    
    let user = null;
    
    if (username) {
      // Username-based authentication
      user = userRegistry.getByUsername(username);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (user.credentials.length === 0) {
        return res.status(400).json({ error: 'No security keys registered' });
      }
      
      // Store user ID for verification
      req.session.authUserId = user.id;
    }
    
    // Generate authentication options
    const options = await webAuthnService.generateAuthenticationOptions(user);
    
    res.json(options);
  } catch (error) {
    console.error('Authentication options error:', error);
    res.status(500).json({ error: 'Failed to generate authentication options' });
  }
});

// Verify authentication
router.post('/authenticate/verify', async (req, res) => {
  try {
    const { response } = req.body;
    
    const userRegistry = req.app.locals.userRegistry;
    const webAuthnService = req.app.locals.webAuthnService;
    
    // For usernameless flow, find user by credential ID
    let user;
    
    if (req.session.authUserId) {
      user = userRegistry.getById(req.session.authUserId);
    } else {
      // Usernameless - find by credential ID
      const credentialID = Buffer.from(response.id, 'base64url');
      user = userRegistry.getByCredentialId(credentialID);
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify authentication response
    const verification = await webAuthnService.verifyAuthenticationResponse(user, response);
    
    if (verification.verified) {
      // Update credential counter
      user.updateCredentialCounter(verification.credentialID, verification.newCounter);
      user.recordLogin();
      userRegistry.save();
      
      // Create session
      req.session.user = user.getSummary();
      req.session.authenticated = true;
      
      // Clean up
      delete req.session.authUserId;
      
      res.json({
        verified: true,
        message: 'Authentication successful',
        user: user.getSummary()
      });
    } else {
      user.recordFailedLogin();
      userRegistry.save();
      
      res.status(401).json({
        verified: false,
        error: verification.error || 'Authentication failed'
      });
    }
  } catch (error) {
    console.error('Authentication verification error:', error);
    res.status(500).json({ error: error.message || 'Authentication failed' });
  }
});

module.exports = router;
