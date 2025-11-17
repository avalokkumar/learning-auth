/**
 * Certificate-Based Authentication Server
 * Implements mutual TLS (mTLS) for client certificate authentication
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3003;

// Check if certificates exist
const certsDir = path.join(__dirname, 'certs');
const caCertPath = path.join(certsDir, 'ca-cert.pem');
const serverCertPath = path.join(certsDir, 'server-cert.pem');
const serverKeyPath = path.join(certsDir, 'server-key.pem');

if (!fs.existsSync(caCertPath) || !fs.existsSync(serverCertPath) || !fs.existsSync(serverKeyPath)) {
  console.error('\n❌ Error: Certificates not found!');
  console.error('Please run: npm run setup\n');
  process.exit(1);
}

// HTTPS Server Options with mTLS
const httpsOptions = {
  // Server's certificate and private key
  key: fs.readFileSync(serverKeyPath),
  cert: fs.readFileSync(serverCertPath),
  
  // CA certificate to verify clients
  ca: fs.readFileSync(caCertPath),
  
  // Request client certificate
  requestCert: true,
  
  // Reject connections without valid client certificates
  rejectUnauthorized: false, // We'll handle verification in middleware
  
  // TLS version
  minVersion: 'TLSv1.2'
};

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
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: 'cert-auth-demo-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // HTTPS only
    httpOnly: true,
    maxAge: 30 * 60 * 1000 // 30 minutes
  }
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Make certificate info available in all views
app.use((req, res, next) => {
  res.locals.clientCert = null;
  res.locals.authenticated = false;
  
  if (req.client.authorized) {
    const cert = req.connection.getPeerCertificate();
    if (cert && cert.subject) {
      res.locals.clientCert = cert;
      res.locals.authenticated = true;
      res.locals.user = {
        name: cert.subject.CN,
        email: cert.subject.emailAddress,
        organization: cert.subject.O
      };
    }
  }
  
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const certRoutes = require('./routes/certificate');

app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/cert', certRoutes);

// Home page
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Certificate-Based Authentication Demo',
    authenticated: res.locals.authenticated,
    user: res.locals.user || null
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

// Create HTTPS server with mTLS
const server = https.createServer(httpsOptions, app);

server.listen(PORT, () => {
  console.log('\n🔐 Certificate-Based Authentication Server Started!\n');
  console.log(`📍 URL: https://localhost:${PORT}`);
  console.log('\n🔑 Client Certificate Authentication (mTLS) Enabled');
  console.log('\n📜 Available Client Certificates:');
  console.log('   1. Demo User (demo-user.p12)');
  console.log('   2. Admin User (admin-user.p12)');
  console.log('   3. John Doe (john-doe.p12)');
  console.log('   Password for all: demo123');
  console.log('\n📋 Setup Instructions:');
  console.log('   1. Import client certificate to your browser:');
  console.log('      - Firefox: Settings → Privacy & Security → Certificates → Import');
  console.log('      - Chrome: Settings → Privacy and security → Manage certificates');
  console.log('   2. Select file: certs/demo-user.p12');
  console.log('   3. Enter password: demo123');
  console.log('   4. Restart browser');
  console.log('   5. Visit: https://localhost:3003');
  console.log('   6. Accept security warning (self-signed cert)');
  console.log('   7. Select your client certificate when prompted');
  console.log('\n⚠️  Security Note:');
  console.log('   Browser will show security warning because certificates are self-signed.');
  console.log('   Click "Advanced" → "Proceed to localhost" to continue.');
  console.log('\nPress Ctrl+C to stop\n');
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Error: Port ${PORT} is already in use.`);
    console.error('Please stop the other server or use a different port.\n');
  } else {
    console.error('\n❌ Server error:', error);
  }
  process.exit(1);
});
