const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const protect = require('../middleware/authMiddleware');
const { validateEmailDomain, sendOTPEmail } = require('../utils/emailService');

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'mysecretkey123', {
    expiresIn: '7d',
  });
};

// Helper to generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', 
  '#10b981', '#06b6d4', '#3b82f6', '#f59e0b'
];

// REGISTER - Step 1: Check Domain, Create Unverified Account & Send OTP
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Step 1: Validate Email Domain exists & has MX record
    try {
      await validateEmailDomain(email);
    } catch (domainErr) {
      return res.status(400).json({ message: domainErr.message });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    let existingUser = await User.findOne({ 
      $or: [{ email: normalizedEmail }, { username: username.trim() }] 
    });

    if (existingUser) {
      if (existingUser.isVerified) {
        if (existingUser.email === normalizedEmail) {
          return res.status(400).json({ message: 'An account with this email already exists.' });
        }
        return res.status(400).json({ message: 'Username is already taken. Please choose another.' });
      }
    }

    // Generate fresh OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const randomAvatar = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    let user;
    if (existingUser && !existingUser.isVerified) {
      // Reuse existing unverified document
      existingUser.username = username.trim();
      existingUser.email = normalizedEmail;
      existingUser.password = hashedPassword;
      existingUser.verificationOTP = otp;
      existingUser.otpExpires = otpExpires;
      existingUser.avatarColor = randomAvatar;
      user = await existingUser.save();
    } else {
      user = await User.create({
        username: username.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        verificationOTP: otp,
        otpExpires,
        avatarColor: randomAvatar,
        isVerified: false,
      });
    }

    // Send OTP via Email / Console
    const emailResult = await sendOTPEmail({
      to: normalizedEmail,
      otp,
      type: 'verification',
      username: user.username,
    });

    res.status(200).json({
      message: 'Verification OTP sent successfully to your email.',
      email: user.email,
      requiresVerification: true,
      devMode: emailResult.mode === 'console',
      devOtp: emailResult.devOtp,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message || 'Server error during registration' });
  }
});

// VERIFY OTP - Step 2: Confirm OTP & Activate Account
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Account is already verified. Please log in.' });
    }

    if (!user.verificationOTP || user.verificationOTP !== otp.trim()) {
      return res.status(400).json({ message: 'Invalid verification OTP code' });
    }

    if (new Date() > user.otpExpires) {
      return res.status(400).json({ message: 'Verification OTP code has expired. Please request a new one.' });
    }

    // Activate Account
    user.isVerified = true;
    user.verificationOTP = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatarColor: user.avatarColor,
      token: generateToken(user._id),
      message: 'Account successfully verified!',
    });
  } catch (error) {
    console.error('OTP Verification error:', error);
    res.status(500).json({ message: error.message || 'Server error verifying OTP' });
  }
});

// RESEND OTP
router.post('/resend-otp', async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Account is already verified' });
    }

    const otp = generateOTP();
    user.verificationOTP = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const emailResult = await sendOTPEmail({
      to: normalizedEmail,
      otp,
      type: 'verification',
      username: user.username,
    });

    res.status(200).json({
      message: 'A new verification OTP has been sent to your email.',
      devMode: emailResult.mode === 'console',
      devOtp: emailResult.devOtp,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error resending OTP' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter both email and password' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if account is verified
    if (!user.isVerified) {
      const otp = generateOTP();
      user.verificationOTP = otp;
      user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      const emailResult = await sendOTPEmail({
        to: normalizedEmail,
        otp,
        type: 'verification',
        username: user.username,
      });

      return res.status(403).json({
        message: 'Your account is not verified yet. We have sent a verification OTP to your email.',
        requiresVerification: true,
        email: user.email,
        devMode: emailResult.mode === 'console',
        devOtp: emailResult.devOtp,
      });
    }

    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      avatarColor: user.avatarColor || '#6366f1',
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message || 'Server error during login' });
  }
});

// FORGOT PASSWORD - Request OTP
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    // Validate domain existence
    try {
      await validateEmailDomain(email);
    } catch (domainErr) {
      return res.status(400).json({ message: domainErr.message });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: 'No registered account found with this email address.' });
    }

    const otp = generateOTP();
    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    const emailResult = await sendOTPEmail({
      to: normalizedEmail,
      otp,
      type: 'reset',
      username: user.username,
    });

    res.status(200).json({
      message: 'Password reset OTP has been sent to your email.',
      email: user.email,
      devMode: emailResult.mode === 'console',
      devOtp: emailResult.devOtp,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: error.message || 'Error processing forgot password request' });
  }
});

// VERIFY RESET OTP
router.post('/verify-reset-otp', async (req, res) => {
  const { email, otp } = req.body;

  try {
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP code are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.resetPasswordOTP || user.resetPasswordOTP !== otp.trim()) {
      return res.status(400).json({ message: 'Invalid password reset OTP code' });
    }

    if (new Date() > user.resetPasswordExpires) {
      return res.status(400).json({ message: 'Password reset code has expired. Please request a new one.' });
    }

    res.status(200).json({ message: 'OTP verified successfully. You can now set your new password.' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error verifying reset OTP' });
  }
});

// RESET PASSWORD - Final Step
router.post('/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.resetPasswordOTP || user.resetPasswordOTP !== otp.trim()) {
      return res.status(400).json({ message: 'Invalid password reset OTP code' });
    }

    if (new Date() > user.resetPasswordExpires) {
      return res.status(400).json({ message: 'Password reset code has expired' });
    }

    // Hash & update password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    
    // Ensure account is marked verified
    user.isVerified = true;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully! You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: error.message || 'Error resetting password' });
  }
});

// GET LOGGED-IN PROFILE - Protected
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE PROFILE - Protected
router.put('/profile', protect, async (req, res) => {
  const { username, avatarColor, newPassword } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (username && username.trim()) {
      user.username = username.trim();
    }
    if (avatarColor) {
      user.avatarColor = avatarColor;
    }
    if (newPassword && newPassword.length >= 6) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      avatarColor: updatedUser.avatarColor,
      token: generateToken(updatedUser._id),
      message: 'Profile updated successfully!',
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error updating profile' });
  }
});

module.exports = router;