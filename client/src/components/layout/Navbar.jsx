import { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  Plane,
  Menu,
  X,
  User,
  LogOut,
  Ticket,
  LayoutDashboard,
  LogIn,
  UserPlus,
  ChevronDown,
  Shield,
} from 'lucide-react';

export function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const closeMenus = () => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  };

  // Close menus when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        const toggleBtn = document.getElementById('mobile-menu-toggle');
        if (toggleBtn && !toggleBtn.contains(event.target)) {
          setMobileMenuOpen(false);
        }
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setUserDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = () => {
    logout();
    closeMenus();
    navigate('/');
  };

  return (
    <header className="navbar-header">
      <nav className="navbar-container" aria-label="Main Navigation">
        {/* Brand Logo */}
        <Link
          to="/"
          className="navbar-brand"
          aria-label="SkyLink Ethiopia Home"
          onClick={closeMenus}
        >
          <span className="navbar-logo-badge">
            <Plane className="navbar-logo-icon" size={20} />
          </span>
          <div className="navbar-brand-text">
            <span className="brand-name">SkyLink</span>
            <span className="brand-country">Ethiopia</span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="navbar-desktop-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeMenus}
          >
            Home
          </NavLink>

          <NavLink
            to="/flights"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={closeMenus}
          >
            Flights
          </NavLink>

          {isAuthenticated && (
            <NavLink
              to="/bookings"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeMenus}
            >
              My Bookings
            </NavLink>
          )}

          {isAuthenticated && isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-link nav-link-admin ${isActive ? 'active' : ''}`}
              onClick={closeMenus}
            >
              <Shield size={14} className="nav-admin-icon" />
              Admin Dashboard
            </NavLink>
          )}
        </div>

        {/* Desktop Auth / User Controls */}
        <div className="navbar-desktop-actions">
          {isAuthenticated ? (
            <div className="user-menu-wrapper" ref={dropdownRef}>
              <button
                type="button"
                className="user-menu-trigger"
                onClick={() => setUserDropdownOpen((prev) => !prev)}
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
                aria-label="User account menu"
              >
                <div className="user-avatar-badge">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <User size={16} />}
                </div>
                <span className="user-menu-name">{user?.name || 'Account'}</span>
                <ChevronDown
                  size={16}
                  className={`user-chevron ${userDropdownOpen ? 'open' : ''}`}
                />
              </button>

              {userDropdownOpen && (
                <div className="user-dropdown-menu" role="menu">
                  <div className="user-dropdown-header">
                    <p className="dropdown-user-name">{user?.name}</p>
                    <p className="dropdown-user-email">{user?.email}</p>
                    <span className={`dropdown-role-pill ${isAdmin ? 'admin' : 'user'}`}>
                      {user?.role}
                    </span>
                  </div>

                  <div className="dropdown-divider" />

                  <Link
                    to="/bookings"
                    className="dropdown-item"
                    role="menuitem"
                    onClick={closeMenus}
                  >
                    <Ticket size={16} />
                    <span>My Bookings</span>
                  </Link>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="dropdown-item"
                      role="menuitem"
                      onClick={closeMenus}
                    >
                      <LayoutDashboard size={16} />
                      <span>Admin Dashboard</span>
                    </Link>
                  )}

                  <div className="dropdown-divider" />

                  <button
                    type="button"
                    className="dropdown-item logout"
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="guest-nav-actions">
              <Link to="/login" className="nav-btn-login" onClick={closeMenus}>
                <LogIn size={16} />
                <span>Sign In</span>
              </Link>
              <Link to="/register" className="nav-btn-register" onClick={closeMenus}>
                <UserPlus size={16} />
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          id="mobile-menu-toggle"
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-nav-drawer"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="mobile-drawer"
          ref={mobileMenuRef}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
        >
          {isAuthenticated && (
            <div className="mobile-user-profile">
              <div className="user-avatar-badge large">
                {user?.name ? user.name.charAt(0).toUpperCase() : <User size={20} />}
              </div>
              <div className="mobile-user-info">
                <p className="mobile-user-name">{user?.name}</p>
                <p className="mobile-user-email">{user?.email}</p>
                <span className={`dropdown-role-pill ${isAdmin ? 'admin' : 'user'}`}>
                  {user?.role}
                </span>
              </div>
            </div>
          )}

          <div className="mobile-nav-links">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
              onClick={closeMenus}
            >
              Home
            </NavLink>

            <NavLink
              to="/flights"
              className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
              onClick={closeMenus}
            >
              Flights
            </NavLink>

            {isAuthenticated && (
              <NavLink
                to="/bookings"
                className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
                onClick={closeMenus}
              >
                <Ticket size={18} />
                <span>My Bookings</span>
              </NavLink>
            )}

            {isAuthenticated && isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `mobile-nav-item mobile-admin ${isActive ? 'active' : ''}`
                }
                onClick={closeMenus}
              >
                <LayoutDashboard size={18} />
                <span>Admin Dashboard</span>
              </NavLink>
            )}
          </div>

          <div className="mobile-drawer-footer">
            {isAuthenticated ? (
              <button
                type="button"
                className="mobile-logout-btn"
                onClick={handleLogout}
              >
                <LogOut size={18} />
                <span>Log Out</span>
              </button>
            ) : (
              <div className="mobile-auth-buttons">
                <Link to="/login" className="nav-btn-login mobile" onClick={closeMenus}>
                  <LogIn size={16} />
                  <span>Sign In</span>
                </Link>
                <Link to="/register" className="nav-btn-register mobile" onClick={closeMenus}>
                  <UserPlus size={16} />
                  <span>Register</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
