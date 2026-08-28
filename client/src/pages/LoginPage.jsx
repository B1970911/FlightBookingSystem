import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Plane,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Compass,
} from 'lucide-react';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Destination after login
  const from = location.state?.from?.pathname || null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (error) setError('');
  };

  const validateForm = () => {
    const errors = {};
    const emailTrimmed = formData.email.trim();

    if (!emailTrimmed) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const response = await login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      // Redirect destination
      if (from) {
        navigate(from, { replace: true });
      } else if (response.user?.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      const msg =
        err.data?.message ||
        err.message ||
        'Invalid email or password. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-fullscreen-wrap">
      <div className="auth-shell">
        {/* Left Side: Premium Aviation Brand Visual Panel */}
        <aside className="auth-visual-panel" aria-label="Brand Overview">
          {/* Subtle Decorative Ambient Elements */}
          <div className="visual-bg-overlay" />
          <div className="visual-circle-accent visual-circle-top" />
          <div className="visual-circle-accent visual-circle-bottom" />

          {/* Top Brand Mark */}
          <div className="visual-brand-header">
            <div className="visual-logo-mark">
              <Plane className="visual-plane-icon" size={24} />
            </div>
            <div className="visual-brand-titles">
              <span className="visual-brand-name">SkyLink Ethiopia</span>
              <span className="visual-brand-tagline">National &amp; Regional Airways</span>
            </div>
          </div>

          {/* Main Hero Narrative */}
          <div className="visual-hero-body">
            <div className="visual-hero-pill">
              <Sparkles size={14} className="pill-sparkle" />
              <span>Premium Air Travel Experience</span>
            </div>
            <h2 className="visual-headline">Your journey starts here.</h2>
            <p className="visual-lead">
              Sign in to search real-time flight schedules across Ethiopia, manage your reserved itineraries, and travel with total peace of mind.
            </p>

            {/* Flight Route Preview Card */}
            <div className="visual-route-card">
              <div className="route-card-top">
                <div className="route-flight-meta">
                  <span className="flight-code-badge font-mono">ET-302</span>
                  <span className="flight-aircraft">Boeing 737-800</span>
                </div>
                <span className="route-status-pill">On Schedule</span>
              </div>

              <div className="route-cities-row">
                <div className="route-city-block">
                  <span className="city-code">ADD</span>
                  <span className="city-label">Addis Ababa</span>
                </div>

                <div className="route-mid-visual">
                  <span className="route-duration-text">1h 05m</span>
                  <div className="route-line-graphic">
                    <span className="route-dot" />
                    <span className="route-dash" />
                    <Plane size={15} className="route-plane" />
                    <span className="route-dash" />
                    <span className="route-dot" />
                  </div>
                  <span className="route-nonstop-text">Non-stop Direct</span>
                </div>

                <div className="route-city-block text-right">
                  <span className="city-code">BJR</span>
                  <span className="city-label">Bahir Dar</span>
                </div>
              </div>

              <div className="route-card-bottom">
                <span className="route-fare-label">One-way from</span>
                <span className="route-fare-price font-mono">ETB 2,500.00</span>
              </div>
            </div>

            {/* Feature Badges List */}
            <ul className="visual-features-list">
              <li className="visual-feature-item">
                <div className="feature-item-icon">
                  <Compass size={16} />
                </div>
                <div>
                  <strong>Instant E-Ticketing</strong>
                  <p>Automated confirmation sent directly to your email.</p>
                </div>
              </li>
              <li className="visual-feature-item">
                <div className="feature-item-icon">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <strong>Transparent ETB Fares</strong>
                  <p>Guaranteed clear pricing with zero hidden fees.</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Visual Footer */}
          <div className="visual-footer">
            <span>&copy; {new Date().getFullYear()} SkyLink Ethiopia. All rights reserved.</span>
          </div>
        </aside>

        {/* Right Side: Modern Authentication Form Panel */}
        <main className="auth-form-panel">
          <div className="auth-form-container">
            {/* Mobile Header */}
            <div className="auth-mobile-header">
              <div className="visual-logo-mark small">
                <Plane size={18} className="visual-plane-icon" />
              </div>
              <span className="mobile-brand-title">SkyLink Ethiopia</span>
            </div>

            {/* Form Heading Group */}
            <div className="auth-header-group">
              <div className="auth-pre-badge">
                <span>Account Access</span>
              </div>
              <h1 className="auth-title">Welcome back</h1>
              <p className="auth-subtitle">
                Sign in with your email and password to access your bookings and travel tools.
              </p>
            </div>

            {/* Error Notification Alert */}
            {error && (
              <div className="auth-alert error" role="alert">
                <AlertCircle size={18} className="alert-icon" />
                <span className="alert-text">{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              {/* Email Address Field */}
              <div className="auth-field-group">
                <label htmlFor="email" className="auth-field-label">
                  Email Address <span className="req-dot">*</span>
                </label>
                <div className={`auth-input-box ${validationErrors.email ? 'has-error' : ''}`}>
                  <Mail className="auth-input-icon" size={18} />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    className="auth-input"
                    placeholder="e.g. abebe.girma@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                    autoComplete="email"
                    required
                  />
                </div>
                {validationErrors.email && (
                  <span className="auth-field-error" role="alert">
                    {validationErrors.email}
                  </span>
                )}
              </div>

              {/* Password Field */}
              <div className="auth-field-group">
                <div className="auth-label-row">
                  <label htmlFor="password" className="auth-field-label">
                    Password <span className="req-dot">*</span>
                  </label>
                </div>
                <div className={`auth-input-box ${validationErrors.password ? 'has-error' : ''}`}>
                  <Lock className="auth-input-icon" size={18} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="auth-input font-password"
                    placeholder="Enter your account password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {validationErrors.password && (
                  <span className="auth-field-error" role="alert">
                    {validationErrors.password}
                  </span>
                )}
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                className="auth-primary-submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="btn-spinner" size={18} />
                    <span>Signing in to SkyLink...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={18} className="submit-arrow" />
                  </>
                )}
              </button>
            </form>

            {/* Footer Navigation */}
            <div className="auth-switch-box">
              <p className="auth-switch-text">
                Don&apos;t have an account yet?{' '}
                <Link to="/register" className="auth-switch-link">
                  Create an account
                </Link>
              </p>
            </div>

            {/* Trust & Security Indicator */}
            <div className="auth-trust-note">
              <ShieldCheck size={15} className="trust-icon" />
              <span>Secure SSL encrypted connection &bull; SkyLink Ethiopia</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default LoginPage;
