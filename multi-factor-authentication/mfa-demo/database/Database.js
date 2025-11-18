/**
 * In-Memory Database for MFA Demo
 * Simulates a real database with proper schema
 */

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class Database {
  constructor() {
    // Tables
    this.users = new Map();
    this.sessions = new Map();
    this.mfaMethods = new Map(); // User's enrolled MFA methods
    this.otps = new Map(); // One-time passwords (SMS/Email)
    this.backupCodes = new Map(); // Backup recovery codes
    this.auditLogs = [];
    
    // MFA verification sessions (temporary during login)
    this.mfaSessions = new Map();
    
    // Initialize with demo data
    this.initialize();
  }
  
  async initialize() {
    console.log('Initializing MFA database...');
    
    // Clear all data for fresh start
    this.users.clear();
    this.sessions.clear();
    this.mfaMethods.clear();
    this.otps.clear();
    this.backupCodes.clear();
    this.mfaSessions.clear();
    this.auditLogs = [];
    
    // Create demo users
    await this.createUser({
      username: 'admin',
      password: 'admin123',
      email: 'admin@example.com',
      phone: '+1234567890',
      role: 'admin',
      displayName: 'Administrator'
    });
    
    await this.createUser({
      username: 'user',
      password: 'user123',
      email: 'user@example.com',
      phone: '+0987654321',
      role: 'user',
      displayName: 'Regular User'
    });
    
    console.log(`Database initialized with ${this.users.size} users`);
  }
  
  // ============================================
  // USER OPERATIONS
  // ============================================
  
  async createUser(userData) {
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(userData.password, 10);
    
    const user = {
      id: userId,
      username: userData.username,
      email: userData.email,
      phone: userData.phone || null,
      displayName: userData.displayName || userData.username,
      passwordHash,
      role: userData.role || 'user',
      mfaEnabled: false,
      mfaPreference: null, // 'totp', 'sms', 'email'
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLogin: null,
      stats: {
        loginCount: 0,
        failedLoginAttempts: 0,
        mfaFailedAttempts: 0,
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
      user.stats.mfaFailedAttempts = 0;
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
  
  recordFailedMFA(userId) {
    const user = this.users.get(userId);
    if (user) {
      user.stats.mfaFailedAttempts++;
      this.logAudit('mfa_failed', userId, { username: user.username });
    }
  }
  
  updateUserMFAStatus(userId, enabled, preference = null) {
    const user = this.users.get(userId);
    if (user) {
      user.mfaEnabled = enabled;
      user.mfaPreference = preference;
      user.updatedAt = new Date().toISOString();
      this.logAudit('mfa_status_updated', userId, { enabled, preference });
    }
  }
  
  getAllUsers() {
    return Array.from(this.users.values()).map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      displayName: u.displayName,
      role: u.role,
      mfaEnabled: u.mfaEnabled,
      lastLogin: u.lastLogin
    }));
  }
  
  // ============================================
  // MFA METHODS OPERATIONS
  // ============================================
  
  enrollMFAMethod(userId, method) {
    const methodId = uuidv4();
    const mfaMethod = {
      id: methodId,
      userId,
      type: method.type, // 'totp', 'sms', 'email', 'backup'
      enabled: true,
      enrolledAt: new Date().toISOString(),
      lastUsed: null,
      usageCount: 0,
      ...method.data
    };
    
    this.mfaMethods.set(methodId, mfaMethod);
    this.logAudit('mfa_enrolled', userId, { type: method.type });
    
    return mfaMethod;
  }
  
  getMFAMethodsByUser(userId) {
    return Array.from(this.mfaMethods.values())
      .filter(m => m.userId === userId && m.enabled);
  }
  
  getMFAMethod(userId, type) {
    return Array.from(this.mfaMethods.values())
      .find(m => m.userId === userId && m.type === type && m.enabled);
  }
  
  updateMFAMethodUsage(methodId) {
    const method = this.mfaMethods.get(methodId);
    if (method) {
      method.lastUsed = new Date().toISOString();
      method.usageCount++;
    }
  }
  
  disableMFAMethod(methodId) {
    const method = this.mfaMethods.get(methodId);
    if (method) {
      method.enabled = false;
      this.logAudit('mfa_disabled', method.userId, { type: method.type });
    }
  }
  
  // ============================================
  // OTP OPERATIONS (SMS/Email)
  // ============================================
  
  createOTP(userId, type, channel) {
    const otpId = uuidv4();
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    
    const otp = {
      id: otpId,
      userId,
      type, // 'sms' or 'email'
      code,
      channel, // phone number or email
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
      attempts: 0,
      used: false
    };
    
    this.otps.set(otpId, otp);
    this.logAudit('otp_generated', userId, { type, otpId });
    
    return otp;
  }
  
  verifyOTP(userId, code, type) {
    const otps = Array.from(this.otps.values())
      .filter(o => o.userId === userId && o.type === type && !o.used)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    if (otps.length === 0) {
      return { success: false, error: 'No OTP found' };
    }
    
    const otp = otps[0];
    otp.attempts++;
    
    // Check expiration
    if (new Date(otp.expiresAt) < new Date()) {
      return { success: false, error: 'OTP expired' };
    }
    
    // Check attempts
    if (otp.attempts > 3) {
      otp.used = true; // Lock this OTP
      return { success: false, error: 'Too many attempts' };
    }
    
    // Verify code
    if (otp.code !== code) {
      return { success: false, error: 'Invalid OTP' };
    }
    
    // Mark as used
    otp.used = true;
    this.logAudit('otp_verified', userId, { type, otpId: otp.id });
    
    return { success: true, otpId: otp.id };
  }
  
  // ============================================
  // BACKUP CODES OPERATIONS
  // ============================================
  
  generateBackupCodes(userId, count = 10) {
    // Revoke existing codes
    Array.from(this.backupCodes.values())
      .filter(c => c.userId === userId && !c.used)
      .forEach(c => c.revoked = true);
    
    const codes = [];
    
    for (let i = 0; i < count; i++) {
      const codeId = uuidv4();
      const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8-character code
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');
      
      const backupCode = {
        id: codeId,
        userId,
        codeHash,
        used: false,
        revoked: false,
        createdAt: new Date().toISOString(),
        usedAt: null
      };
      
      this.backupCodes.set(codeId, backupCode);
      codes.push({ id: codeId, code }); // Return plain code only during generation
    }
    
    this.logAudit('backup_codes_generated', userId, { count });
    
    return codes;
  }
  
  verifyBackupCode(userId, code) {
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    
    const backupCode = Array.from(this.backupCodes.values())
      .find(c => c.userId === userId && c.codeHash === codeHash && !c.used && !c.revoked);
    
    if (!backupCode) {
      return { success: false, error: 'Invalid backup code' };
    }
    
    // Mark as used
    backupCode.used = true;
    backupCode.usedAt = new Date().toISOString();
    this.logAudit('backup_code_used', userId, { codeId: backupCode.id });
    
    return { success: true };
  }
  
  getBackupCodesCount(userId) {
    return Array.from(this.backupCodes.values())
      .filter(c => c.userId === userId && !c.used && !c.revoked).length;
  }
  
  // ============================================
  // MFA SESSION OPERATIONS
  // ============================================
  
  createMFASession(userId) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      userId,
      passwordVerified: true,
      mfaVerified: false,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes to complete MFA
    };
    
    this.mfaSessions.set(sessionId, session);
    
    return session;
  }
  
  getMFASession(sessionId) {
    const session = this.mfaSessions.get(sessionId);
    
    if (!session) return null;
    
    // Check expiration
    if (new Date(session.expiresAt) < new Date()) {
      this.mfaSessions.delete(sessionId);
      return null;
    }
    
    return session;
  }
  
  completeMFASession(sessionId) {
    const session = this.mfaSessions.get(sessionId);
    if (session) {
      session.mfaVerified = true;
    }
  }
  
  deleteMFASession(sessionId) {
    this.mfaSessions.delete(sessionId);
  }
  
  // ============================================
  // REGULAR SESSION OPERATIONS
  // ============================================
  
  createSession(userId) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
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
    return {
      users: this.users.size,
      mfaEnabledUsers: Array.from(this.users.values()).filter(u => u.mfaEnabled).length,
      activeSessions: this.sessions.size,
      enrolledMethods: this.mfaMethods.size,
      activeBackupCodes: Array.from(this.backupCodes.values())
        .filter(c => !c.used && !c.revoked).length,
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
    let cleaned = 0;
    
    // Clean expired sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (new Date(session.expiresAt) < now) {
        this.sessions.delete(sessionId);
        cleaned++;
      }
    }
    
    // Clean expired OTPs
    for (const [otpId, otp] of this.otps.entries()) {
      if (new Date(otp.expiresAt) < now || otp.used) {
        this.otps.delete(otpId);
        cleaned++;
      }
    }
    
    // Clean expired MFA sessions
    for (const [sessionId, session] of this.mfaSessions.entries()) {
      if (new Date(session.expiresAt) < now) {
        this.mfaSessions.delete(sessionId);
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
