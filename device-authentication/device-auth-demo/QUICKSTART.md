# 🚀 Quick Start Guide - Device Authentication Demo

## ✅ Server Status

**The application is now running at: http://localhost:3004**

---

## 🎯 What's Included?

This demo showcases **5 device authentication methods**:
1. **API Key Authentication** - Secure keys for device-to-server communication
2. **Device Fingerprinting** - Identify devices by hardware/software characteristics
3. **Certificate-Based (mTLS)** - X.509 certificates for mutual authentication
4. **Service Accounts** - Non-human accounts for automated processes
5. **Machine-to-Machine (M2M)** - Service-to-service authentication

**All methods work with real implementations - NO mock data!**

---

## 📋 Quick Access (3 Steps)

### Step 1: Login to Dashboard

**Credentials:**
- Username: `admin`
- Password: `admin123`

Alternative user:
- Username: `device-manager`
- Password: `manager123`

### Step 2: Explore the Dashboard

After login, you'll see:
- **5 registered devices** (4 active, 1 pending)
- **3 service accounts** (all active)
- Real-time statistics
- Device trust levels

### Step 3: Test Features

Quick links after login:
- **Register New Device** - Add IoT device, mobile app, or server
- **View Devices** - See all registered devices
- **Generate API Keys** - Create keys for devices
- **Service Accounts** - Manage service accounts
- **Test Fingerprinting** - See your device fingerprint

---

## 🔑 Pre-Generated Test Data

### Test Devices (with API Keys)

1. **Smart Thermostat**
   - API Key: `sk_live_T0_uwJ_MPRbnPanex85HSrAv8XMU3GFNrnmjeiM3-Ik`
   - Type: IoT Device
   - Status: Active | Verified

2. **Security Camera**
   - API Key: `sk_live_2nZUQZTt8QRkVzbMHthjjSiMwAgLAnPdNn3RLTa_wwQ`
   - Type: IoT Device
   - Status: Active | Trusted

3. **Mobile App (iPhone)**
   - API Key: `sk_live_xLyIk7sY8qXC2UtiOh5uZgOprS_KTv8JM_2bZ9wH-IE`
   - Type: Mobile
   - Status: Active | Verified

4. **Backend API Server**
   - API Key: `sk_live_b-evNkiQA1fimWg0lAHrXmIjGSOMXbxAmkiPy2OPg3g`
   - Type: Server
   - Status: Active | Trusted

### Test Service Accounts (with API Keys)

1. **Backup Service**
   - API Key: `sa_live_xU73Mo8X3EGRw2q_iNJ8dM7LHsM-haNMGp_89QkvRFs`
   - Permissions: read, backup

2. **Monitoring Service**
   - API Key: `sa_live_TezOHvGDKbdOtGfuDeRumn3SbzlN1zKEyBHXzc2I0ME`
   - Permissions: read, monitor, alert

3. **Data Integration**
   - API Key: `sa_live_Yckm9Qtspv5UejcZ9ZFLsjwYnkcmGmov6t0ZURNFArE`
   - Permissions: read, write

---

## 🧪 Test API Endpoints

### 1. Test Device Authentication

```bash
# Get device information
curl -H "X-API-Key: sk_live_T0_uwJ_MPRbnPanex85HSrAv8XMU3GFNrnmjeiM3-Ik" \
  http://localhost:3004/api/device/info
```

**Expected Response:**
```json
{
  "id": "...",
  "deviceId": "DEV-...",
  "name": "Smart Thermostat",
  "type": "iot",
  "status": "active",
  "trustLevel": "verified"
}
```

### 2. Send Telemetry Data

```bash
# Send device telemetry
curl -X POST \
  -H "X-API-Key: sk_live_T0_uwJ_MPRbnPanex85HSrAv8XMU3GFNrnmjeiM3-Ik" \
  -H "Content-Type: application/json" \
  -d '{"temperature": 72, "humidity": 45, "status": "ok"}' \
  http://localhost:3004/api/telemetry
```

**Expected Response:**
```json
{
  "success": true,
  "timestamp": "2024-11-16T...",
  "message": "Telemetry received"
}
```

### 3. Get Device Status

```bash
# Check device status
curl -H "X-API-Key: sk_live_T0_uwJ_MPRbnPanex85HSrAv8XMU3GFNrnmjeiM3-Ik" \
  http://localhost:3004/api/device/status
```

### 4. Test Device Fingerprinting

```bash
# Get your device fingerprint (no auth required)
curl http://localhost:3004/api/fingerprint
```

**Response includes:**
- Unique fingerprint hash
- Browser details
- Operating system
- Device model
- Confidence score

### 5. Health Check

```bash
# API health check (no auth required)
curl http://localhost:3004/api/health
```

---

## 📱 Web Interface Features

### 1. Device Management

**Register New Device:**
1. Click "Register Device"
2. Enter device name, type, manufacturer, model
3. Optional: MAC address, serial number
4. Device gets unique ID and fingerprint

**Generate API Key:**
1. Go to device details page
2. Click "Generate API Key"
3. **⚠️ IMPORTANT:** Copy the key immediately (shown only once!)
4. Use in API requests with `X-API-Key` header

### 2. Device Fingerprinting Demo

**Test Your Device:**
1. Dashboard → "Test Fingerprinting"
2. View your unique fingerprint hash
3. See collected characteristics:
   - Browser name and version
   - Operating system
   - Device model
   - CPU architecture
   - Network info
4. Check confidence score

**How it works:**
- Collects browser user agent
- Analyzes HTTP headers
- Creates SHA-256 hash
- Detects bots and humans

### 3. Service Account Management

**Create Service Account:**
1. Navigate to "Service Accounts" → "Create"
2. Enter name and description
3. Select type (service, integration, backup, monitoring)
4. Set permissions and scopes
5. Generate API key
6. **⚠️ Save the key!** (shown only once)

**Use Cases:**
- **Backup Service**: Automated nightly backups
- **Monitoring Service**: Real-time system monitoring
- **Data Integration**: Third-party API connections

### 4. API Key Management

**View All Keys:**
- Devices with API keys
- Service accounts
- Key prefixes (full keys never shown again)
- Usage statistics

**Rate Limits:**
- Devices: 60 req/min, 1000 req/day
- Service Accounts: 100 req/min, 1000 req/hour, 10000 req/day

### 5. Trust Levels

**Device Trust Progression:**
1. **Unknown** → First connection, no credentials
2. **Registered** → Device registered in system
3. **Verified** → API key generated, identity verified
4. **Trusted** → Proven track record, full access

**View Trust Levels:**
- Dashboard shows breakdown by trust level
- Color-coded badges
- Update trust level manually (admin only)

---

## 🎯 Common Workflows

### Workflow 1: Register IoT Device

```bash
1. Web UI: Register device with name "Smart Light Bulb"
2. Web UI: Generate API key → Copy key
3. Terminal: Test API key
   curl -H "X-API-Key: YOUR_KEY" http://localhost:3004/api/device/info
4. Device: Use key in production IoT device
5. Web UI: Monitor device connections and telemetry
```

### Workflow 2: Create Monitoring Service

```bash
1. Web UI: Create service account "Health Monitor"
2. Web UI: Set permissions: read, monitor, alert
3. Terminal: Test service account API key
   curl -H "X-API-Key: sa_live_..." http://localhost:3004/api/device/status
4. Service: Deploy monitoring service with key
5. Web UI: View service account usage stats
```

### Workflow 3: Device Fingerprinting

```bash
1. Web UI: Visit fingerprint demo page
2. View: Your unique device fingerprint
3. Web UI: Register device (fingerprint automatically captured)
4. Future: Device recognized by fingerprint on return
5. Alert: If fingerprint changes significantly (different device)
```

---

## 🔍 Feature Highlights

### 1. Real Authentication (Not Mock!)

✅ **API Key Service:**
- bcrypt hashing (10 rounds)
- Cryptographically secure generation (32 bytes)
- Format validation
- Rate limit checking

✅ **Device Fingerprinting:**
- Real user agent parsing (ua-parser-js)
- Hardware/software characteristic collection
- SHA-256 fingerprint hashing
- Change detection algorithm

✅ **Device Registry:**
- File-based persistence (JSON)
- In-memory caching
- Automatic save on changes
- Statistics tracking

### 2. Security Features

- **API Key Hashing**: Keys stored as bcrypt hashes, never plain text
- **Session Management**: Secure HTTP-only cookies, 30-min timeout
- **Rate Limiting**: Configurable per device/service account
- **Trust Levels**: Progressive access based on verification
- **Audit Trail**: Created by, modified by tracking
- **IP Whitelisting**: Service account IP restrictions

### 3. Real-World Patterns

- **Service Accounts**: Non-human accounts for automation
- **Permission System**: Granular access control
- **Scope Management**: Resource-level permissions
- **Key Rotation**: Expiration tracking
- **Usage Statistics**: Connection count, data transferred, failures

---

## 📊 Dashboard Overview

After login, the dashboard shows:

**Statistics Cards:**
- Total Devices: 5
- Active Devices: 4
- Service Accounts: 3
- Trusted Devices: 2

**Recent Devices:**
- Last 5 registered devices
- Quick access to details
- Status and trust level badges

**Quick Actions:**
- Register New Device
- Create Service Account
- Test Fingerprinting
- View All Devices

---

## 🛠️ Troubleshooting

### Issue: API Key Not Working

**Check:**
1. Key format correct? (sk_live_ or sa_live_ prefix)
2. Device status active?
3. Rate limit exceeded?
4. Using correct header: `X-API-Key`

**Solution:**
```bash
# Verify key format
echo "sk_live_T0_uwJ_..." | wc -c  # Should be > 50 chars

# Test with verbose curl
curl -v -H "X-API-Key: YOUR_KEY" http://localhost:3004/api/device/info
```

### Issue: Device Not Found

**Check:**
1. Device registered in system?
2. Correct device ID?
3. Device not deleted?

**Solution:**
- Visit http://localhost:3004/devices to see all devices
- Check device registry: `devices/registry.json`

### Issue: Fingerprint Not Recognized

**Causes:**
- Device characteristics changed (browser update, OS update)
- Different device/browser
- Fingerprint not registered

**Solution:**
1. Register device again to update fingerprint
2. Check confidence score (should be > 70%)
3. View characteristics to see what changed

---

## 🎓 Learning Points

### 1. API Key Best Practices
- Generate cryptographically secure keys (crypto.randomBytes)
- Hash before storage (bcrypt)
- Never log full keys
- Rotate regularly
- Different keys per environment

### 2. Device Fingerprinting
- Collect multiple characteristics for uniqueness
- Calculate confidence score
- Detect significant changes
- Useful for fraud detection
- Can work without cookies

### 3. Service Accounts
- Separate from user accounts
- Limited permissions (principle of least privilege)
- Can't login interactively
- Audited and monitored
- IP whitelisting for security

### 4. Trust Levels
- Start with low trust (unknown/registered)
- Progress based on verification
- Higher trust = more access
- Can downgrade on suspicious activity

---

## 🌐 API Endpoints Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | None | Health check |
| `/api/fingerprint` | GET | None | Get device fingerprint |
| `/api/device/info` | GET | API Key | Get device information |
| `/api/device/status` | GET | API Key | Get device status |
| `/api/telemetry` | POST | API Key | Send telemetry data |
| `/api/device/config` | POST | API Key | Update configuration |
| `/api/echo` | POST | API Key | Echo test |

---

## 🚀 You're Ready!

Your device authentication demo is fully functional with:

✅ **5 test devices** with real API keys
✅ **3 service accounts** ready to use
✅ **Real authentication** (not mocked!)
✅ **Working fingerprinting** system
✅ **API endpoints** for testing
✅ **Web dashboard** for management

**Start exploring:** http://localhost:3004

**Login:** admin / admin123

**Test API:** Use the pre-generated API keys above!

Happy testing! 🎉
