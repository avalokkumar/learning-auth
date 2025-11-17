/**
 * PKI Setup with OpenSSL (Most Browser-Compatible)
 * Generates certificates using OpenSSL CLI for maximum compatibility
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const certsDir = path.join(__dirname, '..', 'certs');

// Ensure certs directory exists
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

console.log('\n🔐 Setting up PKI with OpenSSL (Browser-Compatible)\n');
console.log('═══════════════════════════════════════════════════════\n');

try {
  // Check if openssl is available
  try {
    execSync('openssl version', { stdio: 'pipe' });
  } catch (e) {
    console.error('❌ OpenSSL not found! Please install OpenSSL first.');
    process.exit(1);
  }

  // Change to certs directory for cleaner file management
  process.chdir(certsDir);

  // Clean up old files
  console.log('🧹 Cleaning up old certificates...\n');
  const oldFiles = ['*.pem', '*.key', '*.csr', '*.p12', '*.pfx', '*.srl'];
  oldFiles.forEach(pattern => {
    try {
      const files = fs.readdirSync('.').filter(f => {
        if (pattern.includes('*')) {
          const ext = pattern.split('*')[1];
          return f.endsWith(ext);
        }
        return f === pattern;
      });
      files.forEach(f => fs.unlinkSync(f));
    } catch (e) {
      // Ignore errors
    }
  });

  // 1. Generate Root CA
  console.log('1️⃣  Generating Root CA...');
  
  // CA private key
  execSync('openssl genrsa -out ca-key.pem 2048', { stdio: 'pipe' });
  
  // CA certificate
  execSync(`openssl req -new -x509 -days 3650 -key ca-key.pem -out ca-cert.pem -subj "/CN=Demo Root CA/C=US/O=Certificate Auth Demo/OU=Certificate Authority"`, { stdio: 'pipe' });
  
  console.log('   ✅ Root CA certificate created');
  console.log('   📁 ca-cert.pem (valid 10 years)\n');

  // 2. Generate Server Certificate
  console.log('2️⃣  Generating Server certificate...');
  
  // Server private key
  execSync('openssl genrsa -out server-key.pem 2048', { stdio: 'pipe' });
  
  // Server CSR
  execSync(`openssl req -new -key server-key.pem -out server-csr.pem -subj "/CN=localhost/C=US/O=Certificate Auth Demo/OU=Server Certificate"`, { stdio: 'pipe' });
  
  // Server certificate config for SAN
  const serverConfig = `[v3_req]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = 127.0.0.1
IP.1 = 127.0.0.1
`;
  fs.writeFileSync('server-ext.cnf', serverConfig);
  
  // Sign server certificate
  execSync('openssl x509 -req -in server-csr.pem -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial -out server-cert.pem -days 730 -sha256 -extfile server-ext.cnf -extensions v3_req', { stdio: 'pipe' });
  
  console.log('   ✅ Server certificate created');
  console.log('   📁 server-cert.pem (valid 2 years)\n');

  // 3. Generate Client Certificates
  const users = [
    { name: 'Demo User', email: 'demo@example.com', filename: 'demo-user' },
    { name: 'Admin User', email: 'admin@example.com', filename: 'admin-user' },
    { name: 'John Doe', email: 'john@example.com', filename: 'john-doe' }
  ];

  users.forEach((user, index) => {
    console.log(`3️⃣  Generating certificate for ${user.name}...`);
    
    // Client private key
    execSync(`openssl genrsa -out ${user.filename}-key.pem 2048`, { stdio: 'pipe' });
    
    // Client CSR
    execSync(`openssl req -new -key ${user.filename}-key.pem -out ${user.filename}-csr.pem -subj "/CN=${user.name}/emailAddress=${user.email}/C=US/O=Certificate Auth Demo/OU=Client Certificate"`, { stdio: 'pipe' });
    
    // Client certificate config
    const clientConfig = `[v3_req]
basicConstraints = CA:FALSE
keyUsage = digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth
subjectAltName = email:${user.email}
`;
    fs.writeFileSync(`${user.filename}-ext.cnf`, clientConfig);
    
    // Sign client certificate
    execSync(`openssl x509 -req -in ${user.filename}-csr.pem -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial -out ${user.filename}-cert.pem -days 365 -sha256 -extfile ${user.filename}-ext.cnf -extensions v3_req`, { stdio: 'pipe' });
    
    // Create PKCS#12 bundle (with legacy mode for maximum compatibility)
    // Include both client cert and CA cert in the bundle
    try {
      // Try with -legacy flag for older OpenSSL compatibility
      execSync(`openssl pkcs12 -export -out ${user.filename}.p12 -inkey ${user.filename}-key.pem -in ${user.filename}-cert.pem -certfile ca-cert.pem -passout pass:demo123 -legacy -name "${user.name}"`, { stdio: 'pipe' });
    } catch (e) {
      // Fallback without -legacy flag for older OpenSSL versions
      execSync(`openssl pkcs12 -export -out ${user.filename}.p12 -inkey ${user.filename}-key.pem -in ${user.filename}-cert.pem -certfile ca-cert.pem -passout pass:demo123 -name "${user.name}"`, { stdio: 'pipe' });
    }
    
    // Copy to .pfx for Windows compatibility
    fs.copyFileSync(`${user.filename}.p12`, `${user.filename}.pfx`);
    
    console.log(`   ✅ Certificate created for ${user.name}`);
    console.log(`   📧 Email: ${user.email}`);
    console.log(`   📁 ${user.filename}.p12 and ${user.filename}.pfx`);
    console.log(`   🔑 Password: demo123\n`);
  });

  // Clean up temporary files
  console.log('🧹 Cleaning up temporary files...');
  const tempFiles = fs.readdirSync('.').filter(f => 
    f.endsWith('.csr') || 
    f.endsWith('.cnf') || 
    f.endsWith('.srl')
  );
  tempFiles.forEach(f => {
    try {
      fs.unlinkSync(f);
    } catch (e) {
      // Ignore
    }
  });
  console.log('   ✅ Cleanup complete\n');

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ PKI Setup Complete with OpenSSL!');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📋 Generated Files:');
  console.log('   CA: ca-cert.pem, ca-key.pem');
  console.log('   Server: server-cert.pem, server-key.pem');
  console.log('   Clients: *.p12, *.pfx (password: demo123)\n');

  console.log('📥 Import Instructions:');
  console.log('   macOS: Double-click .p12 file');
  console.log('   Windows: Import .pfx file via Certificate Manager');
  console.log('   Linux: Import .p12 in Firefox\n');

  console.log('🚀 Next Steps:');
  console.log('   1. npm start');
  console.log('   2. Import: certs/demo-user.p12 (password: demo123)');
  console.log('   3. Visit: https://localhost:3003\n');

} catch (error) {
  console.error('\n❌ Error during PKI setup:', error.message);
  if (error.stderr) {
    console.error('Details:', error.stderr.toString());
  }
  process.exit(1);
}
