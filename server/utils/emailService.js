const dns = require('dns').promises;
const nodemailer = require('nodemailer');

/**
 * Validates if an email domain exists and has valid MX (Mail Exchange) records.
 * @param {string} email 
 * @returns {Promise<boolean>}
 */
const validateEmailDomain = async (email) => {
  if (!email || !email.includes('@')) {
    throw new Error('Invalid email format');
  }

  const domain = email.split('@')[1].trim().toLowerCase();
  
  // Basic domain format check
  const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!domainRegex.test(domain)) {
    throw new Error('Invalid email domain format');
  }

  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      throw new Error(`Domain @${domain} does not have valid mail server (MX) records`);
    }
    return true;
  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA' || error.code === 'ESERVFAIL') {
      throw new Error(`Email domain @${domain} does not exist or cannot receive emails.`);
    }
    // If DNS check fails with other error, throw custom domain message
    throw new Error(`Unable to verify email domain @${domain}: ${error.message}`);
  }
};

/**
 * Creates Nodemailer Transporter if credentials are provided in .env
 */
const getTransporter = () => {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

  if (user && pass) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: { user, pass },
    });
  }
  return null;
};

/**
 * Send OTP Verification Email for Signup or Password Reset
 */
const sendOTPEmail = async ({ to, otp, type = 'verification', username = '' }) => {
  const isReset = type === 'reset';
  const subject = isReset 
    ? `🔐 Password Reset Request - ChatApp` 
    : `✨ Email Verification Code: ${otp} - ChatApp`;

  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #0b0f19; padding: 30px; color: #ffffff; border-radius: 12px; max-width: 500px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #6366f1; margin: 0; font-size: 28px;">💬 ChatApp</h1>
        <p style="color: #94a3b8; font-size: 14px;">Real-Time Communication Platform</p>
      </div>
      <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 24px; text-align: center;">
        <h2 style="margin-top: 0; color: #f8fafc;">${isReset ? 'Reset Your Password' : `Welcome, ${username || 'User'}!`}</h2>
        <p style="color: #cbd5e1; font-size: 14px;">
          ${isReset 
            ? 'Use the verification code below to reset your ChatApp password. This code is valid for 10 minutes.' 
            : 'Please enter the following 6-digit verification code to confirm your email address and activate your account.'}
        </p>
        <div style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ffffff; padding: 16px; border-radius: 8px; margin: 24px 0; display: inline-block;">
          ${otp}
        </div>
        <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">
          If you did not request this email, please safely ignore it.
        </p>
      </div>
      <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #475569;">
        © ${new Date().getFullYear()} ChatApp. All rights reserved.
      </div>
    </div>
  `;

  const transporter = getTransporter();

  console.log(`\n==================================================`);
  console.log(`📩 [EMAIL SERVICE] OTP for ${to} (${type.toUpperCase()}): ${otp}`);
  console.log(`==================================================\n`);

  if (transporter) {
    try {
      await transporter.sendMail({
        from: `"ChatApp Security" <${process.env.EMAIL_USER || 'no-reply@chatapp.com'}>`,
        to,
        subject,
        html,
      });
      console.log(`✅ [EMAIL SERVICE] Email successfully dispatched to ${to}`);
      return { success: true, mode: 'smtp' };
    } catch (err) {
      console.error(`⚠️ [EMAIL SERVICE] SMTP delivery failed: ${err.message}`);
      // Fallback to console log mode
      return { success: true, mode: 'console', devOtp: otp };
    }
  }

  return { success: true, mode: 'console', devOtp: otp };
};

module.exports = {
  validateEmailDomain,
  sendOTPEmail,
};
