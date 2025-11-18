/**
 * Multi-Factor Authentication Demo Server
 */

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const database = require('./database/Database');

const app = express();
const PORT = process.env.PORT || 3007;

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));

// Logging
app.use(morgan('dev'));

// Body parsing
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: 'mfa-demo-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 1800000 // 30 minutes
  }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Make database available
app.locals.database = database;

// Routes
const authRoutes = require('./routes/auth');
const mfaRoutes = require('./routes/mfa');
const dashboardRoutes = require('./routes/dashboard');

app.use('/auth', authRoutes);
app.use('/mfa', mfaRoutes);
app.use('/dashboard', dashboardRoutes);

// Home route
app.get('/', (req, res) => {
  const stats = database.getStats();
  res.render('index', {
    title: 'MFA Demo',
    user: req.session.user || null,
    stats
  });
});

// 404
app.use((req, res) => {
  res.status(404).render('404', {
    title: '404',
    user: req.session.user || null
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).render('error', {
    title: 'Error',
    error: process.env.NODE_ENV === 'development' ? err : {},
    message: err.message,
    user: req.session.user || null
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🔐 Multi-Factor Authentication Demo Started!\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('🔑 Supported MFA Methods:');
  console.log('   1. TOTP (Authenticator Apps)');
  console.log('   2. SMS One-Time Password');
  console.log('   3. Email One-Time Password');
  console.log('   4. Backup Recovery Codes\n');
  
  const stats = database.getStats();
  console.log('📊 Database Status:');
  console.log(`   Users: ${stats.users}`);
  console.log(`   MFA Enabled: ${stats.mfaEnabledUsers}\n`);
  
  console.log('👥 Demo Credentials:');
  console.log('   Username: admin  Password: admin123');
  console.log('   Username: user   Password: user123\n');
  
  console.log('Press Ctrl+C to stop\n');
});

module.exports = app;
