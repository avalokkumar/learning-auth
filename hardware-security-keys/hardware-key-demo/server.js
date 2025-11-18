/**
 * Hardware Security Keys Demo Server
 * FIDO2/WebAuthn Implementation
 */

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Models and Services
const { UserRegistry } = require('./models/User');
const WebAuthnService = require('./services/webAuthnService');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3005;

// Initialize user registry
const userRegistry = new UserRegistry();

// Initialize WebAuthn service
const webAuthnService = new WebAuthnService({
  rpName: 'Hardware Key Demo',
  rpID: 'localhost',
  origin: `http://localhost:${PORT}`,
  expectedOrigin: `http://localhost:${PORT}`
});

// Security middleware (allow inline scripts for demo)
app.use(helmet({
  contentSecurityPolicy: false // Disabled for demo to allow inline scripts
}));

// Logging
app.use(morgan('dev'));

// Body parsing
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: 'hardware-key-demo-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 1800000 // 30 minutes
  }
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Make services available to routes
app.locals.userRegistry = userRegistry;
app.locals.webAuthnService = webAuthnService;

// Routes
const authRoutes = require('./routes/auth');
const webauthnRoutes = require('./routes/webauthn');
const dashboardRoutes = require('./routes/dashboard');

app.use('/auth', authRoutes);
app.use('/webauthn', webauthnRoutes);
app.use('/dashboard', dashboardRoutes);

// Home route
app.get('/', (req, res) => {
  const stats = userRegistry.getStats();
  
  res.render('index', {
    title: 'Hardware Security Keys Demo',
    user: req.session.user || null,
    stats
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', {
    title: '404 - Not Found',
    user: req.session.user || null
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).render('error', {
    title: 'Error',
    error: process.env.NODE_ENV === 'development' ? err : {},
    message: err.message || 'Internal Server Error',
    user: req.session.user || null
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🔐 Hardware Security Keys Demo Server Started!\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('🔑 Supported Authentication:');
  console.log('   ✓ FIDO2/WebAuthn');
  console.log('   ✓ Hardware Security Keys (YubiKey, Titan, etc.)');
  console.log('   ✓ Platform Authenticators (Touch ID, Windows Hello)');
  console.log('   ✓ Passwordless Login\n');
  
  console.log('📊 Current Status:');
  const stats = userRegistry.getStats();
  console.log(`   Registered Users: ${stats.total}`);
  console.log(`   Total Security Keys: ${stats.totalCredentials}`);
  console.log(`   Total Logins: ${stats.totalLogins}\n`);
  
  console.log('🚀 Getting Started:');
  console.log(`   1. Visit: http://localhost:${PORT}`);
  console.log('   2. Register a new account');
  console.log('   3. Add your security key');
  console.log('   4. Login passwordlessly!\n');
  
  console.log('💡 Testing:');
  console.log('   • Use a real hardware key (YubiKey, Titan, etc.)');
  console.log('   • Or use platform authenticator (Touch ID, Windows Hello)');
  console.log('   • Or use Chrome DevTools Virtual Authenticator\n');
  
  console.log('Press Ctrl+C to stop\n');
});

module.exports = app;
