/**
 * WebAuthn Service
 * Handles FIDO2/WebAuthn registration and authentication
 */

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

class WebAuthnService {
  constructor(config) {
    this.rpName = config.rpName || 'Hardware Key Demo';
    this.rpID = config.rpID || 'localhost';
    this.origin = config.origin || 'http://localhost:3005';
    this.expectedOrigin = config.expectedOrigin || this.origin;
    
    // Store challenges temporarily (in production, use Redis)
    this.challenges = new Map();
  }
  
  /**
   * Generate registration options for a new security key
   * @param {Object} user - User object
   * @param {Object} options - Registration options
   * @returns {Promise<Object>} Registration options
   */
  async generateRegistrationOptions(user, options = {}) {
    const {
      authenticatorSelection = {
        residentKey: 'preferred', // Allow passkeys
        userVerification: 'preferred', // PIN/biometric preferred but not required
        authenticatorAttachment: undefined // Allow both platform and cross-platform
      },
      attestationType = 'none', // 'none', 'indirect', or 'direct'
      timeout = 60000
    } = options;
    
    // Generate registration options
    const regOptions = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userID: user.id,
      userName: user.username,
      userDisplayName: user.displayName,
      
      // Don't prompt users for additional information about the authenticator
      attestationType,
      
      // Exclude already registered authenticators
      excludeCredentials: user.credentials.map(cred => ({
        id: cred.credentialID,
        type: 'public-key',
        transports: cred.transports || []
      })),
      
      authenticatorSelection,
      
      timeout,
      
      // Support for the two most common algorithms
      supportedAlgorithmIDs: [-7, -257], // ES256 and RS256
    });
    
    // Store challenge for verification
    this.challenges.set(user.id, regOptions.challenge);
    
    // Set expiration (clean up after 2 minutes)
    setTimeout(() => {
      this.challenges.delete(user.id);
    }, 120000);
    
    return regOptions;
  }
  
  /**
   * Verify registration response from security key
   * @param {Object} user - User object
   * @param {Object} response - Registration response from browser
   * @returns {Promise<Object>} Verification result
   */
  async verifyRegistrationResponse(user, response) {
    const expectedChallenge = this.challenges.get(user.id);
    
    if (!expectedChallenge) {
      throw new Error('Challenge not found or expired');
    }
    
    try {
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: this.expectedOrigin,
        expectedRPID: this.rpID,
        requireUserVerification: false,
      });
      
      const { verified, registrationInfo } = verification;
      
      if (verified && registrationInfo) {
        const {
          credentialPublicKey,
          credentialID,
          counter,
          credentialDeviceType,
          credentialBackedUp,
          aaguid
        } = registrationInfo;
        
        // Clean up challenge
        this.challenges.delete(user.id);
        
        return {
          verified: true,
          credential: {
            id: Buffer.from(credentialID).toString('base64url'),
            credentialID,
            credentialPublicKey,
            counter,
            credentialDeviceType,
            credentialBackedUp,
            aaguid,
            transports: response.response.transports || []
          }
        };
      }
      
      return { verified: false, error: 'Verification failed' };
    } catch (error) {
      console.error('Registration verification error:', error);
      throw new Error(`Registration verification failed: ${error.message}`);
    }
  }
  
  /**
   * Generate authentication options for login
   * @param {Object} user - User object (optional for usernameless flow)
   * @param {Object} options - Authentication options
   * @returns {Promise<Object>} Authentication options
   */
  async generateAuthenticationOptions(user = null, options = {}) {
    const {
      userVerification = 'preferred',
      timeout = 60000
    } = options;
    
    const authOptions = await generateAuthenticationOptions({
      rpID: this.rpID,
      
      // Allow credentials for this user (or all if usernameless)
      allowCredentials: user ? user.credentials.map(cred => ({
        id: cred.credentialID,
        type: 'public-key',
        transports: cred.transports || []
      })) : [],
      
      userVerification,
      timeout,
    });
    
    // Store challenge for verification
    const challengeKey = user ? user.id : 'usernameless';
    this.challenges.set(challengeKey, authOptions.challenge);
    
    // Set expiration
    setTimeout(() => {
      this.challenges.delete(challengeKey);
    }, 120000);
    
    return authOptions;
  }
  
  /**
   * Verify authentication response from security key
   * @param {Object} user - User object
   * @param {Object} response - Authentication response from browser
   * @returns {Promise<Object>} Verification result
   */
  async verifyAuthenticationResponse(user, response) {
    const expectedChallenge = this.challenges.get(user.id);
    
    if (!expectedChallenge) {
      throw new Error('Challenge not found or expired');
    }
    
    try {
      // Get the credential being used
      const credentialID = Buffer.from(response.id, 'base64url');
      const credential = user.getCredential(credentialID);
      
      if (!credential) {
        throw new Error('Credential not found');
      }
      
      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: this.expectedOrigin,
        expectedRPID: this.rpID,
        authenticator: {
          credentialID: credential.credentialID,
          credentialPublicKey: credential.credentialPublicKey,
          counter: credential.counter,
          transports: credential.transports || []
        },
        requireUserVerification: false,
      });
      
      const { verified, authenticationInfo } = verification;
      
      if (verified) {
        // Update counter
        const { newCounter } = authenticationInfo;
        
        // Clean up challenge
        this.challenges.delete(user.id);
        
        return {
          verified: true,
          credentialID,
          newCounter
        };
      }
      
      return { verified: false, error: 'Verification failed' };
    } catch (error) {
      console.error('Authentication verification error:', error);
      throw new Error(`Authentication verification failed: ${error.message}`);
    }
  }
  
  /**
   * Get authenticator info from AAGUID
   * @param {String} aaguid - AAGUID from authenticator
   * @returns {Object} Authenticator information
   */
  getAuthenticatorInfo(aaguid) {
    // Known AAGUIDs (simplified - in production, use MDS)
    const knownAuthenticators = {
      '00000000-0000-0000-0000-000000000000': {
        name: 'Unknown Authenticator',
        icon: '🔑'
      },
      'fa2b99dc-9e39-4257-8f92-4a30d23c4118': {
        name: 'YubiKey 5 Series',
        icon: '🔐',
        vendor: 'Yubico'
      },
      '2fc0579f-8113-47ea-b116-bb5a8db9202a': {
        name: 'YubiKey 5 NFC',
        icon: '🔐',
        vendor: 'Yubico'
      },
      'ee882879-721c-4913-9775-3dfcce97072a': {
        name: 'YubiKey Bio',
        icon: '🔐',
        vendor: 'Yubico'
      },
      'cb69481e-8ff7-4039-93ec-0a2729a154a8': {
        name: 'Google Titan Security Key',
        icon: '🔒',
        vendor: 'Google'
      },
      '08987058-cadc-4b81-b6e1-30de50dcbe96': {
        name: 'Windows Hello',
        icon: '💻',
        vendor: 'Microsoft'
      },
      'adce0002-35bc-c60a-648b-0b25f1f05503': {
        name: 'Touch ID',
        icon: '👆',
        vendor: 'Apple'
      },
      '00000000-0000-0000-0000-000000000000': {
        name: 'Platform Authenticator',
        icon: '🖥️'
      }
    };
    
    return knownAuthenticators[aaguid] || {
      name: 'Unknown Authenticator',
      icon: '🔑',
      aaguid
    };
  }
  
  /**
   * Get credential transport type display name
   * @param {Array} transports - Credential transports
   * @returns {String} Display name
   */
  getTransportDisplay(transports) {
    if (!transports || transports.length === 0) {
      return 'Unknown';
    }
    
    const transportNames = {
      'usb': 'USB',
      'nfc': 'NFC',
      'ble': 'Bluetooth',
      'internal': 'Built-in',
      'hybrid': 'Hybrid'
    };
    
    return transports
      .map(t => transportNames[t] || t)
      .join(', ');
  }
}

module.exports = WebAuthnService;
