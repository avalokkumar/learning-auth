# Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies (Already Done!)
```bash
npm install
```

### Step 2: Start the Server
```bash
npm start
```

### Step 3: Open Your Browser
Navigate to: **http://localhost:3000**

---

## 🎮 Testing Scenarios

### Scenario 1: Normal Login (Low Risk)
**Goal**: Experience a standard, low-risk authentication flow

1. Open http://localhost:3000
2. Click "Try Demo Login"
3. Login with:
   - Username: `demo`
   - Password: `demo123`
4. **Expected Result**: ✅ Direct access granted with LOW risk score

### Scenario 2: New Device Detection (Medium Risk)
**Goal**: Trigger device-based risk elevation

1. Open a **new incognito/private browser window**
2. Navigate to http://localhost:3000/auth/login
3. Login with:
   - Username: `demo`
   - Password: `demo123`
4. **Expected Result**: 🟡 Higher risk score due to unknown device
5. You may be prompted for MFA verification (enter `123456`)

### Scenario 3: Failed Login Attempts (Behavioral Risk)
**Goal**: See how failed attempts affect risk scoring

1. Navigate to login page
2. Try logging in with **wrong password** 3 times
3. Then login with correct credentials:
   - Username: `demo`
   - Password: `demo123`
4. **Expected Result**: 🟠 Elevated risk score due to failed attempts

### Scenario 4: High-Risk Operation (Transfer)
**Goal**: Experience step-up authentication

1. Login normally
2. Navigate to **Dashboard** → **Transfer Funds**
3. Try to transfer a large amount (e.g., $50,000)
4. **Expected Result**: 🔴 May require additional verification based on current risk level

### Scenario 5: Multiple Sessions
**Goal**: Test concurrent session handling

1. Login in your main browser
2. Copy your session cookie to another browser
3. Try accessing from both simultaneously
4. **Expected Result**: Session tracking and device identification

---

## 📊 Understanding Risk Scores

### Risk Levels

| Score | Level | Badge | What You'll See |
|-------|-------|-------|-----------------|
| 0-19 | VERY LOW | 🟢 | Immediate access |
| 20-39 | LOW | 🟢 | Access with monitoring |
| 40-59 | MEDIUM | 🟡 | MFA required |
| 60-79 | HIGH | 🟠 | Strong MFA + verification |
| 80-100 | CRITICAL | 🔴 | Access blocked |

### Risk Factors

The system evaluates:
- **Device (25%)**: Known vs unknown device, OS version, browser
- **Location (30%)**: Known location, impossible travel, country risk
- **Time (15%)**: Business hours, typical login times
- **Behavioral (20%)**: Failed attempts, rapid requests
- **Historical (10%)**: Account age, login frequency, security incidents

---

## 🔍 Exploring the Dashboard

### Pages to Explore

1. **Dashboard** (`/dashboard`)
   - Overview of current session
   - Real-time risk score
   - Quick action buttons

2. **Profile** (`/dashboard/profile`)
   - Account information
   - Known devices list
   - Known locations
   - Current risk assessment

3. **Risk Analysis** (`/dashboard/risk-analysis`)
   - Detailed risk breakdown
   - Score by category
   - Top risk factors
   - Recent login attempts
   - Location information

4. **Transfer** (`/dashboard/transfer`)
   - High-risk operation simulation
   - Risk-based verification
   - Transaction processing

5. **Settings** (`/dashboard/settings`)
   - Change email (sensitive)
   - Change password (sensitive)
   - Both may trigger step-up auth

---

## 🧪 Advanced Testing

### Test API Endpoint
Check real-time risk score via API:

```bash
# First, login and copy your session cookie, then:
curl -X GET http://localhost:3000/dashboard/api/risk-check \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -H "Content-Type: application/json"
```

### Simulate Different IPs
To test location-based risk (requires proxy or VPN):

1. Login from your normal location
2. Use VPN to change apparent location
3. Try to access sensitive operations
4. Observe elevated risk score

### Test Impossible Travel
This is harder to simulate without actual travel, but you can:

1. Modify the `riskEngine.js` to use test coordinates
2. Set last location to far away
3. Login again to trigger impossible travel detection

---

## 🎯 What to Look For

### Visual Indicators

1. **Risk Score Badge**: Color-coded by level
   - Green = Low risk
   - Yellow = Medium risk  
   - Orange = High risk
   - Red = Critical risk

2. **Risk Breakdown Bars**: Shows contribution of each factor

3. **Alerts**: Warning messages for elevated risk

4. **Step-Up Prompts**: Additional verification requests

### Backend Logs

Watch the terminal for:
- Login attempts
- Risk calculations
- Transfer requests
- Device/location changes

---

## 💡 Tips for Best Demo Experience

1. **Start Fresh**: Use incognito for new device simulation
2. **Multiple Browsers**: Test with Chrome, Firefox, Safari to see device detection
3. **Different Times**: Login at different hours to see time-based risk changes
4. **Various Actions**: Try different operations to see adaptive responses
5. **Check Analytics**: Visit Risk Analysis page after each action

---

## 🐛 Troubleshooting

### Server Won't Start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process if needed
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

### Cannot Login
- Verify credentials: `demo/demo123` or `admin/admin123`
- Check browser console for errors
- Clear cookies and try again

### Risk Score Always Low
- Try incognito mode for new device
- Clear application data between tests
- Check that GeoIP is working (not all IPs have location data)

### MFA Code Not Accepted
- Use exactly: `123456`
- This is a hardcoded demo code

---

## 📱 Mobile Testing

Test on mobile to see:
- Mobile device detection
- Touch-based behavioral analysis
- Responsive design
- Different risk profiles for mobile vs desktop

---

## 🔐 Security Notes

**Remember**: This is a DEMO application!

For production, you would need:
- Real database (not in-memory)
- Actual OTP/TOTP implementation
- HTTPS/TLS encryption
- Rate limiting per user
- Session persistence
- Audit logging
- Machine learning models
- Threat intelligence feeds

---

## 📞 Need Help?

Check:
1. Terminal logs for errors
2. Browser console for client-side issues
3. README.md for detailed documentation
4. Source code comments for implementation details

---

**Happy Testing! 🎉**

Try to "beat" the system by:
- Logging in from unusual locations
- Attempting rapid fire requests
- Using different devices
- Performing high-risk operations

See how the adaptive authentication responds!
