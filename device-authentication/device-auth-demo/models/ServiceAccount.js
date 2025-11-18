/**
 * Service Account Model
 * Represents non-human accounts for automated processes
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class ServiceAccount {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.name = data.name || 'Unnamed Service';
    this.description = data.description || '';
    this.type = data.type || 'service'; // service, integration, backup, monitoring
    this.status = data.status || 'active'; // active, inactive, revoked
    
    // Service account credentials
    this.credentials = data.credentials || {
      accountId: `SA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      apiKey: null,
      apiKeyHash: null,
      keyPrefix: null
    };
    
    // Permissions and access control
    this.permissions = data.permissions || [];
    this.scopes = data.scopes || []; // read, write, admin, etc.
    this.resourceAccess = data.resourceAccess || []; // specific resources this account can access
    
    // Rate limiting
    this.rateLimit = data.rateLimit || {
      requestsPerMinute: 100,
      requestsPerHour: 1000,
      requestsPerDay: 10000
    };
    
    // IP whitelist (optional)
    this.ipWhitelist = data.ipWhitelist || [];
    
    // Usage statistics
    this.stats = data.stats || {
      lastUsed: null,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      dataProcessed: 0
    };
    
    // Audit trail
    this.audit = data.audit || {
      createdBy: 'system',
      lastModifiedBy: null,
      lastRotation: null,
      rotationSchedule: 'manual' // manual, 30days, 60days, 90days
    };
    
    // Timestamps
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.expiresAt = data.expiresAt || null;
  }
  
  // Update status
  updateStatus(status) {
    const validStatuses = ['active', 'inactive', 'revoked'];
    if (validStatuses.includes(status)) {
      this.status = status;
      this.updatedAt = new Date().toISOString();
    }
  }
  
  // Record usage
  recordUsage(success = true, dataSize = 0) {
    this.stats.lastUsed = new Date().toISOString();
    this.stats.totalRequests++;
    if (success) {
      this.stats.successfulRequests++;
    } else {
      this.stats.failedRequests++;
    }
    this.stats.dataProcessed += dataSize;
    this.updatedAt = new Date().toISOString();
  }
  
  // Add permission
  addPermission(permission) {
    if (!this.permissions.includes(permission)) {
      this.permissions.push(permission);
      this.updatedAt = new Date().toISOString();
    }
  }
  
  // Remove permission
  removePermission(permission) {
    const index = this.permissions.indexOf(permission);
    if (index > -1) {
      this.permissions.splice(index, 1);
      this.updatedAt = new Date().toISOString();
    }
  }
  
  // Check if has permission
  hasPermission(permission) {
    return this.permissions.includes(permission) || this.permissions.includes('*');
  }
  
  // Add IP to whitelist
  addIPToWhitelist(ip) {
    if (!this.ipWhitelist.includes(ip)) {
      this.ipWhitelist.push(ip);
      this.updatedAt = new Date().toISOString();
    }
  }
  
  // Check if IP is whitelisted
  isIPWhitelisted(ip) {
    if (this.ipWhitelist.length === 0) return true; // No whitelist = allow all
    return this.ipWhitelist.includes(ip);
  }
  
  // Check if account is expired
  isExpired() {
    if (!this.expiresAt) return false;
    return new Date() > new Date(this.expiresAt);
  }
  
  // Check if account is active and valid
  isActive() {
    return this.status === 'active' && !this.isExpired();
  }
  
  // Get summary
  getSummary() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      accountId: this.credentials.accountId,
      keyPrefix: this.credentials.keyPrefix,
      permissions: this.permissions,
      lastUsed: this.stats.lastUsed,
      totalRequests: this.stats.totalRequests
    };
  }
  
  // Serialize to JSON
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      status: this.status,
      credentials: this.credentials,
      permissions: this.permissions,
      scopes: this.scopes,
      resourceAccess: this.resourceAccess,
      rateLimit: this.rateLimit,
      ipWhitelist: this.ipWhitelist,
      stats: this.stats,
      audit: this.audit,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      expiresAt: this.expiresAt
    };
  }
}

// Service Account Registry
class ServiceAccountRegistry {
  constructor(storagePath) {
    this.accounts = new Map();
    this.storagePath = storagePath || path.join(__dirname, '..', 'devices', 'service-accounts.json');
    this.load();
  }
  
  // Load service accounts from storage
  load() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = fs.readFileSync(this.storagePath, 'utf8');
        const accountsArray = JSON.parse(data);
        accountsArray.forEach(accountData => {
          const account = new ServiceAccount(accountData);
          this.accounts.set(account.id, account);
        });
        console.log(`Loaded ${this.accounts.size} service accounts from registry`);
      }
    } catch (error) {
      console.error('Error loading service account registry:', error.message);
    }
  }
  
  // Save service accounts to storage
  save() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const accountsArray = Array.from(this.accounts.values()).map(a => a.toJSON());
      fs.writeFileSync(this.storagePath, JSON.stringify(accountsArray, null, 2));
    } catch (error) {
      console.error('Error saving service account registry:', error.message);
    }
  }
  
  // Create new service account
  create(accountData) {
    const account = new ServiceAccount(accountData);
    this.accounts.set(account.id, account);
    this.save();
    return account;
  }
  
  // Get account by ID
  getById(id) {
    return this.accounts.get(id);
  }
  
  // Get account by account ID
  getByAccountId(accountId) {
    return Array.from(this.accounts.values()).find(a => a.credentials.accountId === accountId);
  }
  
  // Get account by API key prefix
  getByKeyPrefix(keyPrefix) {
    return Array.from(this.accounts.values()).find(
      a => a.credentials.keyPrefix === keyPrefix
    );
  }
  
  // Get all accounts
  getAll() {
    return Array.from(this.accounts.values());
  }
  
  // Get accounts by type
  getByType(type) {
    return Array.from(this.accounts.values()).filter(a => a.type === type);
  }
  
  // Get accounts by status
  getByStatus(status) {
    return Array.from(this.accounts.values()).filter(a => a.status === status);
  }
  
  // Get active accounts
  getActive() {
    return Array.from(this.accounts.values()).filter(a => a.isActive());
  }
  
  // Update account
  update(id, updates) {
    const account = this.accounts.get(id);
    if (account) {
      Object.assign(account, updates);
      account.updatedAt = new Date().toISOString();
      this.save();
      return account;
    }
    return null;
  }
  
  // Delete account
  delete(id) {
    const deleted = this.accounts.delete(id);
    if (deleted) {
      this.save();
    }
    return deleted;
  }
  
  // Get statistics
  getStats() {
    const all = this.getAll();
    const active = this.getActive();
    
    return {
      total: all.length,
      active: active.length,
      inactive: this.getByStatus('inactive').length,
      revoked: this.getByStatus('revoked').length,
      byType: {
        service: this.getByType('service').length,
        integration: this.getByType('integration').length,
        backup: this.getByType('backup').length,
        monitoring: this.getByType('monitoring').length
      },
      totalRequests: all.reduce((sum, a) => sum + a.stats.totalRequests, 0),
      successRate: this.calculateSuccessRate(all)
    };
  }
  
  // Calculate overall success rate
  calculateSuccessRate(accounts) {
    const totalRequests = accounts.reduce((sum, a) => sum + a.stats.totalRequests, 0);
    const successfulRequests = accounts.reduce((sum, a) => sum + a.stats.successfulRequests, 0);
    
    if (totalRequests === 0) return 100;
    return ((successfulRequests / totalRequests) * 100).toFixed(2);
  }
}

module.exports = { ServiceAccount, ServiceAccountRegistry };
