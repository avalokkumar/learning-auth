/**
 * OTP Service for SMS and Email verification
 */

const database = require('../database/Database');

class OTPService {
  /**
   * Generate and send SMS OTP
   * In production, integrate with Twilio, AWS SNS, or similar
   */
  async sendSMSOTP(userId, phone) {
    const otp = database.createOTP(userId, 'sms', phone);
    
    // Simulate SMS sending
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📱 SMS OTP SENT TO: ${phone}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   Your verification code is: ${otp.code}`);
    console.log(`   Valid for 5 minutes`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    // In production, use Twilio:
    // await twilioClient.messages.create({
    //   body: `Your verification code is ${otp.code}. Valid for 5 minutes.`,
    //   to: phone,
    //   from: process.env.TWILIO_PHONE
    // });
    
    return {
      success: true,
      otpId: otp.id,
      expiresAt: otp.expiresAt
    };
  }
  
  /**
   * Generate and send Email OTP
   * In production, integrate with SendGrid, AWS SES, or similar
   */
  async sendEmailOTP(userId, email) {
    const otp = database.createOTP(userId, 'email', email);
    
    // Simulate Email sending
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📧 EMAIL OTP SENT TO: ${email}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   Subject: Your Verification Code`);
    console.log(`   Code: ${otp.code}`);
    console.log(`   Valid for 5 minutes`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    // In production, use nodemailer or SendGrid:
    // await transporter.sendMail({
    //   from: '"MFA Demo" <noreply@mfademo.com>',
    //   to: email,
    //   subject: 'Your Verification Code',
    //   html: `<p>Your verification code is: <strong>${otp.code}</strong></p>`
    // });
    
    return {
      success: true,
      otpId: otp.id,
      expiresAt: otp.expiresAt
    };
  }
  
  /**
   * Verify OTP code
   */
  verifyOTP(userId, code, type) {
    return database.verifyOTP(userId, code, type);
  }
  
  /**
   * Resend OTP
   */
  async resendOTP(userId, type, channel) {
    if (type === 'sms') {
      return await this.sendSMSOTP(userId, channel);
    } else if (type === 'email') {
      return await this.sendEmailOTP(userId, channel);
    }
    
    throw new Error('Invalid OTP type');
  }
}

module.exports = new OTPService();
