const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const riskEngine = require('./services/riskEngine');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable for demo purposes
}));

// Logging
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: 'adaptive-auth-demo-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 30 * 60 * 1000 // 30 minutes
  }
}));

// Middleware to track user activity
app.use((req, res, next) => {
  if (req.session.userId) {
    req.session.lastActivity = Date.now();
  }
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);

// Home page
app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('index', { title: 'Adaptive Authentication Demo' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: '404 - Page Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Error',
    error: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Adaptive Authentication Demo Server Started!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`\n📚 Test Accounts:`);
  console.log(`   Username: demo | Password: demo123`);
  console.log(`   Username: admin | Password: admin123`);
  console.log(`\n🔐 Features:`);
  console.log(`   - Real-time risk scoring`);
  console.log(`   - Device fingerprinting`);
  console.log(`   - Location-based authentication`);
  console.log(`   - Step-up authentication`);
  console.log(`   - Behavioral analysis`);
  console.log(`\nPress Ctrl+C to stop\n`);
});
