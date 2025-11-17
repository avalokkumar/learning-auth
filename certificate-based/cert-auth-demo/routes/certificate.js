const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const certificateService = require('../services/certificateService');

const certsDir = path.join(__dirname, '..', 'certs');

/**
 * Download CA certificate
 */
router.get('/download/ca', (req, res) => {
  const caCertPath = path.join(certsDir, 'ca-cert.pem');
  
  if (!fs.existsSync(caCertPath)) {
    return res.status(404).json({ error: 'CA certificate not found' });
  }
  
  res.download(caCertPath, 'demo-ca.pem');
});

/**
 * Download client certificate (PKCS#12)
 */
router.get('/download/client/:name', (req, res) => {
  const { name } = req.params;
  const certPath = path.join(certsDir, `${name}.p12`);
  
  if (!fs.existsSync(certPath)) {
    return res.status(404).json({ error: 'Certificate not found' });
  }
  
  res.download(certPath, `${name}.p12`);
});

/**
 * List available certificates
 */
router.get('/list', (req, res) => {
  try {
    const files = fs.readdirSync(certsDir);
    const p12Files = files.filter(f => f.endsWith('.p12'));
    
    const certificates = p12Files.map(file => ({
      name: file.replace('.p12', ''),
      filename: file,
      downloadUrl: `/cert/download/client/${file.replace('.p12', '')}`
    }));
    
    res.json({ certificates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get current certificate info (API)
 */
router.get('/info', (req, res) => {
  if (!req.client.authorized) {
    return res.json({
      authenticated: false,
      error: 'No client certificate provided'
    });
  }
  
  const cert = req.connection.getPeerCertificate();
  
  if (!cert || !cert.subject) {
    return res.json({
      authenticated: false,
      error: 'Invalid certificate'
    });
  }
  
  const user = certificateService.getUserFromCertificate(cert);
  
  res.json({
    authenticated: true,
    user: {
      commonName: user.commonName,
      email: user.email,
      organization: user.organization,
      organizationalUnit: user.organizationalUnit,
      country: user.country
    },
    certificate: {
      serialNumber: user.serialNumber,
      fingerprint: user.fingerprint,
      issuer: user.issuerCommonName,
      validFrom: user.validFrom,
      validTo: user.validTo,
      isValid: user.isValid
    }
  });
});

/**
 * Verify certificate (API)
 */
router.post('/verify', (req, res) => {
  try {
    const { certificate } = req.body;
    
    if (!certificate) {
      return res.status(400).json({ error: 'Certificate required' });
    }
    
    const verification = certificateService.verifyCertificate(certificate);
    res.json(verification);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Parse certificate (API)
 */
router.post('/parse', (req, res) => {
  try {
    const { certificate } = req.body;
    
    if (!certificate) {
      return res.status(400).json({ error: 'Certificate required' });
    }
    
    const parsed = certificateService.parseCertificate(certificate);
    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Certificate setup guide
 */
router.get('/setup', (req, res) => {
  const certificates = [];
  
  try {
    const files = fs.readdirSync(certsDir);
    const p12Files = files.filter(f => f.endsWith('.p12'));
    
    p12Files.forEach(file => {
      certificates.push({
        name: file.replace('.p12', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        filename: file,
        downloadUrl: `/cert/download/client/${file.replace('.p12', '')}`
      });
    });
  } catch (error) {
    console.error('Error reading certificates:', error);
  }
  
  res.render('setup', {
    title: 'Certificate Setup Guide',
    certificates,
    authenticated: req.client.authorized
  });
});

module.exports = router;
