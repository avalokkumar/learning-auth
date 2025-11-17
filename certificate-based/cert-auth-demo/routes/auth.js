const express = require('express');
const router = express.Router();
const certificateService = require('../services/certificateService');

/**
 * Certificate Authentication Route
 * Verifies client certificate and creates session
 */
router.get('/certificate', (req, res) => {
  // Check if client provided a certificate
  if (!req.client.authorized) {
    return res.render('auth-error', {
      title: 'Authentication Failed',
      error: 'No valid client certificate provided',
      reason: req.socket.authorizationError || 'Certificate not trusted'
    });
  }
  
  // Get certificate from connection
  const cert = req.connection.getPeerCertificate();
  
  if (!cert || !cert.subject) {
    return res.render('auth-error', {
      title: 'Authentication Failed',
      error: 'Invalid certificate',
      reason: 'Certificate data could not be read'
    });
  }
  
  // Extract user information from certificate
  const user = certificateService.getUserFromCertificate(cert);
  
  if (!user.isValid) {
    return res.render('auth-error', {
      title: 'Authentication Failed',
      error: 'Certificate expired',
      reason: `Valid from ${user.validFrom} to ${user.validTo}`
    });
  }
  
  // Create session
  req.session.authenticated = true;
  req.session.authMethod = 'certificate';
  req.session.user = {
    commonName: user.commonName,
    email: user.email,
    organization: user.organization,
    organizationalUnit: user.organizationalUnit,
    country: user.country
  };
  req.session.certificate = {
    serialNumber: user.serialNumber,
    fingerprint: user.fingerprint,
    issuer: user.issuerCommonName,
    validFrom: user.validFrom,
    validTo: user.validTo
  };
  req.session.loginTime = new Date();
  
  // Redirect to dashboard
  res.redirect('/dashboard');
});

/**
 * Status check
 */
router.get('/status', (req, res) => {
  const hasClientCert = req.client.authorized;
  const cert = hasClientCert ? req.connection.getPeerCertificate() : null;
  
  res.json({
    hasClientCertificate: hasClientCert,
    authenticated: req.session.authenticated || false,
    certificate: cert ? {
      subject: cert.subject,
      issuer: cert.issuer,
      valid_from: cert.valid_from,
      valid_to: cert.valid_to,
      fingerprint: cert.fingerprint
    } : null
  });
});

/**
 * Logout
 */
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

/**
 * Re-authenticate
 */
router.get('/reauth', (req, res) => {
  if (!req.client.authorized) {
    return res.render('auth-error', {
      title: 'Re-authentication Failed',
      error: 'No valid client certificate',
      reason: 'Please ensure your certificate is installed and browser is restarted'
    });
  }
  
  const cert = req.connection.getPeerCertificate();
  const user = certificateService.getUserFromCertificate(cert);
  
  // Update session
  req.session.lastReauth = new Date();
  
  res.json({
    success: true,
    message: 'Re-authenticated successfully',
    user: {
      name: user.commonName,
      email: user.email
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
