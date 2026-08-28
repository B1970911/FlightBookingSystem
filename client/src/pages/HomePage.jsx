import { Link } from 'react-router-dom';
import { Plane, Search, ShieldCheck, Banknote, CalendarCheck, ArrowRight } from 'lucide-react';

export function HomePage() {
  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section" aria-labelledby="hero-title">
        <div className="hero-content">
          <div className="hero-badge">
            <Plane size={16} className="hero-badge-icon" />
            <span>Welcome to SkyLink Ethiopia</span>
          </div>

          <h1 id="hero-title" className="hero-title">
            Fly Seamlessly Across Ethiopia &amp; Beyond
          </h1>

          <p className="hero-description">
            Your premier aviation portal for booking domestic and regional flights.
            Enjoy transparent Ethiopian Birr pricing, instant e-ticket confirmations, and reliable travel service.
          </p>

          <div className="hero-cta-group">
            <Link to="/flights" className="hero-primary-btn">
              <Search size={18} />
              <span>Search Flights</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Hero Decorative Visual Card */}
        <div className="hero-visual-card">
          <div className="flight-route-preview">
            <div className="route-header">
              <span className="route-type">Popular Route</span>
              <span className="route-status">Daily Flights</span>
            </div>

            <div className="route-endpoints">
              <div className="endpoint">
                <span className="airport-code">ADD</span>
                <span className="city-name">Addis Ababa</span>
              </div>

              <div className="flight-path-indicator">
                <div className="path-line" />
                <Plane size={20} className="path-plane" />
              </div>

              <div className="endpoint">
                <span className="airport-code">BJR</span>
                <span className="city-name">Bahir Dar</span>
              </div>
            </div>

            <div className="route-footer">
              <span className="currency-tag">Prices in ETB</span>
              <Link to="/flights" className="route-link">
                View Schedule &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Grid */}
      <section className="features-section" aria-label="Key Benefits">
        <div className="feature-card">
          <div className="feature-icon-wrapper">
            <Banknote size={24} className="feature-icon" />
          </div>
          <h3 className="feature-title">Transparent ETB Pricing</h3>
          <p className="feature-text">
            All fares and booking totals are clearly formatted and calculated in Ethiopian Birr with no hidden conversion fees.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrapper">
            <CalendarCheck size={24} className="feature-icon" />
          </div>
          <h3 className="feature-title">Instant E-Tickets</h3>
          <p className="feature-text">
            Receive immediate automated flight booking confirmation and email receipts directly to your inbox.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrapper">
            <ShieldCheck size={24} className="feature-icon" />
          </div>
          <h3 className="feature-title">Reliable Flight Operations</h3>
          <p className="feature-text">
            Real-time schedule tracking, seat management, and comprehensive self-service booking cancellation when needed.
          </p>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
