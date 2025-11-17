/**
 * Test Certificate Files for Browser Import
 * Validates PKCS#12 files are properly formatted for browser import
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const certsDir = path.join(__dirname, '..', 'certs');

console.log('\n🔍 Testing Certificate Files for Browser Import\n');
console.log('═══════════════════════════════════════════════════════\n');

const certFiles = ['demo-user', 'admin-user', 'john-doe'];
let allValid = true;

certFiles.forEach(name => {
  console.log(`Testing: ${name}.p12`);
  
  const p12Path = path.join(certsDir, `${name}.p12`);
  const pfxPath = path.join(certsDir, `${name}.pfx`);
  
  // Check if files exist
  if (!fs.existsSync(p12Path)) {
    console.log('   ❌ .p12 file not found\n');
    allValid = false;
    return;
  }
  
  if (!fs.existsSync(pfxPath)) {
    console.log('   ❌ .pfx file not found\n');
    allValid = false;
    return;
  }
  
  try {
    // Test 1: Verify PKCS#12 structure
    try {
      const info = execSync(`openssl pkcs12 -in "${p12Path}" -passin pass:demo123 -info -noout 2>&1`, 
        { encoding: 'utf8' });
      
      if (info.includes('MAC verified OK')) {
        console.log('   ✅ PKCS#12 structure valid');
      } else {
        console.log('   ⚠️  PKCS#12 structure warning (but may still work)');
      }
    } catch (e) {
      console.log('   ❌ Invalid PKCS#12 structure');
      allValid = false;
    }
    
    // Test 2: Extract and verify certificate
    const cert = execSync(`openssl pkcs12 -in "${p12Path}" -passin pass:demo123 -nokeys -clcerts | openssl x509 -noout -subject -dates -purpose`, 
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    
    if (cert.includes('SSL client : Yes')) {
      console.log('   ✅ Certificate has SSL client purpose');
    } else {
      console.log('   ⚠️  Warning: SSL client purpose not found');
    }
    
    // Test 3: Verify private key
    try {
      execSync(`openssl pkcs12 -in "${p12Path}" -passin pass:demo123 -nocerts -nodes | openssl rsa -noout -check`, 
        { stdio: 'pipe' });
      console.log('   ✅ Private key valid');
    } catch (e) {
      console.log('   ❌ Private key invalid');
      allValid = false;
    }
    
    // Test 4: Check file size (should be > 3KB for valid cert with CA chain)
    const stats = fs.statSync(p12Path);
    if (stats.size > 3000) {
      console.log(`   ✅ File size OK (${stats.size} bytes)`);
    } else {
      console.log(`   ⚠️  File size small (${stats.size} bytes)`);
    }
    
    // Test 5: Verify both .p12 and .pfx are identical
    const p12Content = fs.readFileSync(p12Path);
    const pfxContent = fs.readFileSync(pfxPath);
    if (Buffer.compare(p12Content, pfxContent) === 0) {
      console.log('   ✅ .p12 and .pfx files are identical');
    } else {
      console.log('   ❌ .p12 and .pfx files differ');
      allValid = false;
    }
    
    // Extract certificate details
    const subject = execSync(`openssl pkcs12 -in "${p12Path}" -passin pass:demo123 -nokeys -clcerts | openssl x509 -noout -subject`, 
      { encoding: 'utf8' }).trim();
    console.log(`   👤 ${subject.replace('subject= ', '')}`);
    
    console.log('   ✅ Certificate ready for import!\n');
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
    allValid = false;
  }
});

console.log('═══════════════════════════════════════════════════════');

if (allValid) {
  console.log('✅ All Certificates VALID and Ready for Browser Import!');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📥 Import Instructions:\n');
  
  console.log('🍎 macOS (All Browsers):');
  console.log('  1. Double-click: certs/demo-user.p12');
  console.log('  2. Password: demo123');
  console.log('  3. Add to "login" keychain');
  console.log('  4. Open Keychain Access → Find "Demo User"');
  console.log('  5. Right-click → Get Info → Trust → "Always Trust"');
  console.log('  6. Restart browser\n');
  
  console.log('🪟 Windows (Chrome/Edge):');
  console.log('  1. Win+R → certmgr.msc');
  console.log('  2. Personal → Certificates → Right-click → All Tasks → Import');
  console.log('  3. Select: certs/demo-user.pfx');
  console.log('  4. Password: demo123');
  console.log('  5. Store in: Personal');
  console.log('  6. Restart browser\n');
  
  console.log('🐧 Linux (Firefox):');
  console.log('  1. Firefox Settings → Privacy & Security');
  console.log('  2. Certificates → View Certificates');
  console.log('  3. Your Certificates → Import');
  console.log('  4. Select: certs/demo-user.p12');
  console.log('  5. Password: demo123');
  console.log('  6. Restart Firefox\n');
  
  console.log('🌐 After Import:');
  console.log('  1. Visit: https://localhost:3003');
  console.log('  2. Accept security warning (self-signed server cert)');
  console.log('  3. Browser will prompt: "Choose a certificate"');
  console.log('  4. Select: Demo User');
  console.log('  5. Click OK → You\'re logged in!\n');
  
} else {
  console.log('❌ Some Certificates Have Issues!');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('🔧 Fix: Run `npm run setup` to regenerate certificates\n');
}
