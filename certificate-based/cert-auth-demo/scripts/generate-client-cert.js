/**
 * Generate Additional Client Certificate
 * Interactive script to create new client certificates
 */

const forge = require('node-forge');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const certsDir = path.join(__dirname, '..', 'certs');

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function generateClientCertificate() {
  console.log('\n🔐 Generate New Client Certificate\n');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Check if CA exists
  const caCertPath = path.join(certsDir, 'ca-cert.pem');
  const caKeyPath = path.join(certsDir, 'ca-key.pem');
  
  if (!fs.existsSync(caCertPath) || !fs.existsSync(caKeyPath)) {
    console.error('❌ Error: CA certificates not found!');
    console.error('Please run: npm run setup\n');
    process.exit(1);
  }
  
  // Load CA certificate and key
  const caCertPem = fs.readFileSync(caCertPath, 'utf8');
  const caKeyPem = fs.readFileSync(caKeyPath, 'utf8');
  const caCert = forge.pki.certificateFromPem(caCertPem);
  const caKey = forge.pki.privateKeyFromPem(caKeyPem);
  
  // Get user input
  const commonName = await question('Common Name (e.g., Jane Smith): ');
  const email = await question('Email Address (e.g., jane@example.com): ');
  const organization = await question('Organization [Certificate Auth Demo]: ') || 'Certificate Auth Demo';
  const country = await question('Country Code [US]: ') || 'US';
  const password = await question('PKCS#12 Password [demo123]: ') || 'demo123';
  
  if (!commonName || !email) {
    console.error('\n❌ Common Name and Email are required!');
    rl.close();
    process.exit(1);
  }
  
  console.log('\n🔨 Generating certificate...\n');
  
  // Generate keypair
  console.log('   ⏳ Generating RSA key pair (2048 bits)...');
  const keys = forge.pki.rsa.generateKeyPair(2048);
  console.log('   ✓ Key pair generated\n');
  
  // Create certificate
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  
  // Generate unique serial number
  const serialNumber = Date.now().toString();
  cert.serialNumber = serialNumber;
  
  // Set validity
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
    value: country
  }, {
    name: 'organizationName',
    value: organization
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
  console.log('   ⏳ Signing certificate with CA...');
  cert.sign(caKey, forge.md.sha256.create());
  console.log('   ✓ Certificate signed\n');
  
  // Create filename from common name
  const filename = commonName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  // Save certificate and key
  console.log('   ⏳ Saving certificate files...');
  fs.writeFileSync(path.join(certsDir, `${filename}-cert.pem`), 
    forge.pki.certificateToPem(cert));
  fs.writeFileSync(path.join(certsDir, `${filename}-key.pem`), 
    forge.pki.privateKeyToPem(keys.privateKey));
  console.log(`   ✓ Certificate: certs/${filename}-cert.pem`);
  console.log(`   ✓ Private Key: certs/${filename}-key.pem\n`);
  
  // Create PKCS#12 file
  console.log('   ⏳ Creating PKCS#12 bundle...');
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
    keys.privateKey,
    [cert, caCert],
    password,
    {
      algorithm: '3des',
      friendlyName: commonName
    }
  );
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  fs.writeFileSync(path.join(certsDir, `${filename}.p12`), p12Der, 'binary');
  console.log(`   ✓ PKCS#12: certs/${filename}.p12\n`);
  
  // Display summary
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Certificate Generated Successfully!');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📋 Certificate Details:');
  console.log(`   Common Name: ${commonName}`);
  console.log(`   Email: ${email}`);
  console.log(`   Organization: ${organization}`);
  console.log(`   Country: ${country}`);
  console.log(`   Serial: ${serialNumber}`);
  console.log(`   Valid: 1 year`);
  console.log(`   Valid From: ${cert.validity.notBefore.toLocaleDateString()}`);
  console.log(`   Valid To: ${cert.validity.notAfter.toLocaleDateString()}\n`);
  
  console.log('📁 Generated Files:');
  console.log(`   Certificate: certs/${filename}-cert.pem`);
  console.log(`   Private Key: certs/${filename}-key.pem`);
  console.log(`   PKCS#12: certs/${filename}.p12\n`);
  
  console.log('📱 Import to Browser:');
  console.log(`   1. Use file: certs/${filename}.p12`);
  console.log(`   2. Password: ${password}`);
  console.log('   3. Restart browser');
  console.log('   4. Visit: https://localhost:3003\n');
  
  rl.close();
}

// Run the generator
generateClientCertificate().catch(error => {
  console.error('\n❌ Error generating certificate:', error.message);
  rl.close();
  process.exit(1);
});
