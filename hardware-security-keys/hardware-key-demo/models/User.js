/**
 * User Model with WebAuthn Credentials
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class User {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.username = data.username;
    this.email = data.email || `${data.username}@example.com`;
    this.displayName = data.displayName || data.username;
    
    // WebAuthn credentials (security keys)
    this.credentials = data.credentials || [];
    
    // User preferences
    this.preferences = data.preferences || {
      requireUserVerification: false,
      allowedAuthenticators: ['platform', 'cross-platform'] // platform = Touch ID, cross-platform = USB keys
    };
    
    // Statistics
    this.stats = data.stats || {
      registeredAt: new Date().toISOString(),
      lastLogin: null,
      loginCount: 0,
      failedLoginAttempts: 0,
      credentialsRegistered: 0
    };
    
    // Timestamps
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }
  
  // Add a new WebAuthn credential
  addCredential(credential) {
    this.credentials.push({
      id: credential.id,
      credentialID: credential.credentialID,
      credentialPublicKey: credential.credentialPublicKey,
      counter: credential.counter,
      transports: credential.transports || [],
      aaguid: credential.aaguid || null,
      credentialDeviceType: credential.credentialDeviceType || 'unknown', // 'singleDevice' or 'multiDevice'
      credentialBackedUp: credential.credentialBackedUp || false,
      name: credential.name || `Security Key ${this.credentials.length + 1}`,
      registeredAt: new Date().toISOString(),
      lastUsed: null
    });
    this.stats.credentialsRegistered++;
    this.updatedAt = new Date().toISOString();
  }
  
  // Get credential by ID
  getCredential(credentialID) {
    return this.credentials.find(c => 
      Buffer.from(c.credentialID).equals(Buffer.from(credentialID))
    );
  }
  
  // Update credential counter
  updateCredentialCounter(credentialID, counter) {
    const credential = this.getCredential(credentialID);
    if (credential) {
      credential.counter = counter;
      credential.lastUsed = new Date().toISOString();
      this.updatedAt = new Date().toISOString();
    }
  }
  
  // Remove a credential
  removeCredential(credentialID) {
    const index = this.credentials.findIndex(c => 
      Buffer.from(c.credentialID).equals(Buffer.from(credentialID))
    );
    if (index > -1) {
      this.credentials.splice(index, 1);
      this.updatedAt = new Date().toISOString();
      return true;
    }
    return false;
  }
  
  // Record successful login
  recordLogin() {
    this.stats.lastLogin = new Date().toISOString();
    this.stats.loginCount++;
    this.stats.failedLoginAttempts = 0;
    this.updatedAt = new Date().toISOString();
  }
  
  // Record failed login
  recordFailedLogin() {
    this.stats.failedLoginAttempts++;
    this.updatedAt = new Date().toISOString();
  }
  
  // Get user summary
  getSummary() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      displayName: this.displayName,
      credentialCount: this.credentials.length,
      lastLogin: this.stats.lastLogin,
      loginCount: this.stats.loginCount
    };
  }
  
  // Serialize to JSON
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      displayName: this.displayName,
      credentials: this.credentials.map(c => ({
        ...c,
        credentialID: Buffer.from(c.credentialID).toString('base64'),
        credentialPublicKey: Buffer.from(c.credentialPublicKey).toString('base64')
      })),
      preferences: this.preferences,
      stats: this.stats,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
  
  // Restore from JSON
  static fromJSON(data) {
    const userData = {
      ...data,
      credentials: data.credentials.map(c => ({
        ...c,
        credentialID: Buffer.from(c.credentialID, 'base64'),
        credentialPublicKey: Buffer.from(c.credentialPublicKey, 'base64')
      }))
    };
    return new User(userData);
  }
}

// User Registry
class UserRegistry {
  constructor(storagePath) {
    this.users = new Map();
    this.storagePath = storagePath || path.join(__dirname, '..', 'storage', 'users.json');
    this.load();
  }
  
  // Load users from storage
  load() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = fs.readFileSync(this.storagePath, 'utf8');
        const usersArray = JSON.parse(data);
        usersArray.forEach(userData => {
          const user = User.fromJSON(userData);
          this.users.set(user.id, user);
        });
        console.log(`Loaded ${this.users.size} users from registry`);
      }
    } catch (error) {
      console.error('Error loading user registry:', error.message);
    }
  }
  
  // Save users to storage
  save() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const usersArray = Array.from(this.users.values()).map(u => u.toJSON());
      fs.writeFileSync(this.storagePath, JSON.stringify(usersArray, null, 2));
    } catch (error) {
      console.error('Error saving user registry:', error.message);
    }
  }
  
  // Create new user
  create(userData) {
    const user = new User(userData);
    this.users.set(user.id, user);
    this.save();
    return user;
  }
  
  // Get user by ID
  getById(id) {
    return this.users.get(id);
  }
  
  // Get user by username
  getByUsername(username) {
    return Array.from(this.users.values()).find(u => u.username === username);
  }
  
  // Get user by credential ID
  getByCredentialId(credentialID) {
    return Array.from(this.users.values()).find(user => 
      user.credentials.some(c => 
        Buffer.from(c.credentialID).equals(Buffer.from(credentialID))
      )
    );
  }
  
  // Get all users
  getAll() {
    return Array.from(this.users.values());
  }
  
  // Update user
  update(id, updates) {
    const user = this.users.get(id);
    if (user) {
      Object.assign(user, updates);
      user.updatedAt = new Date().toISOString();
      this.save();
      return user;
    }
    return null;
  }
  
  // Delete user
  delete(id) {
    const deleted = this.users.delete(id);
    if (deleted) {
      this.save();
    }
    return deleted;
  }
  
  // Get statistics
  getStats() {
    const all = this.getAll();
    return {
      total: all.length,
      totalCredentials: all.reduce((sum, u) => sum + u.credentials.length, 0),
      averageCredentialsPerUser: all.length > 0 
        ? (all.reduce((sum, u) => sum + u.credentials.length, 0) / all.length).toFixed(1)
        : 0,
      totalLogins: all.reduce((sum, u) => sum + u.stats.loginCount, 0)
    };
  }
}

module.exports = { User, UserRegistry };
