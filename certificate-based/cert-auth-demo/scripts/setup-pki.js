/**
 * PKI Setup Script
 * Generates a complete PKI infrastructure:
 * - Root CA certificate
 * - Server certificate
 * - Client certificates for test users
 */

const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

const certsDir = path.join(__dirname, '..', 'certs');

// Ensure certs directory exists
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

console.log('🔐 Setting up PKI (Public Key Infrastructure)...\n');

/**
 * Generate Root CA Certificate
 */
function generateRootCA() {
  console.log('1️⃣  Generating Root CA certificate...');
  
  // Generate RSA keypair
  const keys = forge.pki.rsa.generateKeyPair(2048);
  
  // Create certificate
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);
  
  // Set subject (who the certificate is for)
  const attrs = [{
    name: 'commonName',
    value: 'Demo Root CA'
  }, {
    name: 'countryName',
    value: 'US'
  }, {
    name: 'organizationName',
    value: 'Certificate Auth Demo'
  }, {
    shortName: 'OU',
    value: 'Certificate Authority'
  }];
  
  cert.setSubject(attrs);
  cert.setIssuer(attrs); // Self-signed, so issuer = subject
  
  // Add extensions
  cert.setExtensions([{
    name: 'basicConstraints',
    cA: true,
    critical: true
  }, {
    name: 'keyUsage',
    keyCertSign: true,
    cRLSign: true,
    critical: true
  }, {
    name: 'subjectKeyIdentifier'
  }]);
  
  // Self-sign certificate
  cert.sign(keys.privateKey, forge.md.sha256.create());
  
  // Save to files
  fs.writeFileSync(path.join(certsDir, 'ca-cert.pem'), 
    forge.pki.certificateToPem(cert));
  fs.writeFileSync(path.join(certsDir, 'ca-key.pem'), 
    forge.pki.privateKeyToPem(keys.privateKey));
  
  console.log('   ✓ Root CA certificate generated');
  console.log('   ✓ Valid for 10 years');
  console.log('   ✓ Saved to certs/ca-cert.pem\n');
  
  return { cert, keys };
}

/**
 * Generate Server Certificate
 */
function generateServerCert(caCert, caKeys) {
  console.log('2️⃣  Generating Server certificate...');
  
  // Generate keypair for server
  const keys = forge.pki.rsa.generateKeyPair(2048);
  
  // Create certificate
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '02';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 2);
  
  // Set subject
  const attrs = [{
    name: 'commonName',
    value: 'localhost'
  }, {
    name: 'countryName',
    value: 'US'
  }, {
    name: 'organizationName',
    value: 'Certificate Auth Demo'
  }, {
    shortName: 'OU',
    value: 'Server Certificate'
  }];
  
  cert.setSubject(attrs);
  cert.setIssuer(caCert.subject.attributes);
  
  // Add extensions
  cert.setExtensions([{
    name: 'basicConstraints',
    cA: false
  }, {
    name: 'keyUsage',
    digitalSignature: true,
    keyEncipherment: true
  }, {
    name: 'extKeyUsage',
    serverAuth: true
  }, {
    name: 'subjectAltName',
    altNames: [{
      type: 2, // DNS
      value: 'localhost'
    }, {
      type: 7, // IP
      ip: '127.0.0.1'
    }]
  }]);
  
  // Sign with CA
  cert.sign(caKeys.privateKey, forge.md.sha256.create());
  
  // Save to files
  fs.writeFileSync(path.join(certsDir, 'server-cert.pem'), 
    forge.pki.certificateToPem(cert));
  fs.writeFileSync(path.join(certsDir, 'server-key.pem'), 
    forge.pki.privateKeyToPem(keys.privateKey));
  
  console.log('   ✓ Server certificate generated');
  console.log('   ✓ Valid for 2 years');
  console.log('   ✓ CN: localhost');
  console.log('   ✓ Saved to certs/server-cert.pem\n');
  
  return { cert, keys };
}

/**
 * Generate Client Certificate
 */
function generateClientCert(caCert, caKeys, commonName, email, serialNum) {
  console.log(`3️⃣  Generating Client certificate for ${commonName}...`);
  
  // Generate keypair for client
  const keys = forge.pki.rsa.generateKeyPair(2048);
  
  // Create certificate
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = serialNum;
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  
  // Set subject
  const attrs = [{
    name: 'commonName',
    value: commonName
  }, {
    name: 'emailAddress',
    value: email
  }, {
    name: 'countryName',
    value: 'US'
  }, {
    name: 'organizationName',
    value: 'Certificate Auth Demo'
  }, {
    shortName: 'OU',
    value: 'Client Certificate'
  }];
  
  cert.setSubject(attrs);
  cert.setIssuer(caCert.subject.attributes);
  
  // Add extensions
  cert.setExtensions([{
    name: 'basicConstraints',
    cA: false
  }, {
    name: 'keyUsage',
    digitalSignature: true,
    keyEncipherment: true
  }, {
    name: 'extKeyUsage',
    clientAuth: true
  }, {
    name: 'subjectAltName',
    altNames: [{
      type: 1, // email
      value: email
    }]
  }]);
  
  // Sign with CA
  cert.sign(caKeys.privateKey, forge.md.sha256.create());
  
  // Create filename from common name
  const filename = commonName.toLowerCase().replace(/\s+/g, '-');
  
  // Save certificate and key
  fs.writeFileSync(path.join(certsDir, `${filename}-cert.pem`), 
    forge.pki.certificateToPem(cert));
  fs.writeFileSync(path.join(certsDir, `${filename}-key.pem`), 
    forge.pki.privateKeyToPem(keys.privateKey));
  
  // Create PKCS#12 file (for browser import)
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
    keys.privateKey,
    [cert, caCert],
    'demo123', // Password for PKCS#12 file
    {
      algorithm: '3des',
      friendlyName: commonName
    }
  );
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  fs.writeFileSync(path.join(certsDir, `${filename}.p12`), p12Der, 'binary');
  
  console.log(`   ✓ Client certificate generated`);
  console.log(`   ✓ CN: ${commonName}`);
  console.log(`   ✓ Email: ${email}`);
  console.log(`   ✓ Valid for 1 year`);
  console.log(`   ✓ Certificate: certs/${filename}-cert.pem`);
  console.log(`   ✓ PKCS#12 (browser): certs/${filename}.p12 (password: demo123)\n`);
  
  return { cert, keys };
}

/**
 * Main setup function
 */
function setupPKI() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   Certificate-Based Authentication - PKI Setup');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Generate Root CA
  const { cert: caCert, keys: caKeys } = generateRootCA();
  
  // Generate Server Certificate
  generateServerCert(caCert, caKeys);
  
  // Generate Client Certificates for test users
  generateClientCert(caCert, caKeys, 'Demo User', 'demo@example.com', '03');
  generateClientCert(caCert, caKeys, 'Admin User', 'admin@example.com', '04');
  generateClientCert(caCert, caKeys, 'John Doe', 'john@example.com', '05');
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ PKI Setup Complete!');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📋 Next Steps:');
  console.log('   1. Start the server: npm start');
  console.log('   2. Import client certificate to browser:');
  console.log('      - Firefox: Settings → Privacy & Security → Certificates → Import');
  console.log('      - Chrome: Settings → Privacy and security → Security → Manage certificates');
  console.log('   3. Import file: certs/demo-user.p12 (password: demo123)');
  console.log('   4. Access: https://localhost:3003');
  console.log('\n📁 Generated Files:');
  console.log('   CA Certificate: certs/ca-cert.pem');
  console.log('   Server Certificate: certs/server-cert.pem');
  console.log('   Client Certificates: certs/*.p12');
  console.log('\n⚠️  Security Note:');
  console.log('   This is a demo PKI for educational purposes.');
  console.log('   In production, use proper CA infrastructure.\n');
}

// Run setup
try {
  setupPKI();
} catch (error) {
  console.error('❌ Error setting up PKI:', error);
  process.exit(1);
}
