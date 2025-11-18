/**
 * Device Authentication Demo Server
 * Demonstrates various device and machine authentication methods
 */

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Models
const { DeviceRegistry } = require('./models/Device');
const { ServiceAccountRegistry } = require('./models/ServiceAccount');

// Services
const DeviceAuthService = require('./services/deviceAuthService');

// Create registries
const deviceRegistry = new DeviceRegistry();
const serviceAccountRegistry = new ServiceAccountRegistry();

// Create authentication service
const deviceAuthService = new DeviceAuthService(deviceRegistry, serviceAccountRegistry);

// Create Express app
const app = express();
const PORT = process.env.PORT || 3004;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Disabled for demo
}));

// Logging
app.use(morgan('dev'));

// Body parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: 'device-auth-demo-secret-key-change-in-production',
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

// Make services and registries available to routes
app.locals.deviceAuthService = deviceAuthService;
app.locals.deviceRegistry = deviceRegistry;
app.locals.serviceAccountRegistry = serviceAccountRegistry;

// Routes
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const dashboardRoutes = require('./routes/dashboard');
const apiRoutes = require('./routes/api');
const serviceAccountRoutes = require('./routes/serviceAccounts');

app.use('/auth', authRoutes);
app.use('/devices', deviceRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/api', apiRoutes);
app.use('/service-accounts', serviceAccountRoutes);

// Home route
app.get('/', (req, res) => {
  const stats = deviceRegistry.getStats();
  const saStats = serviceAccountRegistry.getStats();
  
  res.render('index', {
    title: 'Device Authentication Demo',
    user: req.session.user || null,
    device: req.session.device || null,
    stats: stats,
    saStats: saStats
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
  console.log('\n🔐 Device Authentication Demo Server Started!\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('🎯 Supported Authentication Methods:');
  console.log('   1. API Key Authentication');
  console.log('   2. Device Fingerprinting');
  console.log('   3. Certificate-Based (mTLS)');
  console.log('   4. Service Accounts\n');
  
  console.log('📊 Current Status:');
  const stats = deviceRegistry.getStats();
  const saStats = serviceAccountRegistry.getStats();
  console.log(`   Registered Devices: ${stats.total}`);
  console.log(`   Active Devices: ${stats.byStatus.active}`);
  console.log(`   Service Accounts: ${saStats.total}`);
  console.log(`   Active Service Accounts: ${saStats.active}\n`);
  
  console.log('🚀 Getting Started:');
  console.log(`   1. Visit: http://localhost:${PORT}`);
  console.log('   2. Register a new device');
  console.log('   3. Generate API key');
  console.log('   4. Test device authentication\n');
  
  console.log('Press Ctrl+C to stop\n');
});

module.exports = app;
