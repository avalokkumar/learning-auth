require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('./config/passport');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const database = require('./database/Database');

const app = express();
const PORT = process.env.PORT || 3009;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'password-demo-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, 
    httpOnly: true, 
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
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
  res.locals.error = req.session.error || null;
  res.locals.success = req.session.success || null;
  delete req.session.error;
  delete req.session.success;
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const passwordRoutes = require('./routes/password');
app.use('/auth', authRoutes);
app.use('/password', passwordRoutes);
app.use('/', dashboardRoutes);

// Home route
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  const stats = database.getStats();
  res.render('index', { title: 'Password Auth Demo', stats });
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
  console.log('\n🔐 Password-Based Authentication Demo Started!\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('🔑 Features:');
  console.log('   • Argon2id password hashing');
  console.log('   • Password strength validation');
  console.log('   • Breach detection');
  console.log('   • Account lockout protection');
  console.log('   • Password reset flow');
  console.log('   • OAuth alternative (Google, GitHub)');
  console.log('   • Session management\n');
  console.log('Press Ctrl+C to stop\n');
});

module.exports = app;
