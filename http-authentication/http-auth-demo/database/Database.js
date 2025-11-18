/**
 * In-Memory Database with Schema
 * Simulates a real database for HTTP authentication demo
 */

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class Database {
  constructor() {
    // Tables
    this.users = new Map();
    this.sessions = new Map();
    this.tokens = new Map();
    this.apiKeys = new Map();
    this.refreshTokens = new Map();
    this.auditLogs = [];
    
    // Initialize with demo data
    this.initialize();
  }
  
  async initialize() {
    console.log('Initializing in-memory database...');
    
    // Create demo users
    await this.createUser({
      username: 'admin',
      password: 'admin123',
      email: 'admin@example.com',
      role: 'admin',
      displayName: 'Administrator'
    });
    
    await this.createUser({
      username: 'user',
      password: 'user123',
      email: 'user@example.com',
      role: 'user',
      displayName: 'Regular User'
    });
    
    await this.createUser({
      username: 'api_user',
      password: 'api123',
      email: 'api@example.com',
      role: 'api',
      displayName: 'API User'
    });
    
    console.log(`Database initialized with ${this.users.size} users`);
  }
  
  // ============================================
  // USER OPERATIONS
  // ============================================
  
  async createUser(userData) {
    const userId = uuidv4();
    
    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 10);
    
    // Calculate HA1 for Digest authentication
    const ha1 = crypto
      .createHash('md5')
      .update(`${userData.username}:HTTP Auth Demo:${userData.password}`)
      .digest('hex');
    
    const user = {
      id: userId,
      username: userData.username,
      email: userData.email,
      displayName: userData.displayName || userData.username,
      passwordHash,
      ha1, // For Digest Auth
      role: userData.role || 'user',
      apiKey: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null,
      stats: {
        loginCount: 0,
        failedLoginAttempts: 0,
        lastFailedLogin: null
      }
    };
    
    this.users.set(userId, user);
    this.logAudit('user_created', userId, { username: user.username });
    
    return user;
  }
  
  getUserById(id) {
    return this.users.get(id);
  }
  
  getUserByUsername(username) {
    return Array.from(this.users.values()).find(u => u.username === username);
  }
  
  getUserByEmail(email) {
    return Array.from(this.users.values()).find(u => u.email === email);
  }
  
  async verifyPassword(user, password) {
    return bcrypt.compare(password, user.passwordHash);
  }
  
  recordLogin(userId) {
    const user = this.users.get(userId);
    if (user) {
      user.lastLogin = new Date().toISOString();
      user.stats.loginCount++;
      user.stats.failedLoginAttempts = 0;
      this.logAudit('login_success', userId, { username: user.username });
    }
  }
  
  recordFailedLogin(userId) {
    const user = this.users.get(userId);
    if (user) {
      user.stats.failedLoginAttempts++;
      user.stats.lastFailedLogin = new Date().toISOString();
      this.logAudit('login_failed', userId, { username: user.username });
    }
  }
  
  getAllUsers() {
    return Array.from(this.users.values()).map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      lastLogin: u.lastLogin,
      loginCount: u.stats.loginCount
    }));
  }
  
  // ============================================
  // SESSION OPERATIONS
  // ============================================
  
  createSession(userId, authMethod) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      userId,
      authMethod,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      lastActivity: new Date().toISOString()
    };
    
    this.sessions.set(sessionId, session);
    this.logAudit('session_created', userId, { sessionId, authMethod });
    
    return session;
  }
  
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    // Check expiration
    if (new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }
    
    // Update last activity
    session.lastActivity = new Date().toISOString();
    
    return session;
  }
  
  deleteSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.logAudit('session_deleted', session.userId, { sessionId });
      this.sessions.delete(sessionId);
    }
  }
  
  deleteUserSessions(userId) {
    const userSessions = Array.from(this.sessions.entries())
      .filter(([_, session]) => session.userId === userId);
    
    userSessions.forEach(([sessionId, _]) => {
      this.sessions.delete(sessionId);
    });
    
    return userSessions.length;
  }
  
  // ============================================
  // TOKEN OPERATIONS (Bearer Tokens/JWT)
  // ============================================
  
  createToken(userId, tokenString, expiresIn = 3600) {
    const tokenId = uuidv4();
    const token = {
      id: tokenId,
      userId,
      token: tokenString,
      type: 'bearer',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      revoked: false
    };
    
    this.tokens.set(tokenId, token);
    this.logAudit('token_created', userId, { tokenId, type: 'bearer' });
    
    return token;
  }
  
  getTokenByString(tokenString) {
    return Array.from(this.tokens.values()).find(t => 
      t.token === tokenString && !t.revoked
    );
  }
  
  revokeToken(tokenId) {
    const token = this.tokens.get(tokenId);
    if (token) {
      token.revoked = true;
      token.revokedAt = new Date().toISOString();
      this.logAudit('token_revoked', token.userId, { tokenId });
    }
  }
  
  // ============================================
  // API KEY OPERATIONS
  // ============================================
  
  async createApiKey(userId, name) {
    const apiKeyId = uuidv4();
    const apiKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
    const apiKeyHash = await bcrypt.hash(apiKey, 10);
    
    const key = {
      id: apiKeyId,
      userId,
      name,
      keyHash: apiKeyHash,
      keyPrefix: apiKey.substring(0, 10) + '...',
      createdAt: new Date().toISOString(),
      lastUsed: null,
      usageCount: 0,
      active: true
    };
    
    this.apiKeys.set(apiKeyId, key);
    this.logAudit('api_key_created', userId, { apiKeyId, name });
    
    // Return full key only once
    return { ...key, apiKey };
  }
  
  async verifyApiKey(apiKeyString) {
    const keys = Array.from(this.apiKeys.values()).filter(k => k.active);
    
    for (const key of keys) {
      const isValid = await bcrypt.compare(apiKeyString, key.keyHash);
      if (isValid) {
        // Update usage stats
        key.lastUsed = new Date().toISOString();
        key.usageCount++;
        return key;
      }
    }
    
    return null;
  }
  
  getApiKeysByUser(userId) {
    return Array.from(this.apiKeys.values())
      .filter(k => k.userId === userId);
  }
  
  revokeApiKey(apiKeyId) {
    const key = this.apiKeys.get(apiKeyId);
    if (key) {
      key.active = false;
      key.revokedAt = new Date().toISOString();
      this.logAudit('api_key_revoked', key.userId, { apiKeyId });
    }
  }
  
  // ============================================
  // REFRESH TOKEN OPERATIONS
  // ============================================
  
  createRefreshToken(userId) {
    const tokenId = uuidv4();
    const tokenString = crypto.randomBytes(32).toString('hex');
    
    const token = {
      id: tokenId,
      userId,
      token: tokenString,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      used: false
    };
    
    this.refreshTokens.set(tokenId, token);
    this.logAudit('refresh_token_created', userId, { tokenId });
    
    return token;
  }
  
  getRefreshToken(tokenString) {
    const token = Array.from(this.refreshTokens.values())
      .find(t => t.token === tokenString && !t.used);
    
    if (!token) return null;
    
    // Check expiration
    if (new Date(token.expiresAt) < new Date()) {
      return null;
    }
    
    return token;
  }
  
  useRefreshToken(tokenId) {
    const token = this.refreshTokens.get(tokenId);
    if (token) {
      token.used = true;
      token.usedAt = new Date().toISOString();
    }
  }
  
  // ============================================
  // AUDIT LOG OPERATIONS
  // ============================================
  
  logAudit(action, userId, details = {}) {
    this.auditLogs.push({
      id: uuidv4(),
      action,
      userId,
      details,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 1000 logs
    if (this.auditLogs.length > 1000) {
      this.auditLogs.shift();
    }
  }
  
  getAuditLogs(limit = 100) {
    return this.auditLogs
      .slice(-limit)
      .reverse();
  }
  
  getUserAuditLogs(userId, limit = 50) {
    return this.auditLogs
      .filter(log => log.userId === userId)
      .slice(-limit)
      .reverse();
  }
  
  // ============================================
  // STATISTICS
  // ============================================
  
  getStats() {
    return {
      users: this.users.size,
      activeSessions: this.sessions.size,
      activeTokens: Array.from(this.tokens.values()).filter(t => !t.revoked).length,
      apiKeys: this.apiKeys.size,
      activeApiKeys: Array.from(this.apiKeys.values()).filter(k => k.active).length,
      totalLogins: Array.from(this.users.values())
        .reduce((sum, u) => sum + u.stats.loginCount, 0),
      auditLogs: this.auditLogs.length
    };
  }
  
  // ============================================
  // CLEANUP
  // ============================================
  
  cleanup() {
    const now = new Date();
    
    // Clean expired sessions
    let expiredSessions = 0;
    for (const [sessionId, session] of this.sessions.entries()) {
      if (new Date(session.expiresAt) < now) {
        this.sessions.delete(sessionId);
        expiredSessions++;
      }
    }
    
    // Clean expired tokens
    let expiredTokens = 0;
    for (const [tokenId, token] of this.tokens.entries()) {
      if (new Date(token.expiresAt) < now) {
        this.tokens.delete(tokenId);
        expiredTokens++;
      }
    }
    
    return { expiredSessions, expiredTokens };
  }
}

// Export singleton instance
const database = new Database();

// Cleanup every 5 minutes
setInterval(() => {
  const cleaned = database.cleanup();
  if (cleaned.expiredSessions > 0 || cleaned.expiredTokens > 0) {
    console.log('Database cleanup:', cleaned);
  }
}, 5 * 60 * 1000);

module.exports = database;
