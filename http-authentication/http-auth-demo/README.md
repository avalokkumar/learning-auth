# 🔐 HTTP Authentication Demo

A comprehensive demonstration of all HTTP authentication methods with real implementations and in-memory database.

![dashboard page](image.png)

## 🌟 Features

### Supported Authentication Methods

1. **🔓 HTTP Basic Auth (RFC 7617)**
   - Simple Base64-encoded username:password
   - Built into browsers
   - Easy to implement

2. **🔐 HTTP Digest Auth (RFC 7616)**
   - MD5 hashing with nonce
   - Replay attack prevention
   - More secure than Basic

3. **🎫 Bearer Token Auth (RFC 6750)**
   - JSON Web Tokens (JWT)
   - Stateless authentication
   - Access and refresh tokens

4. **🔑 API Key Auth**
   - X-API-Key header
   - Simple and efficient
   - Perfect for automation

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
# Navigate to project directory
cd http-auth-demo

# Install dependencies
npm install

# Start the server
npm start
```

The application will be available at **http://localhost:3006**

### Default Credentials

**Admin User:**
- Username: `admin`
- Password: `admin123`

**Regular User:**
- Username: `user`
- Password: `user123`

**API User:**
- Username: `api_user`
- Password: `api123`

## 📋 Usage

### 1. Web Interface

#### Login
1. Visit http://localhost:3006
2. Click "Login"
3. Use credentials: `admin` / `admin123`
4. Access dashboard

#### Generate API Key
1. Login to dashboard
2. Navigate to "API Keys"
3. Click "Generate New Key"
4. Enter a name for the key
5. Copy the key (shown only once!)

#### Test Authentication Methods
1. Go to "Test Auth" page
2. Try different authentication methods
3. See real-time results

### 2. API Usage

#### HTTP Basic Auth

```bash
# Using curl with -u flag
curl -u admin:admin123 http://localhost:3006/api/basic/user

# Or with Authorization header
curl -H "Authorization: Basic YWRtaW46YWRtaW4xMjM=" \
  http://localhost:3006/api/basic/user
```

#### HTTP Digest Auth

```bash
# Requires --digest flag
curl --digest -u admin:admin123 \
  http://localhost:3006/api/digest/user
```

#### Bearer Token (JWT)

```bash
# Step 1: Get token
curl -X POST http://localhost:3006/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Response: { "access_token": "...", "refresh_token": "...", "expires_in": 3600 }

# Step 2: Use token
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:3006/api/bearer/user

# Step 3: Refresh token
curl -X POST http://localhost:3006/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"YOUR_REFRESH_TOKEN"}'
```

#### API Key Auth

```bash
# Using X-API-Key header
curl -H "X-API-Key: sk_your_api_key_here" \
  http://localhost:3006/api/apikey/user

# Or using Authorization header
curl -H "Authorization: ApiKey sk_your_api_key_here" \
  http://localhost:3006/api/apikey/user
```

#### Multi-Auth Endpoints

```bash
# Endpoint accepts multiple auth methods
# Use any of: Basic, Digest, Bearer, or API Key

curl -u admin:admin123 http://localhost:3006/api/user
# OR
curl -H "Authorization: Bearer TOKEN" http://localhost:3006/api/user
# OR
curl -H "X-API-Key: KEY" http://localhost:3006/api/user
```

## 🏗️ Project Structure

```
http-auth-demo/
├── server.js                      # Express server
├── package.json                   # Dependencies
├── database/
│   └── Database.js                # In-memory database with schema
├── models/                        # (Database handles models)
├── services/
│   ├── basicAuthService.js        # Basic authentication
│   ├── digestAuthService.js       # Digest authentication
│   ├── bearerAuthService.js       # Bearer token/JWT
│   └── apiKeyService.js           # API key management
├── middleware/
│   └── authMiddleware.js          # Authentication middleware
├── routes/
│   ├── web.js                     # Web UI routes
│   ├── auth.js                    # Authentication endpoints
│   └── api.js                     # API endpoints
├── views/                         # EJS templates
│   ├── index.ejs                  # Home page
│   ├── login.ejs                  # Login page
│   ├── dashboard.ejs              # Dashboard
│   ├── profile.ejs                # User profile
│   ├── api-keys.ejs               # API key management
│   ├── auth-demo.ejs              # Auth testing page
│   ├── docs.ejs                   # API documentation
│   ├── 404.ejs                    # Not found
│   └── error.ejs                  # Error page
└── public/
    └── css/
        └── style.css              # Application styles
```

## 🎯 Key Components

### In-Memory Database

The `Database.js` class provides:
- **User management** with bcrypt password hashing
- **Session storage** with expiration
- **Token management** (JWT access and refresh tokens)
- **API key storage** with bcrypt hashing
- **Audit logging** for all authentication events
- **Automatic cleanup** of expired sessions/tokens

### Authentication Services

#### Basic Auth Service
- Parses `Authorization: Basic` header
- Base64 decoding
- Password verification with bcrypt
- Challenge generation (WWW-Authenticate header)

#### Digest Auth Service
- Nonce generation and validation
- MD5 hashing with nonce
- Replay attack prevention (nonce count tracking)
- Challenge-response authentication
- Pre-calculated HA1 storage

#### Bearer Auth Service
- JWT generation and verification
- Access and refresh token flow
- Token revocation
- Expiration handling
- RFC 6750 compliant

#### API Key Service
- Cryptographically secure key generation
- bcrypt hashing for storage
- X-API-Key and Authorization header support
- Usage tracking
- Key revocation

### Authentication Middleware

Provides middleware for:
- `basicAuth` - HTTP Basic authentication
- `digestAuth` - HTTP Digest authentication
- `bearerAuth` - Bearer token authentication
- `apiKeyAuth` - API key authentication
- `multiAuth` - Accept multiple methods
- `sessionAuth` - Web session authentication
- `optionalAuth` - Optional authentication

## 📊 API Endpoints

### Public Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/public` | GET | Public endpoint (optional auth) |

### Basic Auth Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/basic/user` | GET | Basic | User information |
| `/api/basic/admin` | GET | Basic | Admin only |

### Digest Auth Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/digest/user` | GET | Digest | User information |
| `/api/digest/admin` | GET | Digest | Admin only |

### Bearer Token Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/bearer/user` | GET | Bearer | User information |
| `/api/bearer/admin` | GET | Bearer | Admin only |
| `/auth/token` | POST | None | Get JWT token |
| `/auth/refresh` | POST | None | Refresh access token |

### API Key Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/apikey/user` | GET | API Key | User information |
| `/api/apikey/admin` | GET | API Key | Admin only |
| `/auth/api-key` | POST | Session | Generate API key |
| `/auth/api-key/:id` | DELETE | Session | Revoke API key |

### Multi-Auth Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/user` | GET | Any | User information (accepts all auth methods) |
| `/api/profile` | GET | Any | Full profile with activity |
| `/api/users` | GET | Any | List all users (admin only) |
| `/api/audit` | GET | Any | Audit logs (admin only) |
| `/api/resources` | GET/POST/PUT/DELETE | Any | Example CRUD operations |

## 🔒 Security Features

### Password Security
- bcrypt hashing with 10 salt rounds
- Never store plain passwords
- Password verification timing attack protection

### Token Security
- JWT with HS256 algorithm
- Short-lived access tokens (1 hour)
- Long-lived refresh tokens (7 days)
- Token revocation support
- Nonce for replay attack prevention (Digest)

### API Key Security
- Cryptographically secure generation (32 bytes)
- bcrypt hashing for storage
- Usage tracking
- Easy revocation
- Key prefix visibility only

### Session Security
- HTTP-only cookies
- 30-minute expiration
- Secure flag (production)
- Session hijacking prevention

### Audit Logging
- All authentication attempts logged
- User activity tracking
- Failed login monitoring
- API usage statistics

## 🧪 Testing

### Test with curl

```bash
# Test Basic Auth
curl -v -u admin:admin123 http://localhost:3006/api/basic/user

# Test Digest Auth
curl -v --digest -u admin:admin123 http://localhost:3006/api/digest/user

# Test Bearer Token
TOKEN=$(curl -s -X POST http://localhost:3006/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

curl -v -H "Authorization: Bearer $TOKEN" http://localhost:3006/api/bearer/user

# Test API Key
curl -v -H "X-API-Key: your_api_key" http://localhost:3006/api/apikey/user
```

### Test with Browser

1. Visit http://localhost:3006/login
2. Login with credentials
3. Navigate to "Test Auth" page
4. Test each authentication method interactively

### Test with Postman

1. Import collection (if provided)
2. Set variables: `base_url`, `username`, `password`
3. Run tests for each auth method

## 📚 Understanding HTTP Auth

### Basic Auth Flow

```
Client                     Server
  |                          |
  |------ GET /api/user ---->|
  |                          |
  |<- 401 + WWW-Authenticate-|
  |    Basic realm="..."     |
  |                          |
  |-- Authorization: Basic --|
  |    Base64(user:pass)     |
  |                          |
  |<------ 200 OK + Data ----|
```

### Digest Auth Flow

```
Client                     Server
  |                          |
  |------ GET /api/user ---->|
  |                          |
  |<- 401 + WWW-Authenticate-|
  |    nonce, realm, qop     |
  |                          |
  |-- Authorization: Digest -|
  |    response=MD5(...)     |
  |                          |
  |<------ 200 OK + Data ----|
```

### Bearer Token Flow

```
Client                     Server
  |                          |
  |--- POST /auth/token ---->|
  |    {username, password}  |
  |                          |
  |<-- {access_token, ...}---|
  |                          |
  |-- Authorization: Bearer -|
  |    {access_token}        |
  |                          |
  |<------ 200 OK + Data ----|
```

## ⚠️ Production Considerations

This is a **demo application**. For production:

### Security
- Use HTTPS everywhere
- Stronger JWT secrets (environment variables)
- Rate limiting on authentication endpoints
- Account lockout after failed attempts
- CORS configuration
- Content Security Policy

### Storage
- Use PostgreSQL/MySQL instead of in-memory
- Redis for sessions and tokens
- Proper database migrations
- Data encryption at rest

### Infrastructure
- Load balancing
- Horizontal scaling
- Monitoring and alerting
- Log aggregation
- Backup strategy

### Authentication
- Multi-factor authentication
- OAuth 2.0 integration
- SAML support
- Account recovery flow
- Email verification

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3006
lsof -ti:3006 | xargs kill -9

# Or change port in server.js
const PORT = process.env.PORT || 3007;
```

### Digest Auth Not Working

Digest auth requires special client support. Use curl:
```bash
curl --digest -u admin:admin123 http://localhost:3006/api/digest/user
```

### Token Expired

Tokens expire after 1 hour. Get a new token:
```bash
curl -X POST http://localhost:3006/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## 📄 License

MIT License - Educational purposes

---

**Built for learning HTTP authentication concepts through hands-on implementation** 🚀
