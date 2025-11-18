/**
 * TOTP (Time-Based One-Time Password) Service
 * For Authenticator Apps like Google Authenticator, Authy, etc.
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

class TOTPService {
  /**
   * Generate secret for new TOTP enrollment
   */
  generateSecret(username, issuer = 'MFA Demo') {
    const secret = speakeasy.generateSecret({
      name: `${issuer} (${username})`,
      issuer: issuer,
      length: 32
    });
    
    return {
      secret: secret.base32,
      otpauth_url: secret.otpauth_url
    };
  }
  
  /**
   * Generate QR code for secret
   */
  async generateQRCode(otpauthUrl) {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
      return qrCodeDataUrl;
    } catch (error) {
      console.error('QR Code generation error:', error);
      throw new Error('Failed to generate QR code: ' + error.message);
    }
  }
  
  /**
   * Verify TOTP token
   */
  verifyToken(secret, token, window = 1) {
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: window // Allow 1 time step tolerance (±30 seconds)
    });
    
    return verified;
  }
  
  /**
   * Generate current TOTP token (for testing/display)
   */
  generateToken(secret) {
    return speakeasy.totp({
      secret: secret,
      encoding: 'base32'
    });
  }
  
  /**
   * Get time remaining for current token
   */
  getTimeRemaining() {
    const epoch = Math.floor(Date.now() / 1000);
    const timeStep = 30;
    const remaining = timeStep - (epoch % timeStep);
    return remaining;
  }
}

module.exports = new TOTPService();
