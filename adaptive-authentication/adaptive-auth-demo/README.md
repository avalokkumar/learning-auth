# Adaptive Authentication Demo

A comprehensive demonstration of adaptive (risk-based) authentication using Node.js and Express.

## 🎯 Features

### Real-Time Risk Assessment
- **Multi-Factor Risk Scoring**: Combines device, location, time, behavioral, and historical factors
- **Dynamic Risk Calculation**: Real-time assessment for every action
- **Weighted Risk Engine**: Configurable weights for different risk factors

### Security Features
- **Device Fingerprinting**: Tracks and identifies known/unknown devices
- **Location Analysis**: GeoIP-based location tracking with impossible travel detection
- **Time-Based Analysis**: Evaluates access patterns based on time and day
- **Behavioral Monitoring**: Tracks login patterns and suspicious activities
- **Step-Up Authentication**: Additional verification for high-risk scenarios

### User Experience
- **Adaptive MFA**: Only prompts for additional verification when risk is elevated
- **Transparent Risk Display**: Shows users their current risk score
- **Detailed Analytics**: Comprehensive risk analysis dashboard
- **Session Management**: Secure session handling with risk-aware timeouts

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn

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
http://localhost:3000
```

## 🔐 Test Accounts

### Demo User
- **Username**: `demo`
- **Password**: `demo123`

### Admin User
- **Username**: `admin`
- **Password**: `admin123`

### MFA Verification Code
When prompted for additional verification, use: **`123456`**

## 📱 Application Pages

### Public Pages
- **Home** (`/`): Landing page with feature overview
- **Login** (`/auth/login`): Authentication page with risk assessment

### Authenticated Pages
- **Dashboard** (`/dashboard`): Overview with current risk score
- **Profile** (`/dashboard/profile`): User profile with device and location history
- **Settings** (`/dashboard/settings`): Account settings (sensitive operations)
- **Transfer** (`/dashboard/transfer`): High-risk operation demonstration
- **Risk Analysis** (`/dashboard/risk-analysis`): Detailed risk breakdown and analytics

## 🎲 Testing Different Risk Scenarios

### Low Risk Scenario
- Login from same device/location multiple times
- Access during business hours
- Regular user behavior

### Medium Risk Scenario
- Login from a new browser or device
- Access outside typical hours
- First-time location

### High Risk Scenario
- Try to transfer large amounts
- Change account settings
- Multiple failed login attempts

### Critical Risk Scenario
- Rapidly switching between different IP addresses would trigger impossible travel
- Multiple failed login attempts in short time

## 🏗️ Architecture

### Risk Engine Components

#### 1. Device Risk Assessment
- Device fingerprinting
- Known device detection
- Browser and OS analysis
- Mobile vs desktop risk scoring

#### 2. Location Risk Assessment
- GeoIP lookup
- Known location verification
- Impossible travel detection
- High-risk country identification

#### 3. Time-Based Risk Assessment
- Business hours evaluation
- User's typical login patterns
- Weekend/late-night access detection

#### 4. Behavioral Risk Assessment
- Failed login attempt tracking
- Rapid request detection
- Sensitive operation flagging

#### 5. Historical Risk Assessment
- Account age evaluation
- Login frequency analysis
- Security incident tracking

### Risk Levels

| Score | Level | Action |
|-------|-------|--------|
| 0-19 | VERY LOW | Allow immediately |
| 20-39 | LOW | Allow with enhanced monitoring |
| 40-59 | MEDIUM | Require MFA (email/SMS) |
| 60-79 | HIGH | Require strong MFA + additional verification |
| 80-100 | CRITICAL | Block access, require manual review |

## 📂 Project Structure

```
adaptive-auth-demo/
├── server.js                 # Main application server
├── package.json             # Dependencies and scripts
├── routes/
│   ├── auth.js              # Authentication routes
│   └── dashboard.js         # Dashboard routes
├── services/
│   └── riskEngine.js        # Risk assessment engine
├── views/
│   ├── index.ejs            # Home page
│   ├── login.ejs            # Login page
│   ├── verify.ejs           # MFA verification
│   ├── dashboard.ejs        # Dashboard
│   ├── profile.ejs          # Profile page
│   ├── settings.ejs         # Settings page
│   ├── transfer.ejs         # Transfer page
│   ├── stepup.ejs           # Step-up authentication
│   ├── risk-analysis.ejs    # Risk analysis
│   ├── blocked.ejs          # Blocked access
│   ├── 404.ejs              # Not found
│   └── error.ejs            # Error page
└── public/
    └── css/
        └── style.css        # Application styles
```

## 🔧 Configuration

### Session Settings
Edit in `server.js`:
```javascript
session({
  secret: 'your-secret-key',
  cookie: {
    secure: true,  // Set to true in production with HTTPS
    maxAge: 30 * 60 * 1000  // 30 minutes
  }
})
```

### Risk Engine Weights
Edit in `services/riskEngine.js`:
```javascript
const weights = {
  device: 0.25,
  location: 0.30,
  time: 0.15,
  behavioral: 0.20,
  historical: 0.10
};
```

## 🛡️ Security Considerations

### For Demo Purposes Only
This is an educational demonstration. For production use:

1. **Use Real Database**: Replace in-memory storage with a real database
2. **Secure Sessions**: Use Redis or similar for session storage
3. **Environment Variables**: Store secrets in environment variables
4. **HTTPS Only**: Always use HTTPS in production
5. **Real MFA**: Implement actual OTP/TOTP verification
6. **Rate Limiting**: Add proper rate limiting per IP/user
7. **Logging**: Implement comprehensive audit logging
8. **Monitoring**: Add real-time security monitoring

### Production Enhancements

- Integrate with SIEM systems
- Implement machine learning for anomaly detection
- Add support for hardware security keys
- Integrate with threat intelligence feeds
- Implement certificate-based authentication
- Add biometric authentication support

## 📊 API Endpoints

### Authentication
- `GET /auth/login` - Login page
- `POST /auth/login` - Process login
- `GET /auth/verify` - MFA verification page
- `POST /auth/verify` - Process MFA verification
- `GET /auth/logout` - Logout

### Dashboard
- `GET /dashboard` - Dashboard home
- `GET /dashboard/profile` - User profile
- `GET /dashboard/settings` - Account settings
- `POST /dashboard/settings/email` - Change email
- `POST /dashboard/settings/password` - Change password
- `GET /dashboard/transfer` - Transfer page
- `POST /dashboard/transfer` - Process transfer
- `GET /dashboard/stepup` - Step-up authentication
- `POST /dashboard/stepup` - Process step-up
- `GET /dashboard/risk-analysis` - Risk analysis page
- `GET /dashboard/api/risk-check` - Real-time risk check API

## 🧪 Testing the Application

### Test Case 1: Normal Login (Low Risk)
1. Open in normal browser
2. Login with demo/demo123
3. Should see low risk score
4. Access granted immediately

### Test Case 2: New Device (Medium Risk)
1. Open in incognito/private window
2. Login with demo/demo123
3. Should see elevated risk score
4. May require MFA verification

### Test Case 3: Sensitive Operation (High Risk)
1. Login normally
2. Navigate to Transfer page
3. Try to transfer funds
4. Should see step-up authentication if risk is elevated

### Test Case 4: Multiple Failed Attempts
1. Try logging in with wrong password 3-4 times
2. Then login with correct password
3. Should see high risk score due to failed attempts

## 📈 Monitoring and Metrics

The application tracks:
- Login attempts (success/failure)
- Risk scores over time
- Device registrations
- Location changes
- Sensitive operations

Access detailed metrics at: `/dashboard/risk-analysis`

## 🤝 Contributing

This is an educational project. Feel free to:
- Report issues
- Suggest improvements
- Fork and experiment
- Share feedback

## 📄 License

MIT License - Educational purposes only

## 🔗 Related Documentation

See the parent directory for comprehensive documentation on:
- Basic adaptive authentication concepts
- Intermediate implementation patterns
- Advanced risk scoring algorithms
- Industry best practices

## 💡 Learning Resources

This demo implements concepts from:
- `/adaptive-authentication/basic/` - Fundamental concepts
- `/adaptive-authentication/intermediate/` - Implementation patterns
- `/adaptive-authentication/advanced/` - Advanced techniques

## 📞 Support

For questions or issues with this demo:
1. Check the documentation in parent directories
2. Review the risk engine code in `services/riskEngine.js`
3. Test with different scenarios to understand behavior

---

**⚠️ Important**: This is a demonstration application for educational purposes. Do not use in production without proper security hardening and implementation of additional security controls.
