/**
 * Device Fingerprinting Service
 * Generates and validates device fingerprints based on hardware/software characteristics
 */

const crypto = require('crypto');
const UAParser = require('ua-parser-js');

class DeviceFingerprintService {
  constructor() {
    this.parser = new UAParser();
  }
  
  /**
   * Generate device fingerprint from request
   * @param {Object} req - Express request object
   * @returns {Object} Fingerprint data
   */
  generateFingerprint(req) {
    // Parse user agent
    this.parser.setUA(req.headers['user-agent'] || '');
    const uaResult = this.parser.getResult();
    
    // Collect device characteristics
    const characteristics = {
      // Network characteristics
      ip: this.getClientIP(req),
      userAgent: req.headers['user-agent'] || '',
      
      // Browser/Client characteristics
      browser: {
        name: uaResult.browser.name || 'Unknown',
        version: uaResult.browser.version || 'Unknown',
        major: uaResult.browser.major || 'Unknown'
      },
      
      // Engine characteristics
      engine: {
        name: uaResult.engine.name || 'Unknown',
        version: uaResult.engine.version || 'Unknown'
      },
      
      // OS characteristics
      os: {
        name: uaResult.os.name || 'Unknown',
        version: uaResult.os.version || 'Unknown'
      },
      
      // Device characteristics
      device: {
        model: uaResult.device.model || 'Unknown',
        type: uaResult.device.type || 'desktop',
        vendor: uaResult.device.vendor || 'Unknown'
      },
      
      // CPU characteristics
      cpu: {
        architecture: uaResult.cpu.architecture || 'Unknown'
      },
      
      // HTTP headers (additional fingerprinting)
      headers: {
        acceptLanguage: req.headers['accept-language'] || '',
        acceptEncoding: req.headers['accept-encoding'] || '',
        accept: req.headers['accept'] || '',
        connection: req.headers['connection'] || '',
        dnt: req.headers['dnt'] || '0'
      },
      
      // Timestamp
      timestamp: new Date().toISOString()
    };
    
    // Generate fingerprint hash
    const fingerprintString = JSON.stringify({
      userAgent: characteristics.userAgent,
      browser: characteristics.browser.name + characteristics.browser.version,
      os: characteristics.os.name + characteristics.os.version,
      device: characteristics.device.model + characteristics.device.vendor,
      cpu: characteristics.cpu.architecture,
      language: characteristics.headers.acceptLanguage
    });
    
    const hash = crypto
      .createHash('sha256')
      .update(fingerprintString)
      .digest('hex');
    
    return {
      hash: hash,
      characteristics: characteristics,
      confidence: this.calculateConfidence(characteristics),
      generatedAt: new Date().toISOString()
    };
  }
  
  /**
   * Calculate confidence score of fingerprint
   * @param {Object} characteristics - Device characteristics
   * @returns {Number} Confidence score (0-100)
   */
  calculateConfidence(characteristics) {
    let score = 0;
    let maxScore = 0;
    
    // Browser info (20 points)
    maxScore += 20;
    if (characteristics.browser.name !== 'Unknown') score += 10;
    if (characteristics.browser.version !== 'Unknown') score += 10;
    
    // OS info (20 points)
    maxScore += 20;
    if (characteristics.os.name !== 'Unknown') score += 10;
    if (characteristics.os.version !== 'Unknown') score += 10;
    
    // Device info (20 points)
    maxScore += 20;
    if (characteristics.device.model !== 'Unknown') score += 10;
    if (characteristics.device.vendor !== 'Unknown') score += 10;
    
    // CPU info (10 points)
    maxScore += 10;
    if (characteristics.cpu.architecture !== 'Unknown') score += 10;
    
    // Language (10 points)
    maxScore += 10;
    if (characteristics.headers.acceptLanguage) score += 10;
    
    // User agent (20 points)
    maxScore += 20;
    if (characteristics.userAgent) score += 20;
    
    return Math.round((score / maxScore) * 100);
  }
  
  /**
   * Compare two fingerprints
   * @param {String} hash1 - First fingerprint hash
   * @param {String} hash2 - Second fingerprint hash
   * @returns {Boolean} True if fingerprints match
   */
  compareFingerprints(hash1, hash2) {
    return hash1 === hash2;
  }
  
  /**
   * Detect if device characteristics have changed significantly
   * @param {Object} oldFingerprint - Previous fingerprint
   * @param {Object} newFingerprint - Current fingerprint
   * @returns {Object} Comparison result
   */
  detectChanges(oldFingerprint, newFingerprint) {
    const changes = {
      significant: false,
      changed: [],
      severity: 'low' // low, medium, high
    };
    
    // Compare OS (HIGH severity change)
    if (oldFingerprint.characteristics.os.name !== newFingerprint.characteristics.os.name) {
      changes.changed.push('os');
      changes.significant = true;
      changes.severity = 'high';
    }
    
    // Compare device model (HIGH severity change)
    if (oldFingerprint.characteristics.device.model !== newFingerprint.characteristics.device.model) {
      changes.changed.push('device');
      changes.significant = true;
      if (changes.severity !== 'high') changes.severity = 'medium';
    }
    
    // Compare browser (MEDIUM severity change)
    if (oldFingerprint.characteristics.browser.name !== newFingerprint.characteristics.browser.name) {
      changes.changed.push('browser');
      if (changes.severity === 'low') changes.severity = 'medium';
    }
    
    // Compare browser version (LOW severity change - normal updates)
    if (oldFingerprint.characteristics.browser.version !== newFingerprint.characteristics.browser.version) {
      changes.changed.push('browser-version');
    }
    
    // Compare IP address (MEDIUM severity change - might be legitimate)
    if (oldFingerprint.characteristics.ip !== newFingerprint.characteristics.ip) {
      changes.changed.push('ip');
      if (changes.severity === 'low') changes.severity = 'medium';
    }
    
    return changes;
  }
  
  /**
   * Get client IP address
   * @param {Object} req - Express request object
   * @returns {String} IP address
   */
  getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip ||
           'unknown';
  }
  
  /**
   * Determine device type from fingerprint
   * @param {Object} fingerprint - Device fingerprint
   * @returns {String} Device type (mobile, tablet, desktop, bot, unknown)
   */
  getDeviceType(fingerprint) {
    const deviceType = fingerprint.characteristics.device.type;
    
    if (deviceType === 'mobile' || deviceType === 'smartphone') {
      return 'mobile';
    } else if (deviceType === 'tablet') {
      return 'tablet';
    } else if (deviceType === 'desktop' || deviceType === 'laptop') {
      return 'desktop';
    } else if (fingerprint.characteristics.browser.name === 'Unknown') {
      return 'bot';
    }
    
    return 'unknown';
  }
  
  /**
   * Check if request is from a bot/crawler
   * @param {Object} fingerprint - Device fingerprint
   * @returns {Boolean} True if likely a bot
   */
  isBot(fingerprint) {
    const ua = fingerprint.characteristics.userAgent.toLowerCase();
    
    const botPatterns = [
      'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
      'python', 'java', 'http', 'headless', 'phantom', 'selenium'
    ];
    
    return botPatterns.some(pattern => ua.includes(pattern));
  }
  
  /**
   * Generate device info summary
   * @param {Object} fingerprint - Device fingerprint
   * @returns {Object} Device info summary
   */
  getDeviceInfo(fingerprint) {
    return {
      type: this.getDeviceType(fingerprint),
      isBot: this.isBot(fingerprint),
      os: `${fingerprint.characteristics.os.name} ${fingerprint.characteristics.os.version}`,
      browser: `${fingerprint.characteristics.browser.name} ${fingerprint.characteristics.browser.version}`,
      device: fingerprint.characteristics.device.model !== 'Unknown' 
        ? `${fingerprint.characteristics.device.vendor} ${fingerprint.characteristics.device.model}`
        : 'Unknown Device',
      confidence: fingerprint.confidence
    };
  }
}

module.exports = DeviceFingerprintService;
