/**
 * Advanced In-Memory Database for Password Authentication Demo
 * Implements security best practices and comprehensive tracking
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class Database {
  constructor() {
    // Core tables
    this.users = new Map();
    this.sessions = new Map();
    this.passwordHistory = new Map();
    this.failedAttempts = new Map();
    this.passwordResetTokens = new Map();
    this.accountLockouts = new Map();
    this.auditLogs = [];
    this.breachedPasswords = new Set();
    this.deviceTrust = new Map();
    
    this.initialize();
  }
  
  async initialize() {
    console.log('Initializing Password Auth database...');
    
    // Clear all data
    this.users.clear();
    this.sessions.clear();
    this.passwordHistory.clear();
    this.failedAttempts.clear();
    this.passwordResetTokens.clear();
    this.accountLockouts.clear();
    this.auditLogs = [];
    this.breachedPasswords.clear();
    this.deviceTrust.clear();
    
    // Add some known breached passwords for demo
    this.breachedPasswords.add('password123');
    this.breachedPasswords.add('123456');
    this.breachedPasswords.add('qwerty');
    this.breachedPasswords.add('admin');
    
    console.log('Database initialized');
  }
  
  // ============================================
  // USER OPERATIONS
  // ============================================
  
  createUser(userData) {
    const userId = uuidv4();
    
    const user = {
      id: userId,
      username: userData.username,
      email: userData.email.toLowerCase(),
      passwordHash: userData.passwordHash,
      passwordSalt: userData.passwordSalt,
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      phoneNumber: userData.phoneNumber || null,
      
      // Password policy
      passwordLastChanged: new Date().toISOString(),
      passwordExpiryDays: userData.passwordExpiryDays || 90,
      requirePasswordChange: false,
      
      // Account status
      isActive: true,
      isVerified: false,
      isLocked: false,
      lockReason: null,
      lockedUntil: null,
      
      // Security settings
      mfaEnabled: false,
      mfaSecret: null,
      trustedDevices: [],
      
      // OAuth integrations
      oauthProviders: [],
      googleId: null,
      githubId: null,
      
      // Metadata
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null,
      lastLoginIP: null,
      lastLoginDevice: null,
      
      // Statistics
      stats: {
        loginCount: 0,
        failedLoginCount: 0,
        passwordChangeCount: 0,
        lastFailedLogin: null
      }
    };
    
    this.users.set(userId, user);
    
    // Initialize password history
    this.passwordHistory.set(userId, [{
      passwordHash: userData.passwordHash,
      changedAt: new Date().toISOString()
    }]);
    
    this.logAudit('user_created', userId, { 
      username: userData.username, 
      email: userData.email 
    });
    
    return user;
  }
  
  getUserById(id) {
    return this.users.get(id);
  }
  
  getUserByUsername(username) {
    return Array.from(this.users.values())
      .find(u => u.username.toLowerCase() === username.toLowerCase());
  }
  
  getUserByEmail(email) {
    return Array.from(this.users.values())
      .find(u => u.email.toLowerCase() === email.toLowerCase());
  }
  
  getUserByOAuthProvider(provider, providerId) {
    return Array.from(this.users.values()).find(u => {
      if (provider === 'google') return u.googleId === providerId;
      if (provider === 'github') return u.githubId === providerId;
      return false;
    });
  }
  
  updateUser(userId, updates) {
    const user = this.users.get(userId);
    if (user) {
      Object.assign(user, updates, { updatedAt: new Date().toISOString() });
      this.logAudit('user_updated', userId, updates);
    }
    return user;
  }
  
  updatePassword(userId, newPasswordHash, newSalt) {
    const user = this.users.get(userId);
    if (!user) return false;
    
    // Update password
    user.passwordHash = newPasswordHash;
    user.passwordSalt = newSalt;
    user.passwordLastChanged = new Date().toISOString();
    user.requirePasswordChange = false;
    user.stats.passwordChangeCount++;
    user.updatedAt = new Date().toISOString();
    
    // Add to password history
    const history = this.passwordHistory.get(userId) || [];
    history.push({
      passwordHash: newPasswordHash,
      changedAt: new Date().toISOString()
    });
    
    // Keep only last 12 passwords
    if (history.length > 12) {
      history.shift();
    }
    this.passwordHistory.set(userId, history);
    
    // Clear failed attempts
    this.failedAttempts.delete(userId);
    
    this.logAudit('password_changed', userId, {});
    
    return true;
  }
  
  getPasswordHistory(userId) {
    return this.passwordHistory.get(userId) || [];
  }
  
  linkOAuthProvider(userId, provider, providerId, profile) {
    const user = this.users.get(userId);
    if (!user) return false;
    
    if (provider === 'google') {
      user.googleId = providerId;
    } else if (provider === 'github') {
      user.githubId = providerId;
    }
    
    if (!user.oauthProviders.includes(provider)) {
      user.oauthProviders.push(provider);
    }
    
    user.updatedAt = new Date().toISOString();
    this.logAudit('oauth_linked', userId, { provider });
    
    return true;
  }
  
  // ============================================
  // FAILED ATTEMPTS & ACCOUNT LOCKOUT
  // ============================================
  
  recordFailedAttempt(identifier, ipAddress) {
    const key = `${identifier}:${ipAddress}`;
    const attempts = this.failedAttempts.get(key) || {
      count: 0,
      firstAttempt: new Date().toISOString(),
      lastAttempt: null,
      attempts: []
    };
    
    attempts.count++;
    attempts.lastAttempt = new Date().toISOString();
    attempts.attempts.push({
      timestamp: new Date().toISOString(),
      ipAddress
    });
    
    // Keep only last 10 attempts
    if (attempts.attempts.length > 10) {
      attempts.attempts.shift();
    }
    
    this.failedAttempts.set(key, attempts);
    
    // Check if should lock account
    if (attempts.count >= 5) {
      this.lockAccount(identifier, 'too_many_failed_attempts', 15);
    }
    
    return attempts;
  }
  
  getFailedAttempts(identifier, ipAddress) {
    const key = `${identifier}:${ipAddress}`;
    return this.failedAttempts.get(key);
  }
  
  clearFailedAttempts(identifier, ipAddress) {
    const key = `${identifier}:${ipAddress}`;
    this.failedAttempts.delete(key);
  }
  
  lockAccount(userId, reason, durationMinutes = 30) {
    const user = this.users.get(userId);
    if (user) {
      user.isLocked = true;
      user.lockReason = reason;
      user.lockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
      
      this.accountLockouts.set(userId, {
        lockedAt: new Date().toISOString(),
        lockedUntil: user.lockedUntil,
        reason: reason
      });
      
      this.logAudit('account_locked', userId, { reason, durationMinutes });
    }
  }
  
  unlockAccount(userId) {
    const user = this.users.get(userId);
    if (user) {
      user.isLocked = false;
      user.lockReason = null;
      user.lockedUntil = null;
      this.accountLockouts.delete(userId);
      this.logAudit('account_unlocked', userId, {});
    }
  }
  
  isAccountLocked(userId) {
    const user = this.users.get(userId);
    if (!user || !user.isLocked) return false;
    
    // Check if lock has expired
    if (user.lockedUntil && new Date(user.lockedUntil) < new Date()) {
      this.unlockAccount(userId);
      return false;
    }
    
    return true;
  }
  
  // ============================================
  // PASSWORD RESET
  // ============================================
  
  createPasswordResetToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    this.passwordResetTokens.set(token, {
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      used: false
    });
    
    this.logAudit('password_reset_requested', userId, {});
    
    return token;
  }
  
  getPasswordResetToken(token) {
    const resetData = this.passwordResetTokens.get(token);
    if (!resetData) return null;
    
    // Check if expired
    if (new Date(resetData.expiresAt) < new Date()) {
      this.passwordResetTokens.delete(token);
      return null;
    }
    
    // Check if already used
    if (resetData.used) {
      return null;
    }
    
    return resetData;
  }
  
  markResetTokenAsUsed(token) {
    const resetData = this.passwordResetTokens.get(token);
    if (resetData) {
      resetData.used = true;
      this.logAudit('password_reset_completed', resetData.userId, {});
    }
  }
  
  // ============================================
  // SESSION MANAGEMENT
  // ============================================
  
  createSession(userId, metadata = {}) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      lastActivity: new Date().toISOString(),
      ipAddress: metadata.ipAddress || null,
      userAgent: metadata.userAgent || null,
      deviceFingerprint: metadata.deviceFingerprint || null,
      isActive: true
    };
    
    this.sessions.set(sessionId, session);
    
    // Update user last login
    const user = this.users.get(userId);
    if (user) {
      user.lastLogin = new Date().toISOString();
      user.lastLoginIP = metadata.ipAddress;
      user.lastLoginDevice = metadata.userAgent;
      user.stats.loginCount++;
    }
    
    this.logAudit('session_created', userId, { 
      sessionId,
      ipAddress: metadata.ipAddress 
    });
    
    return session;
  }
  
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    // Check if expired
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
  
  deleteAllUserSessions(userId) {
    let count = 0;
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(sessionId);
        count++;
      }
    }
    this.logAudit('all_sessions_deleted', userId, { count });
    return count;
  }
  
  // ============================================
  // DEVICE TRUST
  // ============================================
  
  trustDevice(userId, deviceFingerprint, deviceInfo) {
    const devices = this.deviceTrust.get(userId) || [];
    
    const device = {
      fingerprint: deviceFingerprint,
      name: deviceInfo.name || 'Unknown Device',
      trustedAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.userAgent
    };
    
    devices.push(device);
    this.deviceTrust.set(userId, devices);
    
    this.logAudit('device_trusted', userId, { deviceFingerprint });
  }
  
  isDeviceTrusted(userId, deviceFingerprint) {
    const devices = this.deviceTrust.get(userId) || [];
    return devices.some(d => d.fingerprint === deviceFingerprint);
  }
  
  getTrustedDevices(userId) {
    return this.deviceTrust.get(userId) || [];
  }
  
  removeTrustedDevice(userId, deviceFingerprint) {
    const devices = this.deviceTrust.get(userId) || [];
    const filtered = devices.filter(d => d.fingerprint !== deviceFingerprint);
    this.deviceTrust.set(userId, filtered);
    this.logAudit('device_untrusted', userId, { deviceFingerprint });
  }
  
  // ============================================
  // BREACH DETECTION
  // ============================================
  
  isPasswordBreached(password) {
    // In production, this would call HaveIBeenPwned API
    // For demo, checking against local list
    return this.breachedPasswords.has(password.toLowerCase());
  }
  
  // ============================================
  // AUDIT LOGS
  // ============================================
  
  logAudit(action, userId, details = {}) {
    this.auditLogs.push({
      id: uuidv4(),
      action,
      userId,
      details,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 5000 logs
    if (this.auditLogs.length > 5000) {
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
    
    return {
      totalUsers: this.users.size,
      activeUsers: users.filter(u => u.isActive).length,
      verifiedUsers: users.filter(u => u.isVerified).length,
      lockedAccounts: users.filter(u => u.isLocked).length,
      activeSessions: this.sessions.size,
      totalLogins: users.reduce((sum, u) => sum + u.stats.loginCount, 0),
      oauthLinked: users.filter(u => u.oauthProviders.length > 0).length,
      mfaEnabled: users.filter(u => u.mfaEnabled).length,
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
    
    // Clean expired password reset tokens
    for (const [token, resetData] of this.passwordResetTokens.entries()) {
      if (new Date(resetData.expiresAt) < now) {
        this.passwordResetTokens.delete(token);
        cleaned++;
      }
    }
    
    // Unlock expired account locks
    for (const [userId, user] of this.users.entries()) {
      if (user.isLocked && user.lockedUntil && new Date(user.lockedUntil) < now) {
        this.unlockAccount(userId);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

// Export singleton instance
const database = new Database();

// Cleanup every 5 minutes
setInterval(() => {
  const cleaned = database.cleanup();
  if (cleaned > 0) {
    console.log(`Database cleanup: removed ${cleaned} expired items`);
  }
}, 5 * 60 * 1000);

module.exports = database;
