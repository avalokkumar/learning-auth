require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('./config/passport');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const database = require('./database/Database');

const app = express();
const PORT = process.env.PORT || 3008;

// Security & logging
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'oauth-demo-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Make user available to all views
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
app.use('/auth', authRoutes);
app.use('/', dashboardRoutes);

// Home route
app.get('/', (req, res) => {
  const stats = database.getStats();
  res.render('index', { title: 'OAuth Demo', stats });
});

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: '404' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).render('error', {
    title: 'Error',
    error: process.env.NODE_ENV === 'development' ? err : {},
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log('\n🔐 OAuth 2.0 & OpenID Connect Demo Started!\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('🔑 OAuth Providers Configuration:\n');
  
  // Check which providers are configured
  const googleConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const microsoftConfigured = !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
  const githubConfigured = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
  
  console.log(`   Google:    ${googleConfigured ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   Microsoft: ${microsoftConfigured ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   GitHub:    ${githubConfigured ? '✅ Configured' : '❌ Not configured'}\n`);
  
  if (!googleConfigured && !microsoftConfigured && !githubConfigured) {
    console.log('⚠️  WARNING: No OAuth providers configured!');
    console.log('📝 Please set up OAuth credentials in .env file');
    console.log('📖 See QUICKSTART.md for setup instructions\n');
  }
  
  console.log('Press Ctrl+C to stop\n');
});

module.exports = app;
