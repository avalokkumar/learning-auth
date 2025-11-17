const geoip = require('geoip-lite');
const UAParser = require('ua-parser-js');
const crypto = require('crypto');

class RiskEngine {
  constructor() {
    this.userProfiles = new Map();
    this.loginAttempts = new Map();
  }

  /**
   * Calculate comprehensive risk score for authentication attempt
   */
  async calculateRiskScore(context) {
    const scores = {
      device: this.assessDeviceRisk(context),
      location: this.assessLocationRisk(context),
      time: this.assessTimeRisk(context),
      behavioral: this.assessBehavioralRisk(context),
      historical: this.assessHistoricalRisk(context)
    };

    // Weighted calculation
    const weights = {
      device: 0.25,
      location: 0.30,
      time: 0.15,
      behavioral: 0.20,
      historical: 0.10
    };

    const totalScore = Object.keys(scores).reduce((sum, key) => {
      return sum + (scores[key] * weights[key]);
    }, 0);

    const riskLevel = this.getRiskLevel(totalScore);
    const recommendation = this.getRecommendation(totalScore, riskLevel);

    return {
      score: Math.round(totalScore),
      level: riskLevel,
      breakdown: scores,
      recommendation,
      factors: this.identifyTopFactors(scores),
      timestamp: Date.now()
    };
  }

  /**
   * Assess device risk
   */
  assessDeviceRisk(context) {
    let risk = 0;
    const { deviceId, userAgent, session } = context;

    // Check if device is known
    const knownDevices = this.getUserProfile(context.userId)?.knownDevices || [];
    const isKnownDevice = knownDevices.includes(deviceId);

    if (!isKnownDevice) {
      risk += 40; // Unknown device
    }

    // Parse user agent
    const parser = new UAParser(userAgent);
    const device = parser.getDevice();
    const os = parser.getOS();
    const browser = parser.getBrowser();

    // Check for suspicious patterns
    if (!browser.name) {
      risk += 20; // No browser detected (possible bot)
    }

    // Check for outdated OS
    if (os.version && this.isOSOutdated(os.name, os.version)) {
      risk += 15;
    }

    // Device type risk
    if (device.type === 'mobile') {
      risk -= 5; // Mobile devices slightly less risky
    }

    return Math.min(100, risk);
  }

  /**
   * Assess location risk
   */
  assessLocationRisk(context) {
    let risk = 0;
    const { ipAddress, userId } = context;

    // Get geo location
    const geo = geoip.lookup(ipAddress);

    if (!geo) {
      risk += 30; // Unable to determine location
      return Math.min(100, risk);
    }

    // Check known locations
    const profile = this.getUserProfile(userId);
    const knownLocations = profile?.knownLocations || [];

    const isKnownLocation = knownLocations.some(loc =>
      loc.country === geo.country && this.calculateDistance(loc, geo) < 100
    );

    if (!isKnownLocation) {
      risk += 35; // New location
    }

    // Check for high-risk countries
    const highRiskCountries = ['XX', 'YY']; // Placeholder
    if (highRiskCountries.includes(geo.country)) {
      risk += 25;
    }

    // Impossible travel detection
    if (profile?.lastLocation) {
      const timeDiff = Date.now() - profile.lastLocationTime;
      const distance = this.calculateDistance(profile.lastLocation, geo);
      const speed = (distance / (timeDiff / 3600000)); // km/h

      if (speed > 900) { // Faster than airplane
        risk += 60; // Impossible travel
      }
    }

    return Math.min(100, risk);
  }

  /**
   * Assess time-based risk
   */
  assessTimeRisk(context) {
    let risk = 0;
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Check if business hours
    const isBusinessHours = (day >= 1 && day <= 5) && (hour >= 9 && hour <= 17);

    if (!isBusinessHours) {
      risk += 20; // Outside business hours
    }

    // Late night/early morning (1 AM - 5 AM)
    if (hour >= 1 && hour <= 5) {
      risk += 15;
    }

    // Weekend
    if (day === 0 || day === 6) {
      risk += 10;
    }

    // Check user's typical login times
    const profile = this.getUserProfile(context.userId);
    if (profile?.typicalLoginHours) {
      const isTypicalTime = profile.typicalLoginHours.includes(hour);
      if (!isTypicalTime) {
        risk += 15;
      }
    }

    return Math.min(100, risk);
  }

  /**
   * Assess behavioral risk
   */
  assessBehavioralRisk(context) {
    let risk = 0;
    const { userId, action } = context;

    // Check failed login attempts
    const attempts = this.getLoginAttempts(userId);
    const recentFailures = attempts.filter(a =>
      !a.success && (Date.now() - a.timestamp < 15 * 60 * 1000)
    ).length;

    risk += Math.min(40, recentFailures * 10);

    // Check for rapid requests
    const recentRequests = attempts.filter(a =>
      Date.now() - a.timestamp < 60 * 1000
    ).length;

    if (recentRequests > 5) {
      risk += 20; // Possible automation
    }

    // Sensitive action
    if (action === 'transfer' || action === 'change_email' || action === 'change_password') {
      risk += 15; // Higher risk for sensitive actions
    }

    return Math.min(100, risk);
  }

  /**
   * Assess historical risk
   */
  assessHistoricalRisk(context) {
    let risk = 0;
    const { userId } = context;

    const profile = this.getUserProfile(userId);

    if (!profile) {
      return 30; // New user
    }

    // Account age
    const accountAge = Date.now() - profile.createdAt;
    const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);

    if (daysSinceCreation < 7) {
      risk += 25; // Very new account
    } else if (daysSinceCreation < 30) {
      risk += 15; // New account
    }

    // Security incidents
    if (profile.securityIncidents > 0) {
      risk += Math.min(30, profile.securityIncidents * 10);
    }

    // Login frequency
    if (profile.loginCount < 5) {
      risk += 20; // Infrequent user
    }

    return Math.min(100, risk);
  }

  /**
   * Get risk level from score
   */
  getRiskLevel(score) {
    if (score < 20) return 'VERY_LOW';
    if (score < 40) return 'LOW';
    if (score < 60) return 'MEDIUM';
    if (score < 80) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * Get authentication recommendation
   */
  getRecommendation(score, level) {
    if (score < 20) {
      return {
        action: 'ALLOW',
        message: 'Low risk detected. Access granted.',
        requireMFA: false,
        monitoring: 'standard'
      };
    } else if (score < 40) {
      return {
        action: 'ALLOW',
        message: 'Low-medium risk detected. Access granted with enhanced monitoring.',
        requireMFA: false,
        monitoring: 'enhanced'
      };
    } else if (score < 60) {
      return {
        action: 'CHALLENGE',
        message: 'Medium risk detected. Please verify your identity.',
        requireMFA: true,
        mfaType: 'email_or_sms',
        monitoring: 'enhanced'
      };
    } else if (score < 80) {
      return {
        action: 'CHALLENGE',
        message: 'High risk detected. Additional verification required.',
        requireMFA: true,
        mfaType: 'strong_mfa',
        additionalVerification: true,
        monitoring: 'strict'
      };
    } else {
      return {
        action: 'BLOCK',
        message: 'Critical risk detected. Access denied for security reasons.',
        requireManualReview: true,
        notifySecurityTeam: true
      };
    }
  }

  /**
   * Identify top risk factors
   */
  identifyTopFactors(scores) {
    return Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([factor, score]) => ({ factor, score }));
  }

  /**
   * Generate device fingerprint
   */
  generateDeviceFingerprint(userAgent, acceptLanguage, acceptEncoding) {
    const data = `${userAgent}${acceptLanguage}${acceptEncoding}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Calculate distance between two geo points (Haversine formula)
   */
  calculateDistance(loc1, loc2) {
    const R = 6371; // Earth radius in km
    const dLat = this.toRad(loc2.ll[0] - loc1.ll[0]);
    const dLon = this.toRad(loc2.ll[1] - loc1.ll[1]);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(loc1.ll[0])) * Math.cos(this.toRad(loc2.ll[0])) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(degrees) {
    return degrees * Math.PI / 180;
  }

  /**
   * Check if OS is outdated
   */
  isOSOutdated(osName, osVersion) {
    // Simplified check
    const minVersions = {
      'Windows': '10',
      'Mac OS': '10.15',
      'iOS': '14',
      'Android': '10'
    };

    return minVersions[osName] && osVersion < minVersions[osName];
  }

  /**
   * User profile management
   */
  getUserProfile(userId) {
    return this.userProfiles.get(userId);
  }

  updateUserProfile(userId, data) {
    const profile = this.userProfiles.get(userId) || {
      createdAt: Date.now(),
      knownDevices: [],
      knownLocations: [],
      typicalLoginHours: [],
      loginCount: 0,
      securityIncidents: 0
    };

    this.userProfiles.set(userId, { ...profile, ...data });
  }

  /**
   * Login attempts tracking
   */
  recordLoginAttempt(userId, success, context) {
    const attempts = this.loginAttempts.get(userId) || [];
    attempts.push({
      timestamp: Date.now(),
      success,
      ipAddress: context.ipAddress,
      deviceId: context.deviceId
    });

    // Keep only last 100 attempts
    if (attempts.length > 100) {
      attempts.shift();
    }

    this.loginAttempts.set(userId, attempts);
  }

  getLoginAttempts(userId) {
    return this.loginAttempts.get(userId) || [];
  }
}

module.exports = new RiskEngine();
