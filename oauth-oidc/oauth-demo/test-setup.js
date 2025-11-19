/**
 * OAuth Setup Verification Script
 * Run this to verify your OAuth configuration
 */

require('dotenv').config();

console.log('\n🔍 OAuth Configuration Check\n');
console.log('═══════════════════════════════════════════════════════\n');

// Check .env file
const fs = require('fs');
if (!fs.existsSync('.env')) {
  console.log('❌ ERROR: .env file not found!');
  console.log('📝 Please create .env file from .env.example:');
  console.log('   cp .env.example .env\n');
  process.exit(1);
}

console.log('✅ .env file exists\n');

// Check Google OAuth
console.log('🔵 Google OAuth 2.0:');
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  console.log('   ✅ Client ID: ' + process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...');
  console.log('   ✅ Client Secret: ' + '*'.repeat(20));
  console.log('   ✅ Callback URL: ' + (process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3008/auth/google/callback'));
} else {
  console.log('   ❌ Not configured');
  if (!process.env.GOOGLE_CLIENT_ID) console.log('   - Missing: GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) console.log('   - Missing: GOOGLE_CLIENT_SECRET');
}
console.log('');

// Check Microsoft OAuth
console.log('🔷 Microsoft OAuth 2.0:');
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  console.log('   ✅ Client ID: ' + process.env.MICROSOFT_CLIENT_ID.substring(0, 20) + '...');
  console.log('   ✅ Client Secret: ' + '*'.repeat(20));
  console.log('   ✅ Callback URL: ' + (process.env.MICROSOFT_CALLBACK_URL || 'http://localhost:3008/auth/microsoft/callback'));
} else {
  console.log('   ❌ Not configured');
  if (!process.env.MICROSOFT_CLIENT_ID) console.log('   - Missing: MICROSOFT_CLIENT_ID');
  if (!process.env.MICROSOFT_CLIENT_SECRET) console.log('   - Missing: MICROSOFT_CLIENT_SECRET');
}
console.log('');

// Check GitHub OAuth
console.log('⚫ GitHub OAuth 2.0:');
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  console.log('   ✅ Client ID: ' + process.env.GITHUB_CLIENT_ID.substring(0, 20) + '...');
  console.log('   ✅ Client Secret: ' + '*'.repeat(20));
  console.log('   ✅ Callback URL: ' + (process.env.GITHUB_CALLBACK_URL || 'http://localhost:3008/auth/github/callback'));
} else {
  console.log('   ❌ Not configured');
  if (!process.env.GITHUB_CLIENT_ID) console.log('   - Missing: GITHUB_CLIENT_ID');
  if (!process.env.GITHUB_CLIENT_SECRET) console.log('   - Missing: GITHUB_CLIENT_SECRET');
}
console.log('');

// Summary
const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const microsoftConfigured = !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
const githubConfigured = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

const configuredCount = [googleConfigured, microsoftConfigured, githubConfigured].filter(Boolean).length;

console.log('═══════════════════════════════════════════════════════\n');
console.log(`📊 Summary: ${configuredCount}/3 providers configured\n`);

if (configuredCount === 0) {
  console.log('⚠️  No OAuth providers configured!');
  console.log('📖 Follow QUICKSTART.md to set up at least one provider\n');
} else if (configuredCount < 3) {
  console.log('✨ You can now test with configured providers');
  console.log('📖 See QUICKSTART.md to add more providers\n');
} else {
  console.log('🎉 All OAuth providers configured!');
  console.log('🚀 You can now start the server: npm start\n');
}
