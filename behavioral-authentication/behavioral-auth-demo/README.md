# Behavioral Authentication Demo

A comprehensive demonstration of behavioral and continuous authentication using keystroke dynamics, mouse movement patterns, and touch gestures.

## 🧠 Features

### Keystroke Dynamics
- **Dwell Time Analysis**: Measures how long each key is pressed
- **Flight Time Tracking**: Time between consecutive keystrokes
- **Typing Speed**: Overall typing rhythm and pace
- **Pattern Recognition**: Unique typing signature for each user

### Mouse Movement Patterns
- **Movement Speed**: Average cursor velocity
- **Trajectory Analysis**: Path patterns and curves
- **Click Timing**: Click intervals and double-click speed
- **Scroll Behavior**: Smooth vs jerky scrolling patterns

### Touch Gestures (Mobile)
- **Tap Duration**: How long fingers touch the screen
- **Swipe Speed**: Velocity of swipe gestures
- **Pressure Patterns**: Force applied to touchscreen
- **Gesture Recognition**: Tap, swipe, and multi-touch patterns

### Continuous Authentication
- **Real-Time Monitoring**: Constantly verifies user behavior
- **Confidence Scoring**: Dynamic trust levels (0-100)
- **Adaptive Response**: Requests re-auth when anomalies detected
- **Learning Phase**: Builds behavioral profile over 3 sessions

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Modern web browser

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

### 3. Access the Application

Open your browser and navigate to:
```
http://localhost:3001
```

## 🔐 Test Accounts

### Demo User
- **Username**: `demo`
- **Password**: `demo123`

### Admin User
- **Username**: `admin`
- **Password**: `admin123`

## 📱 Application Pages

### Public Pages
- **Home** (`/`): Landing page with feature overview
- **Login** (`/auth/login`): Login with behavioral tracking

### Authenticated Pages
- **Dashboard** (`/dashboard`): Overview with real-time confidence monitoring
- **Profile** (`/dashboard/profile`): Behavioral profile and history
- **Analysis** (`/dashboard/analysis`): Detailed behavioral analytics
- **Typing Test** (`/dashboard/typing-test`): Test keystroke dynamics
- **Mouse Test** (`/dashboard/mouse-test`): Test mouse movement patterns
- **Touch Test** (`/dashboard/touch-test`): Test touch gestures (mobile)
- **Continuous Auth** (`/dashboard/continuous-auth`): Real-time monitoring demo

## 🎯 Testing Scenarios

### Scenario 1: Learning Phase (First 3 Sessions)
1. Login with test account
2. System collects behavioral data without strict verification
3. Builds your unique behavioral profile
4. After 3 sessions, full authentication is enabled

### Scenario 2: Normal Behavior (High Confidence)
1. Login and interact naturally
2. Type as you normally do
3. Move mouse naturally
4. Confidence score stays high (90-100)

### Scenario 3: Abnormal Behavior (Low Confidence)
1. Try typing much faster or slower than usual
2. Move mouse erratically
3. Use different clicking patterns
4. Watch confidence score drop
5. System may request re-authentication

### Scenario 4: Continuous Monitoring
1. Visit `/dashboard/continuous-auth`
2. Interact with the page
3. Watch real-time confidence updates
4. See immediate response to behavior changes

## 🏗️ Architecture

### Backend Components

#### Behavioral Engine (`services/behavioralEngine.js`)
- Analyzes keystroke, mouse, and touch data
- Calculates confidence scores
- Maintains user behavioral profiles
- Provides recommendations (ALLOW, MONITOR, CHALLENGE, BLOCK)

#### Authentication Routes (`routes/auth.js`)
- Handles login with behavioral data collection
- Manages sessions
- Re-authentication for low confidence

#### Dashboard Routes (`routes/dashboard.js`)
- Protected pages with auth middleware
- Test endpoints for behavioral analysis
- Real-time stats API

### Frontend Components

#### Behavioral Tracker (`public/js/behavioral-tracker.js`)
- Captures keystroke events (keydown, keyup)
- Tracks mouse movements and clicks
- Monitors touch gestures
- Sends data periodically for continuous auth
- Emits events for confidence updates

#### Views (EJS Templates)
- Responsive design
- Real-time confidence displays
- Interactive test pages
- Visual feedback for behavioral patterns

## 📊 Confidence Scoring

### Score Ranges

| Score | Level | Action |
|-------|-------|--------|
| 90-100 | VERY HIGH | Full access, no questions |
| 75-89 | HIGH | Normal access, enhanced monitoring |
| 60-74 | MEDIUM | Continue with close monitoring |
| 40-59 | LOW | Recommend re-authentication |
| 0-39 | VERY LOW | Block or require re-authentication |

### Scoring Weights

- **Keystroke Dynamics**: 40%
- **Mouse Dynamics**: 35%
- **Touch Dynamics**: 25%

### Analysis Factors

#### Keystroke Analysis
- Dwell time deviation from user's average
- Flight time variation
- Typing speed changes
- Pattern consistency

#### Mouse Analysis
- Movement speed deviation
- Click pattern changes
- Trajectory differences
- Scrolling behavior

#### Touch Analysis
- Tap duration differences
- Swipe speed variation
- Pressure pattern changes
- Gesture consistency

## 🎓 How It Works

### 1. Initial Login
- User enters username and password
- System captures typing rhythm while entering credentials
- If in learning phase, accepts data without strict verification
- If profile exists, compares against established patterns

### 2. Profile Building (Learning Phase)
- First 3 sessions collect behavioral data
- System calculates average metrics:
  - Keystroke dwell times
  - Flight times between keys
  - Mouse movement speeds
  - Touch gesture patterns
- Builds unique behavioral signature

### 3. Continuous Authentication
- After profile established, monitors behavior in real-time
- Every 10-30 seconds (configurable):
  - Collects recent behavioral data
  - Calculates confidence score
  - Compares against user profile
  - Updates trust level

### 4. Adaptive Response
- **High Confidence**: Continue session normally
- **Medium Confidence**: Increase monitoring frequency
- **Low Confidence**: Prompt for re-authentication
- **Critical**: Block access, require manual verification

## 🔧 Configuration

### Behavioral Tracker Options

```javascript
const tracker = new BehavioralTracker({
  sendInterval: 30000,        // Send data every 30 seconds
  maxKeystrokeBuffer: 100,    // Max keystrokes to store
  maxMouseBuffer: 200,        // Max mouse events
  maxTouchBuffer: 100,        // Max touch events
  continuousMode: true        // Enable continuous sending
});
```

### Server Configuration

Edit in `server.js`:

```javascript
const PORT = process.env.PORT || 3001;

// Session configuration
session({
  secret: 'your-secret-key',
  cookie: {
    secure: false,  // Set true in production with HTTPS
    maxAge: 30 * 60 * 1000  // 30 minutes
  }
})
```

## 🛡️ Security Considerations

### For Demo Purposes Only

This is an educational demonstration. For production use:

1. **Use Real Database**: Replace in-memory storage
2. **Secure Sessions**: Use Redis or similar for session storage
3. **HTTPS Only**: Always use HTTPS in production
4. **Enhanced Encryption**: Encrypt behavioral data
5. **Rate Limiting**: Add per-user rate limiting
6. **Audit Logging**: Implement comprehensive logging
7. **Privacy Compliance**: Follow GDPR/CCPA guidelines
8. **Data Retention**: Define and enforce data retention policies

### Privacy Features

- Behavioral data is anonymized
- No actual keystrokes are stored (only timing data)
- Mouse coordinates are relative
- Data used only for authentication
- Clear data retention policy needed for production

## 📈 Production Enhancements

### Recommended Additions

- Machine learning for anomaly detection
- Multi-device profile management
- Behavioral biometric templates
- Integration with existing auth systems
- Mobile SDK for native apps
- Analytics dashboard for admins
- A/B testing for thresholds
- Fallback authentication methods

### Scaling Considerations

- Database for user profiles (PostgreSQL/MongoDB)
- Redis for session storage
- Message queue for async processing
- Load balancer for multiple instances
- CDN for static assets
- Monitoring and alerting (Prometheus/Grafana)

## 📊 API Endpoints

### Authentication
- `GET /auth/login` - Login page
- `POST /auth/login` - Process login with behavioral data
- `POST /auth/re-authenticate` - Re-authentication
- `GET /auth/logout` - Logout

### Dashboard
- `GET /dashboard` - Dashboard home
- `GET /dashboard/profile` - User profile
- `GET /dashboard/analysis` - Behavioral analysis
- `GET /dashboard/typing-test` - Typing test page
- `GET /dashboard/mouse-test` - Mouse test page
- `GET /dashboard/touch-test` - Touch test page
- `GET /dashboard/continuous-auth` - Continuous auth demo
- `GET /dashboard/api/stats` - Behavioral stats API
- `POST /dashboard/api/typing-test` - Submit typing test
- `POST /dashboard/api/mouse-test` - Submit mouse test

### Behavioral
- `POST /api/behavioral-check` - Real-time behavior analysis

## 🧪 Testing the Application

### Manual Testing Checklist

- [ ] Login with demo account
- [ ] Complete learning phase (3 sessions)
- [ ] Test typing test page
- [ ] Test mouse tracking page
- [ ] Test continuous authentication
- [ ] Try abnormal behavior to trigger low confidence
- [ ] Test re-authentication flow
- [ ] Check profile page shows data
- [ ] Verify analysis page displays charts
- [ ] Test logout functionality

### Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (for touch testing)

## 📄 Project Structure

```
behavioral-auth-demo/
├── server.js                    # Main application server
├── package.json                 # Dependencies and scripts
├── routes/
│   ├── auth.js                 # Authentication routes
│   └── dashboard.js            # Dashboard routes
├── services/
│   └── behavioralEngine.js     # Behavioral analysis engine
├── views/                      # EJS templates
│   ├── index.ejs              # Home page
│   ├── login.ejs              # Login page
│   ├── dashboard.ejs          # Dashboard
│   ├── profile.ejs            # Profile page
│   ├── analysis.ejs           # Analysis page
│   ├── typing-test.ejs        # Typing test
│   ├── mouse-test.ejs         # Mouse test
│   ├── touch-test.ejs         # Touch test
│   ├── continuous-auth.ejs    # Continuous auth demo
│   ├── 404.ejs                # Not found page
│   └── error.ejs              # Error page
└── public/
    ├── css/
    │   └── style.css          # Application styles
    └── js/
        └── behavioral-tracker.js  # Client-side tracking
```

## 📚 Learning Resources

This demo implements concepts from the behavioral authentication documentation:

- `/behavioral-authentication/basic/` - Fundamental concepts
- `/behavioral-authentication/intermediate/` - Implementation patterns
- `/behavioral-authentication/advanced/` - Advanced techniques

## 🤝 Contributing

This is an educational project. Feel free to:
- Report issues
- Suggest improvements
- Fork and experiment
- Share feedback

## 📄 License

MIT License - Educational purposes only

## 💡 Key Takeaways

1. **Continuous authentication** provides ongoing verification, not just at login
2. **Behavioral biometrics** are unique to each person, like a digital fingerprint
3. **Adaptive security** responds dynamically to threat levels
4. **User experience** can be seamless while maintaining strong security
5. **Privacy** must be carefully balanced with security needs

---

**⚠️ Important**: This is a demonstration application for educational purposes. Do not use in production without proper security hardening, privacy compliance, and additional security controls.

**Built with ❤️ to showcase behavioral authentication patterns**
