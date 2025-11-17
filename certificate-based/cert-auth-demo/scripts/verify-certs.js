/**
 * Verify Certificate Files
 * Tests if generated PKCS#12 files are valid
 */

const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

const certsDir = path.join(__dirname, '..', 'certs');

console.log('\n🔍 Verifying Certificate Files...\n');
console.log('═══════════════════════════════════════════════════════\n');

// Test PKCS#12 files
const p12Files = ['demo-user.p12', 'admin-user.p12', 'john-doe.p12'];
const password = 'demo123';

p12Files.forEach(filename => {
  const filepath = path.join(certsDir, filename);
  
  console.log(`Testing: ${filename}`);
  
  if (!fs.existsSync(filepath)) {
    console.log(`   ❌ File not found\n`);
    return;
  }
  
  try {
    // Read the file
    const p12Der = fs.readFileSync(filepath, 'binary');
    
    // Check file size
    const stats = fs.statSync(filepath);
    console.log(`   📁 File size: ${stats.size} bytes`);
    
    // Try to parse as PKCS#12
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
    
    // Extract bags
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    
    const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;
    const certificate = certBags[forge.pki.oids.certBag][0].cert;
    
    console.log(`   ✅ Valid PKCS#12 file`);
    console.log(`   🔑 Private key found: ${privateKey ? 'Yes' : 'No'}`);
    console.log(`   📜 Certificate found: ${certificate ? 'Yes' : 'No'}`);
    
    if (certificate) {
      console.log(`   👤 Subject CN: ${certificate.subject.getField('CN').value}`);
      console.log(`   📧 Email: ${certificate.subject.getField('emailAddress')?.value || 'N/A'}`);
      console.log(`   📅 Valid from: ${certificate.validity.notBefore.toLocaleDateString()}`);
      console.log(`   📅 Valid to: ${certificate.validity.notAfter.toLocaleDateString()}`);
    }
    
    console.log(`   ✅ Certificate is valid and ready to import!\n`);
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    console.log(`   Details: File may be corrupted or password incorrect\n`);
  }
});

console.log('═══════════════════════════════════════════════════════');
console.log('Verification Complete');
console.log('═══════════════════════════════════════════════════════\n');
