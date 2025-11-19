/**
 * Password Service - Advanced Password Security Operations
 * Implements Argon2id hashing, breach detection, strength validation
 */

const argon2 = require('argon2');
const crypto = require('crypto');
const zxcvbn = require('zxcvbn');
const database = require('../database/Database');

class PasswordService {
  constructor() {
    // Argon2id configuration (OWASP recommended)
    this.hashOptions = {
      type: argon2.argon2id,
      memoryCost: 65536,  // 64 MB
      timeCost: 3,        // 3 iterations
      parallelism: 4      // 4 threads
    };
    
    // Password policy
    this.policy = {
      minLength: 8,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      preventCommonPasswords: true,
      checkBreachedPasswords: true,
      preventPasswordReuse: 12  // Last N passwords
    };
  }
  
  // ============================================
  // HASH & VERIFY
  // ============================================
  
  /**
   * Generate salt and hash password with Argon2id
   */
  async hashPassword(password) {
    try {
      const salt = crypto.randomBytes(16);
      const hash = await argon2.hash(password, {
        ...this.hashOptions,
        salt
      });
      
      return {
        hash,
        salt: salt.toString('hex')
      };
    } catch (error) {
      console.error('Password hashing error:', error);
      throw new Error('Failed to hash password');
    }
  }
  
  /**
   * Verify password against stored hash
   */
  async verifyPassword(password, hash) {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }
  
  // ============================================
  // PASSWORD VALIDATION
  // ============================================
  
  /**
   * Comprehensive password validation
   */
  async validatePassword(password, userId = null) {
    const errors = [];
    const warnings = [];
    
    // Length check
    if (password.length < this.policy.minLength) {
      errors.push(`Password must be at least ${this.policy.minLength} characters`);
    }
    if (password.length > this.policy.maxLength) {
      errors.push(`Password must be less than ${this.policy.maxLength} characters`);
    }
    
    // Complexity checks
    if (this.policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (this.policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (this.policy.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (this.policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    // Check password strength using zxcvbn
    const strength = zxcvbn(password);
    if (strength.score < 2) {
      warnings.push(`Weak password. ${strength.feedback.warning || 'Consider making it stronger'}`);
    }
    
    // Check against breached passwords
    if (this.policy.checkBreachedPasswords) {
      if (database.isPasswordBreached(password)) {
        errors.push('This password has been exposed in a data breach. Please choose a different one.');
      }
    }
    
    // Check password history (prevent reuse)
    if (userId && this.policy.preventPasswordReuse > 0) {
      const history = database.getPasswordHistory(userId);
      for (const entry of history.slice(0, this.policy.preventPasswordReuse)) {
        const matches = await this.verifyPassword(password, entry.passwordHash);
        if (matches) {
          errors.push(`Cannot reuse any of your last ${this.policy.preventPasswordReuse} passwords`);
          break;
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      strength: {
        score: strength.score,
        label: ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][strength.score],
        feedback: strength.feedback,
        crackTime: strength.crack_times_display.offline_slow_hashing_1e4_per_second
      }
    };
  }
  
  /**
   * Get password strength meter data
   */
  getPasswordStrength(password) {
    const result = zxcvbn(password);
    
    return {
      score: result.score,
      label: ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'][result.score],
      percentage: (result.score / 4) * 100,
      feedback: result.feedback,
      crackTime: result.crack_times_display.offline_slow_hashing_1e4_per_second,
      guesses: result.guesses,
      sequence: result.sequence.map(s => ({
        pattern: s.pattern,
        token: s.token,
        warning: s.dictionary_name ? `Common ${s.dictionary_name} word` : null
      }))
    };
  }
  
  // ============================================
  // PASSWORD GENERATION
  // ============================================
  
  /**
   * Generate a strong random password
   */
  generateStrongPassword(length = 16) {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = uppercase + lowercase + numbers + special;
    let password = '';
    
    // Ensure at least one of each required type
    password += uppercase[crypto.randomInt(0, uppercase.length)];
    password += lowercase[crypto.randomInt(0, lowercase.length)];
    password += numbers[crypto.randomInt(0, numbers.length)];
    password += special[crypto.randomInt(0, special.length)];
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[crypto.randomInt(0, allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
  
  // ============================================
  // PASSWORD BREACH CHECKING
  // ============================================
  
  /**
   * Check if password is in breach database
   * In production, use HaveIBeenPwned API with k-Anonymity
   */
  async checkPasswordBreach(password) {
    // For demo, using local database
    const isBreached = database.isPasswordBreached(password);
    
    if (isBreached) {
      return {
        breached: true,
        message: 'This password has been found in data breaches',
        recommendation: 'Choose a different password'
      };
    }
    
    return {
      breached: false,
      message: 'Password not found in known breaches'
    };
  }
  
  /**
   * SHA-1 hash for HaveIBeenPwned k-Anonymity protocol
   * (Would be used in production implementation)
   */
  sha1Hash(input) {
    return crypto.createHash('sha1').update(input).digest('hex').toUpperCase();
  }
  
  // ============================================
  // PASSWORD EXPIRY
  // ============================================
  
  /**
   * Check if password needs to be changed
   */
  isPasswordExpired(user) {
    if (!user.passwordLastChanged || !user.passwordExpiryDays) {
      return false;
    }
    
    const lastChanged = new Date(user.passwordLastChanged);
    const expiryDate = new Date(lastChanged);
    expiryDate.setDate(expiryDate.getDate() + user.passwordExpiryDays);
    
    return new Date() > expiryDate;
  }
  
  /**
   * Calculate days until password expires
   */
  daysUntilExpiry(user) {
    if (!user.passwordLastChanged || !user.passwordExpiryDays) {
      return null;
    }
    
    const lastChanged = new Date(user.passwordLastChanged);
    const expiryDate = new Date(lastChanged);
    expiryDate.setDate(expiryDate.getDate() + user.passwordExpiryDays);
    
    const daysLeft = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
    return daysLeft;
  }
  
  // ============================================
  // COMMON PASSWORD PATTERNS
  // ============================================
  
  /**
   * Check for common password patterns
   */
  hasCommonPatterns(password) {
    const patterns = [
      /^(.)\1+$/,                    // All same character
      /^(012|123|234|345|456|567|678|789|890)+/, // Sequential numbers
      /^(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+/i, // Sequential letters
      /^(qwerty|asdfgh|zxcvbn)+/i,  // Keyboard patterns
      /^(password|admin|user|root|guest|test|demo)+/i, // Common words
      /^[0-9]{4,}$/,                 // Only numbers (like 1234)
    ];
    
    return patterns.some(pattern => pattern.test(password));
  }
  
  // ============================================
  // PASSWORD RESET TOKEN
  // ============================================
  
  /**
   * Generate secure password reset token
   */
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }
  
  /**
   * Generate temporary password for account recovery
   */
  generateTemporaryPassword() {
    return this.generateStrongPassword(12);
  }
}

module.exports = new PasswordService();
