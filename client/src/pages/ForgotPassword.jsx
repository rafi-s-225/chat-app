import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const ForgotPassword = () => {
  const navigate = useNavigate();

  // Steps: 1 = Enter Email, 2 = Verify OTP & Reset Password, 3 = Complete Success
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [devNotice, setDevNotice] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Step 1: Request Reset OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setDevNotice('');
    setLoading(true);

    try {
      const { data } = await axios.post('/api/auth/forgot-password', { email });
      setStep(2);
      setInfoMsg(data.message || `Reset code sent to ${email}`);
      setResendCooldown(60);

      if (data.devOtp) {
        setDevNotice(`[DEV MODE] Password Reset OTP: ${data.devOtp}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process request. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  // OTP inputs
  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value[value.length - 1];
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`reset-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`reset-otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  // Step 2: Reset Password Submit
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    const fullOtp = otp.join('');

    if (fullOtp.length < 6) {
      setError('Please enter all 6 digits of the password reset code.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    setError('');
    setInfoMsg('');
    setLoading(true);

    try {
      const { data } = await axios.post('/api/auth/reset-password', {
        email,
        otp: fullOtp,
        newPassword,
      });

      setStep(3);
      setInfoMsg(data.message || 'Password reset successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please check your OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageContainer}>
      <div className="ambient-bg">
        <div className="ambient-blob-1"></div>
        <div className="ambient-blob-2"></div>
      </div>

      <div style={styles.card} className="glass-panel">
        <div style={styles.brandHeader}>
          <div style={styles.logoBadge}>🔑</div>
          <h1 style={styles.title}>
            {step === 1 && 'Forgot Password'}
            {step === 2 && 'Reset Password'}
            {step === 3 && 'Password Changed!'}
          </h1>
          <p style={styles.subtitle}>
            {step === 1 && 'Enter your registered email to receive a reset OTP'}
            {step === 2 && `Enter the 6-digit code sent to ${email}`}
            {step === 3 && 'Your account security credentials have been updated'}
          </p>
        </div>

        {error && (
          <div className="alert-box alert-danger">
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        )}

        {infoMsg && (
          <div className="alert-box alert-success">
            <span>✅</span>
            <div>{infoMsg}</div>
          </div>
        )}

        {devNotice && (
          <div className="alert-box alert-info">
            <span>💡</span>
            <div>{devNotice}</div>
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleRequestOtp} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Registered Email Address</label>
              <input
                className="glass-input"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Send Reset Code 📩'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>6-Digit Verification OTP</label>
              <div style={styles.otpContainer}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`reset-otp-${idx}`}
                    type="text"
                    maxLength={1}
                    style={styles.otpInput}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    required
                  />
                ))}
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>New Password</label>
              <div style={styles.passwordWrapper}>
                <input
                  className="glass-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  style={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '👁️' : '🙈'}
                </button>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Confirm New Password</label>
              <input
                className="glass-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Reset Password Now 🔐'}
            </button>
          </form>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <button
              className="btn-primary"
              onClick={() => navigate('/')}
            >
              Back to Login 🚀
            </button>
          </div>
        )}

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Remembered your password?{' '}
            <Link to="/" style={styles.loginLink}>
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const styles = {
  pageContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    position: 'relative',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '36px 32px',
    position: 'relative',
    zIndex: 1,
    animation: 'slideUp 0.4s ease',
  },
  brandHeader: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  logoBadge: {
    width: '56px',
    height: '56px',
    margin: '0 auto 16px',
    background: 'linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    boxShadow: '0 8px 20px rgba(245, 158, 11, 0.35)',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
    color: '#f8fafc',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#cbd5e1',
  },
  passwordWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    opacity: 0.7,
  },
  otpContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    margin: '4px 0',
  },
  otpInput: {
    width: '46px',
    height: '52px',
    textAlign: 'center',
    fontSize: '20px',
    fontWeight: '700',
    color: '#ec4899',
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(236, 72, 153, 0.3)',
    borderRadius: '10px',
    outline: 'none',
  },
  footer: {
    marginTop: '24px',
    paddingTop: '18px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  loginLink: {
    color: '#818cf8',
    fontWeight: '600',
    textDecoration: 'none',
  },
};

export default ForgotPassword;
