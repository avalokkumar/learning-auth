/**
 * HTTP Authentication Demo Server
 * Demonstrates all HTTP authentication methods
 */

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Database
const database = require('./database/Database');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3006;

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
  secret: 'http-auth-demo-secret-change-in-production',
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

// Make database available to routes
app.locals.database = database;

// Routes
const webRoutes = require('./routes/web');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');

app.use('/', webRoutes);
app.use('/api', apiRoutes);
app.use('/auth', authRoutes);

// Home route
app.get('/', (req, res) => {
  const stats = database.getStats();
  
  res.render('index', {
    title: 'HTTP Authentication Demo',
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
  console.log('\n🔐 HTTP Authentication Demo Server Started!\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('🔑 Supported HTTP Authentication Methods:');
  console.log('   1. HTTP Basic Auth (RFC 7617)');
  console.log('   2. HTTP Digest Auth (RFC 7616)');
  console.log('   3. Bearer Token Auth (RFC 6750)');
  console.log('   4. API Key Auth (X-API-Key header)\n');
  
  console.log('📊 Database Status:');
  const stats = database.getStats();
  console.log(`   Users: ${stats.users}`);
  console.log(`   Active Sessions: ${stats.activeSessions}`);
  console.log(`   API Keys: ${stats.apiKeys}\n`);
  
  console.log('👥 Demo Credentials:');
  console.log('   Username: admin    Password: admin123');
  console.log('   Username: user     Password: user123');
  console.log('   Username: api_user Password: api123\n');
  
  console.log('🚀 Getting Started:');
  console.log(`   Web UI: http://localhost:${PORT}`);
  console.log(`   API Basic Auth: curl -u admin:admin123 http://localhost:${PORT}/api/user`);
  console.log(`   API Documentation: http://localhost:${PORT}/docs\n`);
  
  console.log('Press Ctrl+C to stop\n');
});

module.exports = app;
