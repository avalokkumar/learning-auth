/**
 * WebAuthn Client Library
 * Handles browser WebAuthn API calls
 */

class WebAuthnClient {
  constructor() {
    this.isAvailable = this.checkAvailability();
  }
  
  // Check if WebAuthn is available
  checkAvailability() {
    return window.PublicKeyCredential !== undefined &&
           navigator.credentials !== undefined;
  }
  
  // Convert base64url to ArrayBuffer
  base64urlToBuffer(base64url) {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (base64.length % 4)) % 4;
    return Uint8Array.from(atob(base64 + '='.repeat(padLen)), c => c.charCodeAt(0));
  }
  
  // Convert ArrayBuffer to base64url
  bufferToBase64url(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (const byte of bytes) {
      str += String.fromCharCode(byte);
    }
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
  
  // Register a new security key
  async register(username, keyName) {
    if (!this.isAvailable) {
      throw new Error('WebAuthn is not supported in this browser');
    }
    
    try {
      // Get registration options from server
      const optionsRes = await fetch('/webauthn/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      
      if (!optionsRes.ok) {
        const error = await optionsRes.json();
        throw new Error(error.error || 'Failed to get registration options');
      }
      
      const options = await optionsRes.json();
      
      // Convert base64url strings to ArrayBuffers
      options.user.id = this.base64urlToBuffer(options.user.id);
      options.challenge = this.base64urlToBuffer(options.challenge);
      
      if (options.excludeCredentials) {
        options.excludeCredentials = options.excludeCredentials.map(cred => ({
          ...cred,
          id: this.base64urlToBuffer(cred.id)
        }));
      }
      
      // Create credentials
      const credential = await navigator.credentials.create({
        publicKey: options
      });
      
      // Convert ArrayBuffers to base64url for transmission
      const response = {
        id: credential.id,
        rawId: this.bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: this.bufferToBase64url(credential.response.clientDataJSON),
          attestationObject: this.bufferToBase64url(credential.response.attestationObject),
          transports: credential.response.getTransports ? credential.response.getTransports() : []
        }
      };
      
      // Send to server for verification
      const verifyRes = await fetch('/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, name: keyName })
      });
      
      if (!verifyRes.ok) {
        const error = await verifyRes.json();
        throw new Error(error.error || 'Registration verification failed');
      }
      
      return await verifyRes.json();
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }
  
  // Authenticate with security key
  async authenticate(username) {
    if (!this.isAvailable) {
      throw new Error('WebAuthn is not supported in this browser');
    }
    
    try {
      // Get authentication options from server
      const optionsRes = await fetch('/webauthn/authenticate/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username || undefined })
      });
      
      if (!optionsRes.ok) {
        const error = await optionsRes.json();
        throw new Error(error.error || 'Failed to get authentication options');
      }
      
      const options = await optionsRes.json();
      
      // Convert base64url strings to ArrayBuffers
      options.challenge = this.base64urlToBuffer(options.challenge);
      
      if (options.allowCredentials) {
        options.allowCredentials = options.allowCredentials.map(cred => ({
          ...cred,
          id: this.base64urlToBuffer(cred.id)
        }));
      }
      
      // Get assertion
      const assertion = await navigator.credentials.get({
        publicKey: options
      });
      
      // Convert ArrayBuffers to base64url for transmission
      const response = {
        id: assertion.id,
        rawId: this.bufferToBase64url(assertion.rawId),
        type: assertion.type,
        response: {
          clientDataJSON: this.bufferToBase64url(assertion.response.clientDataJSON),
          authenticatorData: this.bufferToBase64url(assertion.response.authenticatorData),
          signature: this.bufferToBase64url(assertion.response.signature),
          userHandle: assertion.response.userHandle ? 
            this.bufferToBase64url(assertion.response.userHandle) : null
        }
      };
      
      // Send to server for verification
      const verifyRes = await fetch('/webauthn/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response })
      });
      
      if (!verifyRes.ok) {
        const error = await verifyRes.json();
        throw new Error(error.error || 'Authentication verification failed');
      }
      
      return await verifyRes.json();
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }
  
  // Add additional security key for existing user
  async addKey(keyName) {
    if (!this.isAvailable) {
      throw new Error('WebAuthn is not supported in this browser');
    }
    
    try {
      // Get registration options
      const optionsRes = await fetch('/dashboard/add-key/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!optionsRes.ok) {
        const error = await optionsRes.json();
        throw new Error(error.error || 'Failed to get options');
      }
      
      const options = await optionsRes.json();
      
      // Convert base64url to ArrayBuffers
      options.user.id = this.base64urlToBuffer(options.user.id);
      options.challenge = this.base64urlToBuffer(options.challenge);
      
      if (options.excludeCredentials) {
        options.excludeCredentials = options.excludeCredentials.map(cred => ({
          ...cred,
          id: this.base64urlToBuffer(cred.id)
        }));
      }
      
      // Create credentials
      const credential = await navigator.credentials.create({
        publicKey: options
      });
      
      // Convert to format for server
      const response = {
        id: credential.id,
        rawId: this.bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: this.bufferToBase64url(credential.response.clientDataJSON),
          attestationObject: this.bufferToBase64url(credential.response.attestationObject),
          transports: credential.response.getTransports ? credential.response.getTransports() : []
        }
      };
      
      // Verify
      const verifyRes = await fetch('/dashboard/add-key/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, name: keyName })
      });
      
      if (!verifyRes.ok) {
        const error = await verifyRes.json();
        throw new Error(error.error || 'Verification failed');
      }
      
      return await verifyRes.json();
    } catch (error) {
      console.error('Add key error:', error);
      throw error;
    }
  }
}

// Create global instance
const webauthnClient = new WebAuthnClient();
