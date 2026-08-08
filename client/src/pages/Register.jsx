import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  // Form states
  const [step, setStep] = useState(1); // 1 = Details, 2 = OTP Verification
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [devNotice, setDevNotice] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Auto handle unverified redirect from Login
  useEffect(() => {
    if (location.state?.unverifiedEmail) {
      setEmail(location.state.unverifiedEmail);
      setStep(2);
      setInfoMsg(`Please enter the 6-digit verification code sent to ${location.state.unverifiedEmail}`);
      if (location.state.devOtp) {
        setDevNotice(`[DEV MODE] Verification OTP: ${location.state.devOtp}`);
      }
    }
  }, [location.state]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Handle Step 1 Registration Submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setDevNotice('');
    setLoading(true);

    try {
      const { data } = await axios.post('/api/auth/register', {
        username,
        email,
        password,
      });

      setStep(2);
      setInfoMsg(data.message || `Verification code sent to ${email}`);
      setResendCooldown(30);

      if (data.devOtp) {
        setDevNotice(`[DEV MODE] Verification OTP: ${data.devOtp}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP Inputs
  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value[value.length - 1];
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input box
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  // Handle Step 2 OTP Submission
  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      setError('Please enter all 6 digits of the verification code');
      return;
    }

    setError('');
    setInfoMsg('');
    setLoading(true);

    try {
      const { data } = await axios.post('/api/auth/verify-otp', {
        email,
        otp: fullOtp,
      });

      login(data);
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setInfoMsg('');
    setDevNotice('');
    setLoading(true);

    try {
      const { data } = await axios.post('/api/auth/resend-otp', { email });
      setInfoMsg(data.message || 'A new OTP has been sent to your email.');
      setResendCooldown(60);

      if (data.devOtp) {
        setDevNotice(`[DEV MODE] Verification OTP: ${data.devOtp}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
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
          <div style={styles.logoBadge}>🚀</div>
          <h1 style={styles.title}>
            {step === 1 ? 'Create Account' : 'Verify Email'}
          </h1>
          <p style={styles.subtitle}>
            {step === 1
              ? 'Join ChatApp and start messaging instantly'
              : `Enter the code sent to ${email}`}
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

        {step === 1 ? (
          /* STEP 1 FORM */
          <form onSubmit={handleRegisterSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Username</label>
              <input
                className="glass-input"
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address (Real / Valid Domain)</label>
              <input
                className="glass-input"
                type="email"
                placeholder="name@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <span style={styles.hintText}>
                Must be an existing domain with valid mail servers (MX record check enforced).
              </span>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.passwordWrapper}>
                <input
                  className="glass-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '8px' }}>
              {loading ? <span className="spinner"></span> : 'Send Verification OTP 📩'}
            </button>
          </form>
        ) : (
          /* STEP 2 FORM - OTP */
          <form onSubmit={handleVerifyOtpSubmit} style={styles.form}>
            <div style={styles.otpContainer}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-input-${idx}`}
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

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? <span className="spinner"></span> : 'Verify Account & Start Chatting 🎉'}
            </button>

            <div style={styles.resendRow}>
              <button
                type="button"
                style={styles.resendBtn}
                onClick={handleResendOtp}
                disabled={resendCooldown > 0 || loading}
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Didn\'t receive code? Resend OTP'}
              </button>

              <button
                type="button"
                style={styles.changeEmailBtn}
                onClick={() => {
                  setStep(1);
                  setOtp(['', '', '', '', '', '']);
                  setError('');
                  setInfoMsg('');
                  setDevNotice('');
                }}
              >
                Change Email
              </button>
            </div>
          </form>
        )}

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Already have an account?{' '}
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
    maxWidth: '440px',
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
    background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)',
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
  hintText: {
    fontSize: '11px',
    color: '#64748b',
    marginTop: '2px',
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
    margin: '12px 0 8px',
  },
  otpInput: {
    width: '48px',
    height: '56px',
    textAlign: 'center',
    fontSize: '22px',
    fontWeight: '700',
    color: '#6366f1',
    background: 'rgba(15, 23, 42, 0.8)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: '10px',
    outline: 'none',
  },
  resendRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    marginTop: '4px',
  },
  resendBtn: {
    background: 'none',
    border: 'none',
    color: '#818cf8',
    cursor: 'pointer',
    fontWeight: '500',
  },
  changeEmailBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    textDecoration: 'underline',
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

export default Register;