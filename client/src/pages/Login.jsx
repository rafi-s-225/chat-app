import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devNotice, setDevNotice] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDevNotice('');
    setLoading(true);

    try {
      const { data } = await axios.post('/api/auth/login', { email, password });
      login(data);
      navigate('/chat');
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.requiresVerification) {
        // Redirect to register flow with prefilled email for OTP verification
        if (errData.devOtp) {
          setDevNotice(`[DEV MODE] Verification OTP: ${errData.devOtp}`);
        }
        navigate('/register', { state: { unverifiedEmail: email, devOtp: errData.devOtp } });
      } else {
        setError(errData?.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageContainer}>
      {/* Ambient background glow */}
      <div className="ambient-bg">
        <div className="ambient-blob-1"></div>
        <div className="ambient-blob-2"></div>
      </div>

      <div style={styles.card} className="glass-panel">
        <div style={styles.brandHeader}>
          <div style={styles.logoBadge}>💬</div>
          <h1 style={styles.title}>Welcome Back</h1>
          <p style={styles.subtitle}>Sign in to your ChatApp account</p>
        </div>

        {error && (
          <div className="alert-box alert-danger">
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        )}

        {devNotice && (
          <div className="alert-box alert-info">
            <span>💡</span>
            <div>{devNotice}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              className="glass-input"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <div style={styles.labelRow}>
              <label style={styles.label}>Password</label>
              <Link to="/forgot-password" style={styles.forgotLink}>
                Forgot Password?
              </Link>
            </div>
            <div style={styles.passwordWrapper}>
              <input
                className="glass-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                style={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '🙈'}
              </button>
            </div>
          </div>

          <button className="btn-primary" type="submit" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? <span className="spinner"></span> : 'Sign In 🚀'}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Don't have an account?{' '}
            <Link to="/register" style={styles.signupLink}>
              Create Account
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
    marginBottom: '28px',
  },
  logoBadge: {
    width: '56px',
    height: '56px',
    margin: '0 auto 16px',
    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    boxShadow: '0 8px 20px rgba(99, 102, 241, 0.4)',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    letterSpacing: '-0.5px',
    color: '#f8fafc',
    marginBottom: '6px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  labelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#cbd5e1',
  },
  forgotLink: {
    fontSize: '12px',
    color: '#818cf8',
    textDecoration: 'none',
    fontWeight: '500',
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
    transition: 'opacity 0.2s',
  },
  footer: {
    marginTop: '28px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  signupLink: {
    color: '#818cf8',
    fontWeight: '600',
    textDecoration: 'none',
  },
};

export default Login;