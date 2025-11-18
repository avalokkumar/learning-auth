# 🚀 Quick Start Guide - HTTP Authentication Demo

## ✅ Server Status

**The application is now running at: http://localhost:3006**

---

## 🎯 What's Included?

This demo showcases **4 HTTP authentication methods**:
1. **🔓 HTTP Basic Auth** - Simple Base64-encoded credentials
2. **🔐 HTTP Digest Auth** - MD5 hashing with nonce for security
3. **🎫 Bearer Token (JWT)** - Modern token-based authentication
4. **🔑 API Key Auth** - Simple key-based authentication

**All methods work with real implementations - NO mock data!**

---

## 📋 Quick Access (3 Steps)

### Step 1: Login to Web UI

**Demo Credentials:**
- Username: `admin`
- Password: `admin123`

Alternative users:
- Username: `user` / Password: `user123`
- Username: `api_user` / Password: `api123`

**Visit:** http://localhost:3006/login

### Step 2: Explore the Dashboard

After login, you'll see:
- **User statistics** - Login count, last login
- **System statistics** - Total users, API keys, sessions
- **Quick actions** - Generate API keys, test auth methods

### Step 3: Test Authentication Methods

**Web UI:** http://localhost:3006/auth-demo
- Test Basic Auth interactively
- Generate JWT tokens
- Create API keys
- Test multi-auth endpoints

---

## 🔧 Testing Each Auth Method

### 1️⃣ HTTP Basic Auth

**Web UI Test:**
1. Login to dashboard
2. Go to "Test Auth" page
3. Click "Test Basic Auth"
4. Enter your password
5. See the API response

**Command Line:**
```bash
# Method 1: Using -u flag
curl -u admin:admin123 http://localhost:3006/api/basic/user

# Method 2: Using Authorization header
curl -H "Authorization: Basic YWRtaW46YWRtaW4xMjM=" \
  http://localhost:3006/api/basic/user
```

**Expected Response:**
```json
{
  "message": "Authenticated with HTTP Basic Auth",
  "authMethod": "basic",
  "user": {
    "id": "...",
    "username": "admin",
    "email": "admin@example.com",
    "displayName": "Administrator",
    "role": "admin"
  }
}
```

**How It Works:**
1. Client sends `Authorization: Basic base64(username:password)`
2. Server decodes Base64
3. Server verifies password with bcrypt
4. Server returns user data

### 2️⃣ HTTP Digest Auth

**Command Line (requires curl):**
```bash
# Digest auth requires special support
curl --digest -u admin:admin123 http://localhost:3006/api/digest/user
```

**What Happens:**
```
1. Client: GET /api/digest/user
2. Server: 401 + WWW-Authenticate (nonce, realm, qop)
3. Client: Calculate MD5(HA1:nonce:nc:cnonce:qop:HA2)
4. Client: Send Authorization: Digest with response hash
5. Server: Verify hash
6. Server: 200 OK + data
```

**Security Features:**
- Password never sent (only hash)
- Nonce prevents replay attacks
- Counter (nc) tracks request sequence
- More secure than Basic auth

### 3️⃣ Bearer Token (JWT)

**Web UI Test:**
1. Login to dashboard
2. Go to "Test Auth" page
3. Click "Get Token"
4. Enter your password
5. Token displayed (copy it!)
6. Click "Test Bearer Auth"
7. See authenticated response

**Command Line:**
```bash
# Step 1: Get Token
curl -X POST http://localhost:3006/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Response:
# {
#   "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "refresh_token": "a1b2c3d4...",
#   "token_type": "Bearer",
#   "expires_in": 3600
# }

# Step 2: Use Access Token
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:3006/api/bearer/user

# Step 3: Refresh Token (when expired)
curl -X POST http://localhost:3006/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"YOUR_REFRESH_TOKEN"}'
```

**Token Lifespan:**
- **Access Token:** 1 hour
- **Refresh Token:** 7 days

**JWT Structure:**
```
Header:  { "alg": "HS256", "typ": "JWT" }
Payload: { "sub": "userId", "username": "admin", "role": "admin", "exp": ... }
Signature: HMACSHA256(base64(header) + "." + base64(payload), secret)
```

### 4️⃣ API Key Auth

**Web UI Test:**
1. Login to dashboard
2. Navigate to "API Keys" page
3. Click "Generate New Key"
4. Enter a name (e.g., "Test Key")
5. **IMPORTANT:** Copy the key immediately (shown only once!)
6. Go to "Test Auth" page
7. Use the generated key to test

**Or use "Test Auth" page:**
1. Click "Generate API Key"
2. Key is automatically generated and displayed
3. Click "Test API Key"
4. See authenticated response

**Command Line:**
```bash
# Method 1: X-API-Key header (recommended)
curl -H "X-API-Key: sk_your_api_key_here" \
  http://localhost:3006/api/apikey/user

# Method 2: Authorization header
curl -H "Authorization: ApiKey sk_your_api_key_here" \
  http://localhost:3006/api/apikey/user
```

**API Key Format:**
- Prefix: `sk_` (secret key)
- 64 hexadecimal characters
- Example: `sk_a1b2c3d4e5f6...`

**Security:**
- Keys stored as bcrypt hashes
- Only prefix shown in UI (sk_...)
- Full key shown once at generation
- Usage tracked (last used, count)
- Easy revocation

---

## 🌐 Multi-Auth Endpoints

Some endpoints accept **multiple authentication methods**:

**Test Endpoint:**
```bash
# Any of these work:

# Basic Auth
curl -u admin:admin123 http://localhost:3006/api/user

# Bearer Token
curl -H "Authorization: Bearer TOKEN" http://localhost:3006/api/user

# API Key
curl -H "X-API-Key: KEY" http://localhost:3006/api/user

# Digest Auth
curl --digest -u admin:admin123 http://localhost:3006/api/user
```

**Response includes which method was used:**
```json
{
  "message": "Authenticated successfully",
  "authMethod": "basic",  // or "bearer", "apikey", "digest"
  "user": { ... }
}
```

---

## 📊 In-Memory Database Features

### Real Database Schema

**Users Table:**
- ID, username, email, password hash, HA1 (for Digest), role
- Login statistics: count, last login, failed attempts
- Created/updated timestamps

**Sessions Table:**
- Session ID, user ID, auth method, expiration
- Automatic cleanup of expired sessions

**Tokens Table:**
- JWT tokens with expiration tracking
- Revocation support
- Token type (access/refresh)

**API Keys Table:**
- Key hash (bcrypt), user ID, name
- Usage statistics: count, last used
- Active/revoked status

**Audit Logs:**
- All authentication events
- User actions
- Failed login attempts
- Session creation/deletion

### Data Persistence

Data is stored **in-memory** during runtime:
- ✅ Fast access (no disk I/O)
- ✅ Perfect for demos and testing
- ⚠️ Data lost on server restart
- ⚠️ Not suitable for production

**For production:** Use PostgreSQL, MySQL, or MongoDB

---

## 🔍 Testing Workflows

### Workflow 1: Basic Web Login

```
1. Visit http://localhost:3006
2. Click "Login"
3. Enter: admin / admin123
4. Redirected to dashboard
5. View your statistics
6. Navigate pages (Profile, API Keys)
7. Logout
```

### Workflow 2: Generate and Test API Key

```
1. Login to dashboard
2. Click "API Keys"
3. Click "Generate New Key"
4. Name it "My Test Key"
5. Copy the full key: sk_a1b2c3d4...
6. Test in terminal:
   curl -H "X-API-Key: YOUR_KEY" http://localhost:3006/api/apikey/user
7. Check key usage in dashboard
```

### Workflow 3: JWT Token Flow

```
1. Get token:
   curl -X POST http://localhost:3006/auth/token \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"admin123"}'

2. Copy access_token from response

3. Use token:
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3006/api/bearer/user

4. After 1 hour, token expires

5. Refresh token:
   curl -X POST http://localhost:3006/auth/refresh \
     -H "Content-Type: application/json" \
     -d '{"refresh_token":"YOUR_REFRESH_TOKEN"}'

6. Get new access_token
```

### Workflow 4: Multi-Auth Testing

```
1. Test with Basic Auth:
   curl -u admin:admin123 http://localhost:3006/api/profile

2. Generate API key in dashboard

3. Test same endpoint with API key:
   curl -H "X-API-Key: YOUR_KEY" http://localhost:3006/api/profile

4. Get Bearer token

5. Test same endpoint with token:
   curl -H "Authorization: Bearer TOKEN" http://localhost:3006/api/profile

6. All three methods access same endpoint!
```

---

## 📚 Understanding the Methods

### When to Use Each Method

**HTTP Basic Auth:**
- ✅ Simple internal APIs
- ✅ Development/staging environments
- ✅ Quick prototypes
- ❌ Not for production (unless HTTPS)
- ❌ Credentials sent with every request

**HTTP Digest Auth:**
- ✅ Better than Basic (password not sent)
- ✅ Legacy system compatibility
- ❌ MD5 is deprecated
- ❌ Complex implementation
- ❌ Modern alternatives preferred

**Bearer Token (JWT):**
- ✅ Modern web APIs
- ✅ Stateless authentication
- ✅ Mobile apps
- ✅ Microservices
- ✅ OAuth 2.0 compatible
- ✅ Cross-domain requests

**API Key:**
- ✅ Server-to-server
- ✅ Automation scripts
- ✅ Third-party integrations
- ✅ Simple and fast
- ❌ No user context
- ❌ Harder to rotate

### Security Comparison

| Method | Password Sent | Stateless | Revocable | Complexity |
|--------|--------------|-----------|-----------|------------|
| Basic | Yes (Base64) | No | No | Low |
| Digest | No (Hash) | No | No | High |
| Bearer | No (Token) | Yes | Yes | Medium |
| API Key | No (Key) | Yes | Yes | Low |

---

## 🎯 API Endpoints Summary

### Authentication Endpoints

```
POST /auth/login          - Web login (username/password)
POST /auth/logout         - Web logout
POST /auth/token          - Get JWT token
POST /auth/refresh        - Refresh JWT token
POST /auth/api-key        - Generate API key
DELETE /auth/api-key/:id  - Revoke API key
```

### Protected API Endpoints

```
GET /api/health           - Health check (no auth)
GET /api/public           - Public endpoint (optional auth)

GET /api/basic/user       - Basic auth only
GET /api/digest/user      - Digest auth only
GET /api/bearer/user      - Bearer token only
GET /api/apikey/user      - API key only

GET /api/user             - Multi-auth (any method)
GET /api/profile          - Multi-auth (any method)
GET /api/users            - Multi-auth (admin only)
GET /api/audit            - Multi-auth (admin only)

GET /api/resources        - CRUD example
POST /api/resources       - Create resource
GET /api/resources/:id    - Get resource
PUT /api/resources/:id    - Update resource
DELETE /api/resources/:id - Delete resource
```

---

## 💡 Pro Tips

### Tip 1: Use curl -v for Debugging

```bash
# See full HTTP exchange
curl -v -u admin:admin123 http://localhost:3006/api/basic/user

# Watch for:
# - WWW-Authenticate header (challenge)
# - Authorization header (credentials)
# - Response status codes
```

### Tip 2: Save API Keys Securely

```bash
# Store in environment variable
export API_KEY="sk_your_key_here"

# Use in requests
curl -H "X-API-Key: $API_KEY" http://localhost:3006/api/apikey/user
```

### Tip 3: Check Audit Logs

Login as admin and visit:
- http://localhost:3006/api/audit (all logs)
- http://localhost:3006/api/audit/me (your logs)

### Tip 4: Test Error Responses

```bash
# Wrong password
curl -u admin:wrongpass http://localhost:3006/api/basic/user

# Expired token
curl -H "Authorization: Bearer expired_token" http://localhost:3006/api/bearer/user

# Invalid API key
curl -H "X-API-Key: invalid_key" http://localhost:3006/api/apikey/user
```

---

## ✅ You're Ready!

Your HTTP authentication demo is fully functional:

✅ **4 authentication methods** - All working end-to-end
✅ **Real database** - In-memory with proper schema
✅ **Web interface** - Login, dashboard, profile, API keys
✅ **API endpoints** - 20+ endpoints to test
✅ **Security features** - bcrypt hashing, JWT, audit logs
✅ **Documentation** - Complete API docs

**Start testing:** http://localhost:3006

**Login:** admin / admin123

**Test API:**
```bash
curl -u admin:admin123 http://localhost:3006/api/user
```

Happy authenticating! 🔐✨
