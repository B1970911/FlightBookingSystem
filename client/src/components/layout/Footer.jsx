import { Link } from 'react-router-dom';
import { Plane } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-container" aria-label="Site Footer">
      <div className="footer-content">
        {/* Brand Section */}
        <div className="footer-brand-section">
          <Link to="/" className="footer-brand" aria-label="SkyLink Ethiopia Home">
            <span className="footer-logo-badge">
              <Plane className="footer-logo-icon" size={18} />
            </span>
            <div className="footer-brand-text">
              <span className="brand-name">SkyLink</span>
              <span className="brand-country">Ethiopia</span>
            </div>
          </Link>
          <p className="footer-description">
            Your trusted flight booking platform for convenient travel across Ethiopia and beyond.
          </p>
        </div>

        {/* Quick Links */}
        <div className="footer-links-section">
          <h4 className="footer-heading">Quick Links</h4>
          <ul className="footer-links-list">
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/flights">Flights</Link>
            </li>
            <li>
              <Link to="/bookings">My Bookings</Link>
            </li>
            <li>
              <Link to="/login">Sign In</Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="footer-bottom-bar">
        <p className="footer-copyright">
          &copy; {currentYear} SkyLink Ethiopia. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default Footer;
