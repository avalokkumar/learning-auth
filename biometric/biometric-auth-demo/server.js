/**
 * Biometric Authentication Demo Server
 * Demonstrates various biometric authentication methods
 */

const express = require('express');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: 'biometric-auth-demo-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 30 * 60 * 1000 // 30 minutes
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
const authRoutes = require('./routes/auth');
const biometricRoutes = require('./routes/biometric');
const dashboardRoutes = require('./routes/dashboard');

app.use('/auth', authRoutes);
app.use('/biometric', biometricRoutes);
app.use('/dashboard', dashboardRoutes);

// Home page
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Biometric Authentication Demo',
    user: req.session.userId ? req.session.username : null
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: '404 - Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).render('error', {
    title: 'Error',
    error: err.message || 'An unexpected error occurred'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n🔐 Biometric Authentication Demo Server Started!\n');
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log('\n📚 Test Accounts:');
  console.log('   Username: demo | Password: demo123');
  console.log('   Username: admin | Password: admin123');
  console.log('\n🔬 Biometric Methods Available:');
  console.log('   - Fingerprint Recognition');
  console.log('   - Face Recognition');
  console.log('   - Iris Scanning');
  console.log('   - Voice Recognition');
  console.log('   - Multi-Modal Authentication');
  console.log('\nPress Ctrl+C to stop\n');
});
