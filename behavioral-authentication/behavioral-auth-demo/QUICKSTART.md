# 🚀 Quick Start Guide

## Get Started in 60 Seconds

### 1. Install Dependencies (if not already done)

```bash
npm install
```

### 2. Start the Server

```bash
npm start
```

### 3. Open in Browser

```
http://localhost:3001
```

### 4. Login

Use one of these test accounts:
- **Username**: `demo` | **Password**: `demo123`
- **Username**: `admin` | **Password**: `admin123`

## 🎯 What to Try

### First Login (Learning Phase)

1. **Login normally** - The system is learning your behavior
2. **Notice the "Learning Phase" indicator** on the dashboard
3. **Complete 3 sessions** to build your behavioral profile
4. Watch your keystroke and mouse patterns being collected

### After Profile Built

1. **Visit Dashboard** - See your confidence score in real-time
2. **Go to Typing Test** (`/dashboard/typing-test`) - Test your keystroke dynamics
3. **Try Mouse Test** (`/dashboard/mouse-test`) - Analyze your mouse patterns
4. **Test Continuous Auth** (`/dashboard/continuous-auth`) - See real-time monitoring

### Trigger Low Confidence

Try these to see adaptive responses:

1. **Type very slowly or very fast** - Different from your normal pace
2. **Move mouse erratically** - Random patterns vs your usual style
3. **Change clicking patterns** - Fast double-clicks vs slow clicks
4. **Watch the confidence score drop** and see re-auth prompts

## 📊 Understanding the Dashboard

### Confidence Levels

- **90-100 (VERY HIGH)**: 🟢 Everything normal - full access
- **75-89 (HIGH)**: 🟢 Good - continue normally
- **60-74 (MEDIUM)**: 🟡 Monitoring closely
- **40-59 (LOW)**: 🟠 Consider re-authentication
- **0-39 (VERY LOW)**: 🔴 Requires re-authentication

### What's Being Tracked

**Keystroke Dynamics:**
- How long you hold each key (dwell time)
- Time between keystrokes (flight time)
- Overall typing speed and rhythm

**Mouse Patterns:**
- Movement speed and trajectory
- Click timing and patterns
- Scrolling behavior

**Touch Gestures (Mobile):**
- Tap duration and pressure
- Swipe speed and direction
- Multi-touch patterns

## 🧪 Testing Scenarios

### Scenario 1: Normal Usage (High Confidence)

1. Login with demo account
2. Type and move mouse naturally
3. Navigate between pages
4. **Expected Result**: Confidence stays 90-100

### Scenario 2: Abnormal Behavior (Low Confidence)

1. Login with demo account
2. Type much slower/faster than usual
3. Move mouse in random patterns
4. **Expected Result**: Confidence drops to 40-60

### Scenario 3: Continuous Monitoring

1. Go to `/dashboard/continuous-auth`
2. Type in the text area
3. Move mouse around
4. Watch confidence update every 10 seconds
5. **Expected Result**: Real-time gauge movement

### Scenario 4: Re-Authentication

1. Trigger low confidence (see Scenario 2)
2. System prompts for re-authentication
3. Enter password again
4. **Expected Result**: Confidence restored

## 🔍 Exploring Features

### View Your Profile

```
http://localhost:3001/dashboard/profile
```

See your behavioral statistics:
- Average keystroke metrics
- Mouse movement patterns
- Confidence score history

### Analyze Behavior

```
http://localhost:3001/dashboard/analysis
```

Detailed analytics showing:
- Behavioral trends over time
- Pattern variations
- Anomaly detection

### Run Tests

**Typing Test:**
```
http://localhost:3001/dashboard/typing-test
```
Type the given sentence to analyze keystroke dynamics

**Mouse Test:**
```
http://localhost:3001/dashboard/mouse-test
```
Move mouse and click targets to test patterns

**Touch Test (Mobile):**
```
http://localhost:3001/dashboard/touch-test
```
Use touch gestures to analyze mobile patterns

## 📱 Mobile Testing

### Access from Mobile Device

1. Find your computer's IP address
2. Ensure mobile is on same network
3. Visit: `http://YOUR_IP:3001`
4. Test touch gestures on Touch Test page

## 🛠️ Troubleshooting

### Server Won't Start

```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill existing process if needed
kill -9 <PID>

# Or change port in server.js
const PORT = process.env.PORT || 3002;
```

### Can't See Confidence Score

- Make sure you're logged in
- Wait 10-15 seconds after interacting
- Check browser console for errors
- Ensure JavaScript is enabled

### Learning Phase Not Completing

- Must complete 3 full login sessions
- Each session should have significant interaction
- Logout and login again to increment session count

### Behavioral Data Not Tracking

- Check browser console for JavaScript errors
- Ensure `/js/behavioral-tracker.js` is loading
- Interact with the page (type, move mouse)
- Check Network tab for API calls to `/api/behavioral-check`

## 💡 Tips for Best Experience

1. **Use Chrome or Firefox** - Best compatibility
2. **Type naturally** - Don't try to "fool" the system initially
3. **Complete learning phase** - First 3 sessions are crucial
4. **Give it time** - Behavioral analysis takes a few seconds
5. **Try different pages** - Each page tracks different behaviors

## 🎓 Learning More

### Understanding Behavioral Auth

Read the documentation:
- `behavioral-authentication/basic/README.md` - Core concepts
- `behavioral-authentication/intermediate/README.md` - Implementation
- `behavioral-authentication/advanced/README.md` - Advanced topics

### Code Structure

```
server.js                     # Main server
routes/auth.js                # Login/logout routes
routes/dashboard.js           # Protected pages
services/behavioralEngine.js  # Analysis engine
public/js/behavioral-tracker.js  # Client-side tracking
views/*.ejs                   # Page templates
```

## 🚦 Quick Commands

```bash
# Start server
npm start

# Start with auto-reload (development)
npm run dev

# Stop server
Ctrl+C

# View logs
# Check terminal where server is running
```

## 📊 API Endpoints (for developers)

### Behavioral Check
```bash
POST /api/behavioral-check
Content-Type: application/json

{
  "keystrokeData": [...],
  "mouseData": [...],
  "touchData": [...]
}
```

### Dashboard Stats
```bash
GET /dashboard/api/stats
```

## ✅ Verification Checklist

- [ ] Server starts without errors
- [ ] Can access http://localhost:3001
- [ ] Can login with demo/demo123
- [ ] Dashboard displays confidence score
- [ ] Can navigate to all pages
- [ ] Behavioral data is being tracked (check console)
- [ ] Profile page shows statistics
- [ ] Tests can be completed
- [ ] Logout works

## 🎉 Success!

You're now experiencing behavioral authentication! The system is:
- ✅ Tracking your unique behavioral patterns
- ✅ Calculating confidence scores in real-time
- ✅ Adapting security based on your behavior
- ✅ Providing seamless continuous authentication

---

**Need help?** Check the full [README.md](./README.md) for detailed documentation.

**Found a bug?** This is a demo - experiment and learn!
