import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { flightService } from '../services/flightService';
import { formatCurrency } from '../utils/formatCurrency';
import {
  formatDate,
  formatTime,
  formatFlightDuration,
} from '../utils/formatDate';
import {
  Plane,
  ArrowLeft,
  ShieldCheck,
  Clock,
  AlertCircle,
  RefreshCw,
  Ticket,
  Calendar,
  CheckCircle2,
} from 'lucide-react';

export function FlightDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [flight, setFlight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadFlight() {
      if (!id) return;
      setLoading(true);
      setError(null);

      try {
        const data = await flightService.getFlightById(id);
        if (isMounted) {
          setFlight(data);
        }
      } catch (err) {
        if (isMounted) {
          const message =
            err.status === 404
              ? 'The requested flight was not found or has been removed.'
              : err.data?.message || err.message || 'Unable to load flight details.';
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadFlight();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flight-details-container">
        <div className="flights-loading-state" role="status" aria-label="Loading flight details">
          <div className="auth-spinner" />
          <p>Loading flight information...</p>
        </div>
      </div>
    );
  }

  if (error || !flight) {
    return (
      <div className="flight-details-container">
        <div className="flights-error-state" role="alert">
          <AlertCircle size={40} className="error-state-icon" />
          <h2>Flight Information Unavailable</h2>
          <p>{error || 'Flight not found.'}</p>
          <div className="error-actions-row">
            <button type="button" className="btn-retry" onClick={() => navigate('/flights')}>
              <ArrowLeft size={16} />
              <span>Back to Flights</span>
            </button>
            <button
              type="button"
              className="btn-retry"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={16} />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const {
    _id,
    flightNumber,
    airline,
    departureCity,
    arrivalCity,
    departureTime,
    arrivalTime,
    price,
    availableSeats,
    totalSeats,
    status = 'Scheduled',
  } = flight;

  const flightId = _id || id;
  const isAvailable = availableSeats > 0 && status !== 'Cancelled';
  const duration = formatFlightDuration(departureTime, arrivalTime);

  const getStatusClass = (st) => {
    switch (st?.toLowerCase()) {
      case 'scheduled':
        return 'status-scheduled';
      case 'delayed':
        return 'status-delayed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-scheduled';
    }
  };

  const handleBookNow = () => {
    navigate(`/bookings/create/${flightId}`);
  };

  return (
    <div className="flight-details-container">
      {/* Top Back Navigation Bar */}
      <div className="details-nav-bar">
        <Link to="/flights" className="back-link">
          <ArrowLeft size={18} />
          <span>Back to All Flights</span>
        </Link>
      </div>

      <div className="details-layout-grid">
        {/* Main Flight Card */}
        <section className="details-main-card">
          {/* Header Banner */}
          <div className="details-card-header">
            <div className="airline-info-large">
              <div className="airline-logo-box large">
                <Plane size={24} />
              </div>
              <div>
                <h1 className="flight-hero-title">{airline}</h1>
                <div className="flight-meta-tags">
                  <span className="flight-tag flight-number-tag">{flightNumber}</span>
                  <span className={`flight-tag flight-status-tag ${getStatusClass(status)}`}>
                    {status}
                  </span>
                </div>
              </div>
            </div>

            <div className="seat-status-box">
              <span className="seat-number-large">{availableSeats}</span>
              <span className="seat-label">Seats Available</span>
              {totalSeats && (
                <span className="seat-total-label">out of {totalSeats} total</span>
              )}
            </div>
          </div>

          {/* Flight Journey Segment */}
          <div className="details-journey-box">
            <h2 className="section-subheading">Flight Itinerary</h2>

            <div className="journey-grid">
              {/* Departure Point */}
              <div className="journey-point departure">
                <div className="point-badge">Departure</div>
                <div className="point-city-large">{departureCity}</div>
                <div className="point-time-large">{formatTime(departureTime)}</div>
                <div className="point-date-row">
                  <Calendar size={15} />
                  <span>{formatDate(departureTime)}</span>
                </div>
              </div>

              {/* Journey Visual Path */}
              <div className="journey-path-center">
                <span className="journey-duration-badge">
                  <Clock size={14} />
                  {duration} Non-stop
                </span>
                <div className="journey-path-line-box">
                  <div className="journey-path-dot" />
                  <div className="journey-path-line" />
                  <Plane size={22} className="journey-path-plane" />
                  <div className="journey-path-dot" />
                </div>
                <span className="journey-airline-note">{airline} Standard</span>
              </div>

              {/* Arrival Point */}
              <div className="journey-point arrival">
                <div className="point-badge">Arrival</div>
                <div className="point-city-large">{arrivalCity}</div>
                <div className="point-time-large">{formatTime(arrivalTime)}</div>
                <div className="point-date-row">
                  <Calendar size={15} />
                  <span>{formatDate(arrivalTime)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Inclusions / Highlights */}
          <div className="details-features-box">
            <h2 className="section-subheading">Flight Highlights</h2>
            <div className="features-mini-grid">
              <div className="feature-mini-item">
                <CheckCircle2 size={18} className="feature-mini-icon" />
                <span>Transparent ETB Pricing</span>
              </div>
              <div className="feature-mini-item">
                <CheckCircle2 size={18} className="feature-mini-icon" />
                <span>Instant Resend Confirmation Email</span>
              </div>
              <div className="feature-mini-item">
                <CheckCircle2 size={18} className="feature-mini-icon" />
                <span>Standard Cabin Baggage Included</span>
              </div>
              <div className="feature-mini-item">
                <CheckCircle2 size={18} className="feature-mini-icon" />
                <span>Self-Service Booking Management</span>
              </div>
            </div>
          </div>
        </section>

        {/* Sidebar Summary & Booking Call to Action */}
        <aside className="details-sidebar-card">
          <h2 className="sidebar-title">Fare Summary</h2>

          <div className="fare-breakdown-box">
            <div className="fare-row">
              <span className="fare-label">Base Fare (1 Passenger)</span>
              <span className="fare-value">{formatCurrency(price)}</span>
            </div>
            <div className="fare-row">
              <span className="fare-label">Airport Taxes &amp; Surcharges</span>
              <span className="fare-value included">Included</span>
            </div>
            <div className="fare-divider" />
            <div className="fare-row total">
              <span className="fare-label">Total Price (ETB)</span>
              <span className="fare-value total-amount">{formatCurrency(price)}</span>
            </div>
          </div>

          <div className="sidebar-action-group">
            <button
              type="button"
              className={`btn-book-flight ${!isAvailable ? 'disabled' : ''}`}
              onClick={handleBookNow}
              disabled={!isAvailable}
            >
              <Ticket size={18} />
              <span>{isAvailable ? 'Book This Flight' : 'Flight Unavailable'}</span>
            </button>

            {!isAvailable && (
              <p className="unavailable-notice">
                {status === 'Cancelled'
                  ? 'This flight is currently cancelled.'
                  : 'All seats on this flight have been booked.'}
              </p>
            )}

            <div className="trust-security-badge">
              <ShieldCheck size={16} className="trust-icon" />
              <span>Official Ethiopian Birr Pricing</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default FlightDetailsPage;
