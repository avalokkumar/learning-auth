/**
 * Device Model
 * Represents a registered device in the system
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class Device {
  constructor(data) {
    this.id = data.id || uuidv4();
    this.deviceId = data.deviceId || `DEV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.name = data.name || 'Unnamed Device';
    this.type = data.type || 'unknown'; // iot, mobile, server, service
    this.status = data.status || 'pending'; // pending, active, inactive, revoked
    this.trustLevel = data.trustLevel || 'unknown'; // unknown, registered, verified, trusted
    
    // Authentication methods enabled for this device
    this.authMethods = data.authMethods || {
      certificate: false,
      apiKey: false,
      fingerprint: false
    };
    
    // Device information
    this.info = data.info || {
      manufacturer: '',
      model: '',
      serialNumber: '',
      firmwareVersion: '',
      osVersion: ''
    };
    
    // Network information
    this.network = data.network || {
      ipAddress: '',
      macAddress: '',
      location: ''
    };
    
    // Fingerprint data
    this.fingerprint = data.fingerprint || null;
    
    // Certificate information
    this.certificate = data.certificate || {
      serialNumber: null,
      issuer: null,
      subject: null,
      validFrom: null,
      validTo: null,
      fingerprint: null
    };
    
    // API Key information
    this.apiKey = data.apiKey || {
      keyPrefix: null,
      keyHash: null,
      permissions: [],
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerDay: 1000
      }
    };
    
    // Usage statistics
    this.stats = data.stats || {
      lastSeen: null,
      connectionsCount: 0,
      dataTransferred: 0,
      authFailures: 0
    };
    
    // Timestamps
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.registeredAt = data.registeredAt || new Date().toISOString();
    this.lastAuthenticated = data.lastAuthenticated || null;
  }
  
  // Update device trust level
  updateTrustLevel(level) {
    const validLevels = ['unknown', 'registered', 'verified', 'trusted'];
    if (validLevels.includes(level)) {
      this.trustLevel = level;
      this.updatedAt = new Date().toISOString();
    }
  }
  
  // Update device status
  updateStatus(status) {
    const validStatuses = ['pending', 'active', 'inactive', 'revoked'];
    if (validStatuses.includes(status)) {
      this.status = status;
      this.updatedAt = new Date().toISOString();
    }
  }
  
  // Record successful authentication
  recordAuthentication() {
    this.lastAuthenticated = new Date().toISOString();
    this.stats.lastSeen = new Date().toISOString();
    this.stats.connectionsCount++;
    this.updatedAt = new Date().toISOString();
  }
  
  // Record authentication failure
  recordAuthFailure() {
    this.stats.authFailures++;
    this.updatedAt = new Date().toISOString();
  }
  
  // Enable authentication method
  enableAuthMethod(method) {
    if (this.authMethods.hasOwnProperty(method)) {
      this.authMethods[method] = true;
      this.updatedAt = new Date().toISOString();
    }
  }
  
  // Get device summary
  getSummary() {
    return {
      id: this.id,
      deviceId: this.deviceId,
      name: this.name,
      type: this.type,
      status: this.status,
      trustLevel: this.trustLevel,
      authMethods: this.authMethods,
      lastSeen: this.stats.lastSeen,
      connectionsCount: this.stats.connectionsCount
    };
  }
  
  // Serialize to JSON
  toJSON() {
    return {
      id: this.id,
      deviceId: this.deviceId,
      name: this.name,
      type: this.type,
      status: this.status,
      trustLevel: this.trustLevel,
      authMethods: this.authMethods,
      info: this.info,
      network: this.network,
      fingerprint: this.fingerprint,
      certificate: this.certificate,
      apiKey: this.apiKey,
      stats: this.stats,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      registeredAt: this.registeredAt,
      lastAuthenticated: this.lastAuthenticated
    };
  }
}

// Device Registry (In-memory storage with persistence)
class DeviceRegistry {
  constructor(storagePath) {
    this.devices = new Map();
    this.storagePath = storagePath || path.join(__dirname, '..', 'devices', 'registry.json');
    this.load();
  }
  
  // Load devices from storage
  load() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = fs.readFileSync(this.storagePath, 'utf8');
        const devicesArray = JSON.parse(data);
        devicesArray.forEach(deviceData => {
          const device = new Device(deviceData);
          this.devices.set(device.id, device);
        });
        console.log(`Loaded ${this.devices.size} devices from registry`);
      }
    } catch (error) {
      console.error('Error loading device registry:', error.message);
    }
  }
  
  // Save devices to storage
  save() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const devicesArray = Array.from(this.devices.values()).map(d => d.toJSON());
      fs.writeFileSync(this.storagePath, JSON.stringify(devicesArray, null, 2));
    } catch (error) {
      console.error('Error saving device registry:', error.message);
    }
  }
  
  // Register new device
  register(deviceData) {
    const device = new Device(deviceData);
    this.devices.set(device.id, device);
    this.save();
    return device;
  }
  
  // Get device by ID
  getById(id) {
    return this.devices.get(id);
  }
  
  // Get device by device ID
  getByDeviceId(deviceId) {
    return Array.from(this.devices.values()).find(d => d.deviceId === deviceId);
  }
  
  // Get device by API key prefix
  getByApiKeyPrefix(keyPrefix) {
    return Array.from(this.devices.values()).find(
      d => d.apiKey.keyPrefix === keyPrefix
    );
  }
  
  // Get device by fingerprint
  getByFingerprint(fingerprint) {
    return Array.from(this.devices.values()).find(
      d => d.fingerprint && d.fingerprint.hash === fingerprint
    );
  }
  
  // Get all devices
  getAll() {
    return Array.from(this.devices.values());
  }
  
  // Get devices by type
  getByType(type) {
    return Array.from(this.devices.values()).filter(d => d.type === type);
  }
  
  // Get devices by status
  getByStatus(status) {
    return Array.from(this.devices.values()).filter(d => d.status === status);
  }
  
  // Get devices by trust level
  getByTrustLevel(trustLevel) {
    return Array.from(this.devices.values()).filter(d => d.trustLevel === trustLevel);
  }
  
  // Update device
  update(id, updates) {
    const device = this.devices.get(id);
    if (device) {
      Object.assign(device, updates);
      device.updatedAt = new Date().toISOString();
      this.save();
      return device;
    }
    return null;
  }
  
  // Delete device
  delete(id) {
    const deleted = this.devices.delete(id);
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
      byType: {
        iot: this.getByType('iot').length,
        mobile: this.getByType('mobile').length,
        server: this.getByType('server').length,
        service: this.getByType('service').length
      },
      byStatus: {
        pending: this.getByStatus('pending').length,
        active: this.getByStatus('active').length,
        inactive: this.getByStatus('inactive').length,
        revoked: this.getByStatus('revoked').length
      },
      byTrustLevel: {
        unknown: this.getByTrustLevel('unknown').length,
        registered: this.getByTrustLevel('registered').length,
        verified: this.getByTrustLevel('verified').length,
        trusted: this.getByTrustLevel('trusted').length
      }
    };
  }
}

module.exports = { Device, DeviceRegistry };
