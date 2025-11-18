/**
 * Setup Test Devices Script
 * Creates sample devices and service accounts for testing
 */

const path = require('path');
const { DeviceRegistry } = require('../models/Device');
const { ServiceAccountRegistry } = require('../models/ServiceAccount');
const APIKeyService = require('../services/apiKeyService');

async function setupTestData() {
  console.log('\n🔧 Setting up test devices and service accounts...\n');
  
  const deviceRegistry = new DeviceRegistry();
  const serviceAccountRegistry = new ServiceAccountRegistry();
  const apiKeyService = new APIKeyService();
  
  // Clear existing data
  console.log('Clearing existing data...');
  deviceRegistry.devices.clear();
  serviceAccountRegistry.accounts.clear();
  
  // Create test devices
  console.log('\n📱 Creating test devices...\n');
  
  const devices = [
    {
      name: 'Smart Thermostat',
      type: 'iot',
      status: 'active',
      trustLevel: 'verified',
      info: {
        manufacturer: 'Nest',
        model: 'Learning Thermostat',
        serialNumber: 'NST-001',
        firmwareVersion: '5.9.3'
      },
      network: {
        ipAddress: '192.168.1.100',
        macAddress: '00:1A:2B:3C:4D:5E',
        location: 'Living Room'
      }
    },
    {
      name: 'Security Camera',
      type: 'iot',
      status: 'active',
      trustLevel: 'trusted',
      info: {
        manufacturer: 'Ring',
        model: 'Spotlight Cam',
        serialNumber: 'RING-CAM-123',
        firmwareVersion: '2.1.0'
      },
      network: {
        ipAddress: '192.168.1.101',
        macAddress: '00:1A:2B:3C:4D:5F',
        location: 'Front Door'
      }
    },
    {
      name: 'Mobile App (iPhone)',
      type: 'mobile',
      status: 'active',
      trustLevel: 'verified',
      info: {
        manufacturer: 'Apple',
        model: 'iPhone 14 Pro',
        osVersion: 'iOS 17.0'
      },
      network: {
        ipAddress: '192.168.1.102'
      }
    },
    {
      name: 'Backend API Server',
      type: 'server',
      status: 'active',
      trustLevel: 'trusted',
      info: {
        osVersion: 'Ubuntu 22.04 LTS'
      },
      network: {
        ipAddress: '10.0.1.50',
        location: 'Data Center'
      }
    },
    {
      name: 'Temperature Sensor',
      type: 'iot',
      status: 'pending',
      trustLevel: 'registered',
      info: {
        manufacturer: 'Generic',
        model: 'TMP-100',
        serialNumber: 'TMP-456'
      }
    }
  ];
  
  for (const deviceData of devices) {
    const device = deviceRegistry.register(deviceData);
    
    // Generate API key for active devices
    if (device.status === 'active') {
      const keyData = await apiKeyService.generateDeviceKey(device.id, {
        environment: 'live',
        permissions: ['read', 'write']
      });
      
      device.apiKey = {
        keyPrefix: keyData.keyPrefix,
        keyHash: keyData.keyHash,
        permissions: keyData.permissions,
        rateLimit: keyData.rateLimit
      };
      device.authMethods.apiKey = true;
      
      console.log(`✓ ${device.name}`);
      console.log(`  Device ID: ${device.deviceId}`);
      console.log(`  API Key: ${keyData.apiKey}`);
      console.log(`  Status: ${device.status} | Trust: ${device.trustLevel}\n`);
    } else {
      console.log(`✓ ${device.name} (${device.status})\n`);
    }
  }
  
  deviceRegistry.save();
  
  // Create service accounts
  console.log('\n🤖 Creating service accounts...\n');
  
  const serviceAccounts = [
    {
      name: 'Backup Service',
      description: 'Automated backup service running nightly',
      type: 'backup',
      permissions: ['read', 'backup'],
      scopes: ['devices', 'telemetry'],
      audit: {
        createdBy: 'system'
      }
    },
    {
      name: 'Monitoring Service',
      description: 'Real-time system monitoring and alerting',
      type: 'monitoring',
      permissions: ['read', 'monitor', 'alert'],
      scopes: ['devices', 'metrics', 'logs'],
      audit: {
        createdBy: 'system'
      }
    },
    {
      name: 'Data Integration',
      description: 'Third-party data integration service',
      type: 'integration',
      permissions: ['read', 'write'],
      scopes: ['devices', 'telemetry', 'config'],
      audit: {
        createdBy: 'system'
      }
    }
  ];
  
  for (const saData of serviceAccounts) {
    const account = serviceAccountRegistry.create(saData);
    
    // Generate API key
    const keyData = await apiKeyService.generateServiceKey(account.id, {
      scopes: account.scopes,
      permissions: account.permissions,
      rateLimit: {
        requestsPerMinute: 100,
        requestsPerHour: 1000,
        requestsPerDay: 10000
      }
    });
    
    account.credentials.apiKey = keyData.apiKey;
    account.credentials.apiKeyHash = keyData.keyHash;
    account.credentials.keyPrefix = keyData.keyPrefix;
    
    console.log(`✓ ${account.name}`);
    console.log(`  Account ID: ${account.credentials.accountId}`);
    console.log(`  API Key: ${keyData.apiKey}`);
    console.log(`  Type: ${account.type} | Permissions: ${account.permissions.join(', ')}\n`);
  }
  
  serviceAccountRegistry.save();
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Test data setup complete!');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('📊 Summary:');
  console.log(`   Devices created: ${deviceRegistry.getAll().length}`);
  console.log(`   Service accounts created: ${serviceAccountRegistry.getAll().length}\n`);
  
  console.log('🚀 Next steps:');
  console.log('   1. npm start');
  console.log('   2. Visit http://localhost:3004');
  console.log('   3. Login with: admin / admin123');
  console.log('   4. Test API endpoints with the generated API keys\n');
  
  console.log('🔑 Test an API endpoint:');
  const firstDevice = deviceRegistry.getAll().find(d => d.authMethods.apiKey);
  if (firstDevice) {
    console.log(`   curl -H "X-API-Key: ${firstDevice.apiKey.keyPrefix}..." http://localhost:3004/api/device/info\n`);
  }
}

// Run setup
setupTestData().catch(error => {
  console.error('\n❌ Error setting up test data:', error);
  process.exit(1);
});
