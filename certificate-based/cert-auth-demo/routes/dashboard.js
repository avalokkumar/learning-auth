const express = require('express');
const router = express.Router();
const certificateService = require('../services/certificateService');

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.client.authorized) {
    return res.render('auth-required', {
      title: 'Authentication Required',
      message: 'Please install and select a client certificate to access this page'
    });
  }
  
  const cert = req.connection.getPeerCertificate();
  if (!cert || !cert.subject) {
    return res.render('auth-required', {
      title: 'Authentication Required',
      message: 'Invalid certificate'
    });
  }
  
  // Attach user info to request
  req.user = certificateService.getUserFromCertificate(cert);
  next();
}

// Dashboard home
router.get('/', requireAuth, (req, res) => {
  const cert = req.connection.getPeerCertificate();
  
  res.render('dashboard', {
    title: 'Dashboard',
    user: req.user,
    certificate: {
      serialNumber: cert.serialNumber,
      fingerprint: cert.fingerprint,
      fingerprint256: cert.fingerprint256,
      issuer: cert.issuer,
      subject: cert.subject,
      validFrom: cert.valid_from,
      validTo: cert.valid_to,
      subjectaltname: cert.subjectaltname
    },
    session: req.session
  });
});

// Profile page
router.get('/profile', requireAuth, (req, res) => {
  const cert = req.connection.getPeerCertificate();
  
  res.render('profile', {
    title: 'Profile',
    user: req.user,
    certificate: {
      serialNumber: cert.serialNumber,
      fingerprint: cert.fingerprint,
      fingerprint256: cert.fingerprint256,
      issuer: cert.issuer,
      subject: cert.subject,
      validFrom: cert.valid_from,
      validTo: cert.valid_to,
      raw: cert
    }
  });
});

// Certificate details page
router.get('/cert-details', requireAuth, (req, res) => {
  const cert = req.connection.getPeerCertificate();
  
  // Get full certificate in PEM format
  const certPem = `-----BEGIN CERTIFICATE-----\n${cert.raw.toString('base64').match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----`;
  
  try {
    const details = certificateService.getCertificateDetails(certPem);
    
    res.render('cert-details', {
      title: 'Certificate Details',
      user: req.user,
      certificate: details
    });
  } catch (error) {
    res.render('error', {
      title: 'Error',
      error: `Failed to parse certificate: ${error.message}`
    });
  }
});

// Certificate chain view
router.get('/cert-chain', requireAuth, (req, res) => {
  const cert = req.connection.getPeerCertificate(true); // Get full chain
  
  const chain = [];
  let current = cert;
  let depth = 0;
  
  while (current && depth < 10) {
    chain.push({
      depth,
      subject: current.subject,
      issuer: current.issuer,
      serialNumber: current.serialNumber,
      validFrom: current.valid_from,
      validTo: current.valid_to,
      fingerprint: current.fingerprint
    });
    
    current = current.issuerCertificate;
    depth++;
    
    // Break if we've reached the root (self-signed)
    if (current && current.fingerprint === cert.fingerprint) {
      break;
    }
  }
  
  res.render('cert-chain', {
    title: 'Certificate Chain',
    user: req.user,
    chain
  });
});

// Mutual TLS info page
router.get('/mtls-info', requireAuth, (req, res) => {
  const tlsInfo = {
    protocol: req.connection.getProtocol(),
    cipher: req.connection.getCipher(),
    authorized: req.client.authorized,
    authorizationError: req.socket.authorizationError
  };
  
  res.render('mtls-info', {
    title: 'Mutual TLS Information',
    user: req.user,
    tlsInfo
  });
});

// Certificate validation test
router.get('/validate', requireAuth, (req, res) => {
  const cert = req.connection.getPeerCertificate();
  const certPem = `-----BEGIN CERTIFICATE-----\n${cert.raw.toString('base64').match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----`;
  
  const verification = certificateService.verifyCertificate(certPem);
  
  res.render('validate', {
    title: 'Certificate Validation',
    user: req.user,
    verification,
    certificate: {
      subject: cert.subject,
      issuer: cert.issuer,
      validFrom: cert.valid_from,
      validTo: cert.valid_to
    }
  });
});

module.exports = router;
