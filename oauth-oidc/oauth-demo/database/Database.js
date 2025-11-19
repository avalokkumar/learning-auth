/**
 * In-Memory Database for OAuth/OIDC Demo
 * Stores users, sessions, and OAuth tokens
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class Database {
  constructor() {
    // Tables
    this.users = new Map();
    this.sessions = new Map();
    this.oauthSessions = new Map();
    this.auditLogs = [];
    
    // Initialize
    this.initialize();
  }
  
  initialize() {
    console.log('Initializing OAuth database...');
    
    // Clear all data for fresh start
    this.users.clear();
    this.sessions.clear();
    this.oauthSessions.clear();
    this.auditLogs = [];
    
    console.log('Database initialized');
  }
  
  // ============================================
  // USER OPERATIONS
  // ============================================
  
  createUser(userData) {
    const userId = uuidv4();
    
    const user = {
      id: userId,
      email: userData.email,
      displayName: userData.displayName || userData.email,
      givenName: userData.givenName || '',
      familyName: userData.familyName || '',
      avatar: userData.avatar || userData.picture || null,
      provider: userData.provider, // 'google', 'microsoft', 'github'
      providerId: userData.providerId,
      accessToken: this.encrypt(userData.accessToken || ''),
      refreshToken: this.encrypt(userData.refreshToken || ''),
      idToken: userData.idToken || null,
      tokenExpiry: userData.tokenExpiry || null,
      scopes: userData.scopes || [],
      rawProfile: userData.rawProfile || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      stats: {
        loginCount: 1,
        lastProvider: userData.provider
      }
    };
    
    this.users.set(userId, user);
    this.logAudit('user_created', userId, { provider: userData.provider, email: userData.email });
    
    return user;
  }
  
  getUserById(id) {
    return this.users.get(id);
  }
  
  getUserByEmail(email) {
    return Array.from(this.users.values()).find(u => u.email === email);
  }
  
  getUserByProvider(provider, providerId) {
    return Array.from(this.users.values())
      .find(u => u.provider === provider && u.providerId === providerId);
  }
  
  updateUser(userId, updates) {
    const user = this.users.get(userId);
    if (user) {
      Object.assign(user, updates, { updatedAt: new Date().toISOString() });
      this.logAudit('user_updated', userId, updates);
    }
    return user;
  }
  
  recordLogin(userId, provider) {
    const user = this.users.get(userId);
    if (user) {
      user.lastLogin = new Date().toISOString();
      user.stats.loginCount++;
      user.stats.lastProvider = provider;
      this.logAudit('user_login', userId, { provider });
    }
  }
  
  updateTokens(userId, tokens) {
    const user = this.users.get(userId);
    if (user) {
      if (tokens.accessToken) {
        user.accessToken = this.encrypt(tokens.accessToken);
      }
      if (tokens.refreshToken) {
        user.refreshToken = this.encrypt(tokens.refreshToken);
      }
      if (tokens.idToken) {
        user.idToken = tokens.idToken;
      }
      if (tokens.expiresIn) {
        user.tokenExpiry = new Date(Date.now() + tokens.expiresIn * 1000).toISOString();
      }
      user.updatedAt = new Date().toISOString();
      this.logAudit('tokens_updated', userId, { provider: user.provider });
    }
  }
  
  getDecryptedTokens(userId) {
    const user = this.users.get(userId);
    if (!user) return null;
    
    return {
      accessToken: this.decrypt(user.accessToken),
      refreshToken: this.decrypt(user.refreshToken),
      idToken: user.idToken,
      tokenExpiry: user.tokenExpiry
    };
  }
  
  getAllUsers() {
    return Array.from(this.users.values()).map(u => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      avatar: u.avatar,
      provider: u.provider,
      lastLogin: u.lastLogin,
      loginCount: u.stats.loginCount
    }));
  }
  
  // ============================================
  // SESSION OPERATIONS
  // ============================================
  
  createSession(userId) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      lastActivity: new Date().toISOString()
    };
    
    this.sessions.set(sessionId, session);
    this.logAudit('session_created', userId, { sessionId });
    
    return session;
  }
  
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    if (new Date(session.expiresAt) < new Date()) {
      this.sessions.delete(sessionId);
      return null;
    }
    
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
  
  // ============================================
  // OAUTH SESSION OPERATIONS
  // ============================================
  
  createOAuthSession(data) {
    const sessionId = uuidv4();
    const oauthSession = {
      id: sessionId,
      userId: data.userId,
      provider: data.provider,
      accessToken: this.encrypt(data.accessToken),
      refreshToken: data.refreshToken ? this.encrypt(data.refreshToken) : null,
      idToken: data.idToken || null,
      scopes: data.scopes || [],
      expiresAt: data.expiresAt,
      createdAt: new Date().toISOString()
    };
    
    this.oauthSessions.set(sessionId, oauthSession);
    this.logAudit('oauth_session_created', data.userId, { provider: data.provider });
    
    return oauthSession;
  }
  
  getOAuthSessionsByUser(userId) {
    return Array.from(this.oauthSessions.values())
      .filter(s => s.userId === userId && new Date(s.expiresAt) > new Date());
  }
  
  deleteOAuthSession(sessionId) {
    const session = this.oauthSessions.get(sessionId);
    if (session) {
      this.logAudit('oauth_session_deleted', session.userId, { sessionId });
      this.oauthSessions.delete(sessionId);
    }
  }
  
  // ============================================
  // ENCRYPTION/DECRYPTION
  // ============================================
  
  encrypt(text) {
    if (!text) return '';
    // Simple encryption for demo (use proper encryption in production)
    const key = 'demo-encryption-key-change-in-production';
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }
  
  decrypt(encrypted) {
    if (!encrypted) return '';
    try {
      const key = 'demo-encryption-key-change-in-production';
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      return '';
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
    return this.auditLogs.slice(-limit).reverse();
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
    const users = Array.from(this.users.values());
    
    const providerCounts = users.reduce((acc, user) => {
      acc[user.provider] = (acc[user.provider] || 0) + 1;
      return acc;
    }, {});
    
    return {
      users: this.users.size,
      activeSessions: this.sessions.size,
      oauthSessions: this.oauthSessions.size,
      totalLogins: users.reduce((sum, u) => sum + u.stats.loginCount, 0),
      providers: providerCounts,
      auditLogs: this.auditLogs.length
    };
  }
  
  // ============================================
  // CLEANUP
  // ============================================
  
  cleanup() {
    const now = new Date();
    let cleaned = 0;
    
    // Clean expired sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (new Date(session.expiresAt) < now) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }
    
    // Clean expired OAuth sessions
    for (const [sessionId, session] of this.oauthSessions.entries()) {
      if (new Date(session.expiresAt) < now) {
        this.oauthSessions.delete(sessionId);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

// Export singleton instance
const database = new Database();

// Cleanup every 10 minutes
setInterval(() => {
  const cleaned = database.cleanup();
  if (cleaned > 0) {
    console.log(`Database cleanup: removed ${cleaned} expired items`);
  }
}, 10 * 60 * 1000);

module.exports = database;
