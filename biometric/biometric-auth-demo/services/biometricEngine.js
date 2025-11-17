/**
 * Biometric Authentication Simulation Engine
 * Simulates various biometric authentication methods
 */

const { v4: uuidv4 } = require('uuid');

// In-memory storage for user biometric templates (demo only)
const userBiometrics = new Map();

// Biometric enrollment and verification engine
class BiometricEngine {
  /**
   * Initialize or get user biometric profile
   */
  static getUserProfile(userId) {
    if (!userBiometrics.has(userId)) {
      userBiometrics.set(userId, {
        userId,
        fingerprints: [],
        faceTemplates: [],
        irisScans: [],
        voicePrints: [],
        keystrokeProfiles: [],
        enrollmentDate: Date.now(),
        lastAuthentication: null,
        authHistory: []
      });
    }
    return userBiometrics.get(userId);
  }

  /**
   * Enroll fingerprint biometric
   */
  static enrollFingerprint(userId, fingerprintData) {
    const profile = this.getUserProfile(userId);
    
    const fingerprintTemplate = {
      id: uuidv4(),
      type: 'fingerprint',
      finger: fingerprintData.finger || 'index',
      template: this.generateFingerprintTemplate(fingerprintData),
      quality: fingerprintData.quality || 95,
      enrolledAt: Date.now()
    };

    profile.fingerprints.push(fingerprintTemplate);
    return { success: true, templateId: fingerprintTemplate.id };
  }

  /**
   * Verify fingerprint
   */
  static verifyFingerprint(userId, fingerprintData) {
    const profile = this.getUserProfile(userId);
    
    if (profile.fingerprints.length === 0) {
      return {
        success: false,
        error: 'No fingerprint enrolled',
        confidence: 0
      };
    }

    // Simulate fingerprint matching
    const matchScore = this.simulateFingerprintMatch(
      fingerprintData,
      profile.fingerprints
    );

    const success = matchScore >= 85;
    
    this.logAuthentication(userId, 'fingerprint', success, matchScore);

    return {
      success,
      method: 'fingerprint',
      confidence: matchScore,
      message: success ? 'Fingerprint verified' : 'Fingerprint mismatch'
    };
  }

  /**
   * Enroll face biometric
   */
  static enrollFace(userId, faceData) {
    const profile = this.getUserProfile(userId);
    
    const faceTemplate = {
      id: uuidv4(),
      type: 'face',
      features: this.generateFaceTemplate(faceData),
      quality: faceData.quality || 90,
      is3D: faceData.is3D || false,
      enrolledAt: Date.now()
    };

    profile.faceTemplates.push(faceTemplate);
    return { success: true, templateId: faceTemplate.id };
  }

  /**
   * Verify face
   */
  static verifyFace(userId, faceData) {
    const profile = this.getUserProfile(userId);
    
    if (profile.faceTemplates.length === 0) {
      return {
        success: false,
        error: 'No face template enrolled',
        confidence: 0
      };
    }

    // Simulate face matching
    const matchScore = this.simulateFaceMatch(
      faceData,
      profile.faceTemplates
    );

    const success = matchScore >= 90;
    
    this.logAuthentication(userId, 'face', success, matchScore);

    return {
      success,
      method: 'face',
      confidence: matchScore,
      message: success ? 'Face verified' : 'Face mismatch',
      liveness: faceData.livenessCheck || false
    };
  }

  /**
   * Enroll iris biometric
   */
  static enrollIris(userId, irisData) {
    const profile = this.getUserProfile(userId);
    
    const irisTemplate = {
      id: uuidv4(),
      type: 'iris',
      eye: irisData.eye || 'both',
      pattern: this.generateIrisTemplate(irisData),
      quality: irisData.quality || 98,
      enrolledAt: Date.now()
    };

    profile.irisScans.push(irisTemplate);
    return { success: true, templateId: irisTemplate.id };
  }

  /**
   * Verify iris
   */
  static verifyIris(userId, irisData) {
    const profile = this.getUserProfile(userId);
    
    if (profile.irisScans.length === 0) {
      return {
        success: false,
        error: 'No iris template enrolled',
        confidence: 0
      };
    }

    // Simulate iris matching (highest accuracy)
    const matchScore = this.simulateIrisMatch(
      irisData,
      profile.irisScans
    );

    const success = matchScore >= 95;
    
    this.logAuthentication(userId, 'iris', success, matchScore);

    return {
      success,
      method: 'iris',
      confidence: matchScore,
      message: success ? 'Iris verified' : 'Iris mismatch'
    };
  }

  /**
   * Enroll voice biometric
   */
  static enrollVoice(userId, voiceData) {
    const profile = this.getUserProfile(userId);
    
    const voiceTemplate = {
      id: uuidv4(),
      type: 'voice',
      voicePrint: this.generateVoiceTemplate(voiceData),
      passphrase: voiceData.passphrase,
      quality: voiceData.quality || 85,
      enrolledAt: Date.now()
    };

    profile.voicePrints.push(voiceTemplate);
    return { success: true, templateId: voiceTemplate.id };
  }

  /**
   * Verify voice
   */
  static verifyVoice(userId, voiceData) {
    const profile = this.getUserProfile(userId);
    
    if (profile.voicePrints.length === 0) {
      return {
        success: false,
        error: 'No voice print enrolled',
        confidence: 0
      };
    }

    // Simulate voice matching
    const matchScore = this.simulateVoiceMatch(
      voiceData,
      profile.voicePrints
    );

    const success = matchScore >= 80;
    
    this.logAuthentication(userId, 'voice', success, matchScore);

    return {
      success,
      method: 'voice',
      confidence: matchScore,
      message: success ? 'Voice verified' : 'Voice mismatch'
    };
  }

  /**
   * Multi-modal authentication (combine multiple biometrics)
   */
  static verifyMultiModal(userId, biometricData) {
    const results = [];
    let totalConfidence = 0;
    let successCount = 0;

    // Check each available biometric
    if (biometricData.fingerprint) {
      const result = this.verifyFingerprint(userId, biometricData.fingerprint);
      results.push(result);
      if (result.success) successCount++;
      totalConfidence += result.confidence;
    }

    if (biometricData.face) {
      const result = this.verifyFace(userId, biometricData.face);
      results.push(result);
      if (result.success) successCount++;
      totalConfidence += result.confidence;
    }

    if (biometricData.iris) {
      const result = this.verifyIris(userId, biometricData.iris);
      results.push(result);
      if (result.success) successCount++;
      totalConfidence += result.confidence;
    }

    if (biometricData.voice) {
      const result = this.verifyVoice(userId, biometricData.voice);
      results.push(result);
      if (result.success) successCount++;
      totalConfidence += result.confidence;
    }

    const avgConfidence = results.length > 0 ? totalConfidence / results.length : 0;
    const success = successCount >= Math.ceil(results.length / 2); // At least half must pass

    return {
      success,
      method: 'multi-modal',
      confidence: Math.round(avgConfidence),
      biometrics: results,
      message: success ? 'Multi-modal authentication successful' : 'Multi-modal authentication failed'
    };
  }

  /**
   * Get user authentication history
   */
  static getAuthHistory(userId) {
    const profile = this.getUserProfile(userId);
    return profile.authHistory.slice(-20); // Last 20 attempts
  }

  /**
   * Generate fingerprint template (simulation)
   */
  static generateFingerprintTemplate(data) {
    return {
      minutiae: Array.from({ length: 40 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        angle: Math.random() * 360,
        type: Math.random() > 0.5 ? 'ridge_ending' : 'bifurcation'
      })),
      ridgeCount: Math.floor(Math.random() * 20) + 30,
      quality: data.quality || 95
    };
  }

  /**
   * Generate face template (simulation)
   */
  static generateFaceTemplate(data) {
    return {
      landmarks: {
        leftEye: { x: Math.random() * 100, y: Math.random() * 100 },
        rightEye: { x: Math.random() * 100, y: Math.random() * 100 },
        nose: { x: Math.random() * 100, y: Math.random() * 100 },
        mouth: { x: Math.random() * 100, y: Math.random() * 100 }
      },
      faceGeometry: {
        eyeDistance: Math.random() * 50 + 50,
        noseToMouth: Math.random() * 30 + 20,
        faceWidth: Math.random() * 100 + 100
      },
      is3D: data.is3D || false,
      quality: data.quality || 90
    };
  }

  /**
   * Generate iris template (simulation)
   */
  static generateIrisTemplate(data) {
    return {
      irisCode: Array.from({ length: 256 }, () => Math.random() > 0.5 ? 1 : 0),
      pupilSize: Math.random() * 5 + 2,
      irisTexture: Math.floor(Math.random() * 1000000),
      quality: data.quality || 98
    };
  }

  /**
   * Generate voice template (simulation)
   */
  static generateVoiceTemplate(data) {
    return {
      mfcc: Array.from({ length: 13 }, () => Math.random() * 100),
      pitch: Math.random() * 200 + 100,
      formants: [Math.random() * 1000, Math.random() * 2000, Math.random() * 3000],
      rhythm: Math.random() * 10 + 5,
      quality: data.quality || 85
    };
  }

  /**
   * Simulate fingerprint matching
   */
  static simulateFingerprintMatch(inputData, templates) {
    // Simulate matching with some randomness
    const baseScore = inputData.simulateSuccess ? 95 : 75;
    const variance = (Math.random() - 0.5) * 20;
    return Math.max(0, Math.min(100, baseScore + variance));
  }

  /**
   * Simulate face matching
   */
  static simulateFaceMatch(inputData, templates) {
    const baseScore = inputData.simulateSuccess ? 93 : 70;
    const variance = (Math.random() - 0.5) * 15;
    const score = baseScore + variance;
    
    // Adjust for liveness check
    if (inputData.livenessCheck) {
      return Math.max(0, Math.min(100, score + 5));
    }
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Simulate iris matching (highest accuracy)
   */
  static simulateIrisMatch(inputData, templates) {
    const baseScore = inputData.simulateSuccess ? 98 : 80;
    const variance = (Math.random() - 0.5) * 10;
    return Math.max(0, Math.min(100, baseScore + variance));
  }

  /**
   * Simulate voice matching
   */
  static simulateVoiceMatch(inputData, templates) {
    const baseScore = inputData.simulateSuccess ? 88 : 65;
    const variance = (Math.random() - 0.5) * 25;
    return Math.max(0, Math.min(100, baseScore + variance));
  }

  /**
   * Log authentication attempt
   */
  static logAuthentication(userId, method, success, confidence) {
    const profile = this.getUserProfile(userId);
    
    profile.authHistory.push({
      timestamp: Date.now(),
      method,
      success,
      confidence,
      id: uuidv4()
    });

    if (success) {
      profile.lastAuthentication = Date.now();
    }

    // Keep only last 100 attempts
    if (profile.authHistory.length > 100) {
      profile.authHistory = profile.authHistory.slice(-100);
    }
  }

  /**
   * Check if user has enrolled biometrics
   */
  static hasEnrolledBiometrics(userId) {
    const profile = this.getUserProfile(userId);
    return {
      fingerprint: profile.fingerprints.length > 0,
      face: profile.faceTemplates.length > 0,
      iris: profile.irisScans.length > 0,
      voice: profile.voicePrints.length > 0
    };
  }

  /**
   * Get enrollment status
   */
  static getEnrollmentStatus(userId) {
    const profile = this.getUserProfile(userId);
    const enrolled = this.hasEnrolledBiometrics(userId);
    
    return {
      userId,
      enrollmentDate: profile.enrollmentDate,
      biometrics: {
        fingerprint: {
          enrolled: enrolled.fingerprint,
          count: profile.fingerprints.length
        },
        face: {
          enrolled: enrolled.face,
          count: profile.faceTemplates.length
        },
        iris: {
          enrolled: enrolled.iris,
          count: profile.irisScans.length
        },
        voice: {
          enrolled: enrolled.voice,
          count: profile.voicePrints.length
        }
      },
      totalEnrolled: Object.values(enrolled).filter(Boolean).length
    };
  }
}

module.exports = BiometricEngine;
