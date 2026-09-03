import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { bookingService } from '../services/bookingService';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate, formatTime } from '../utils/formatDate';
import { ConfirmModal } from '../components/common';
import {
  Ticket,
  Plane,
  Calendar,
  Users,
  AlertCircle,
  RefreshCw,
  Search,
  ArrowRight,
  Ban,
  Armchair,
} from 'lucide-react';

export function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state for cancellation
  const [cancellingBookingId, setCancellingBookingId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const fetchMyBookings = useCallback(async (isInitial = false) => {
    if (!isInitial) setLoading(true);
    setError(null);
    try {
      const data = await bookingService.getMyBookings();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg =
        err.data?.message ||
        err.message ||
        'Unable to load your bookings. Please check your connection.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadInitial() {
      try {
        const data = await bookingService.getMyBookings();
        if (isMounted) {
          setBookings(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          const msg =
            err.data?.message ||
            err.message ||
            'Unable to load your bookings. Please check your connection.';
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadInitial();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Booking Cancellation Confirm
  const handleConfirmCancel = async () => {
    if (!cancellingBookingId) return;

    setCancelLoading(true);
    setCancelError(null);

    try {
      const updatedBooking = await bookingService.cancelBooking(cancellingBookingId);
      // Update state locally with the updated booking
      setBookings((prev) =>
        prev.map((b) =>
          (b._id || b.id) === cancellingBookingId
            ? { ...b, bookingStatus: updatedBooking.bookingStatus || 'Cancelled' }
            : b
        )
      );
      setCancellingBookingId(null);
    } catch (err) {
      const msg =
        err.data?.message ||
        err.message ||
        'Failed to cancel booking. Please try again.';
      setCancelError(msg);
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="bookings-page-container">
      {/* Header */}
      <div className="bookings-header-banner">
        <div className="bookings-badge">
          <Ticket size={16} />
          <span>My Reservations</span>
        </div>
        <h1>My Flight Bookings</h1>
        <p>Manage your booked flight itineraries, e-tickets, and status updates</p>
      </div>

      {cancelError && (
        <div className="auth-alert error" role="alert" style={{ marginBottom: '20px' }}>
          <AlertCircle size={18} className="alert-icon" />
          <span>{cancelError}</span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flights-loading-state" role="status">
          <div className="auth-spinner" />
          <p>Loading your flight bookings...</p>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="flights-error-state" role="alert">
          <AlertCircle size={36} className="error-state-icon" />
          <h3>Could Not Load Bookings</h3>
          <p>{error}</p>
          <button type="button" className="btn-retry" onClick={fetchMyBookings}>
            <RefreshCw size={16} />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && bookings.length === 0 && (
        <div className="flights-empty-state">
          <div className="empty-icon-box">
            <Ticket size={36} className="empty-state-icon" />
          </div>
          <h3>No Bookings Found</h3>
          <p>
            You have not booked any flights yet. Explore our flight schedules across Ethiopia and reserve your seat today.
          </p>
          <Link to="/flights" className="btn-reset-empty">
            <Search size={16} />
            <span>Search Available Flights</span>
          </Link>
        </div>
      )}

      {/* Bookings List */}
      {!loading && !error && bookings.length > 0 && (
        <div className="bookings-list-grid">
          {bookings.map((booking) => {
            const bookingId = booking._id || booking.id;
            const flight = booking.flight || {};
            const isCancelled = booking.bookingStatus === 'Cancelled';

            return (
              <article key={bookingId} className="user-booking-card">
                {/* Booking Header */}
                <div className="user-booking-header">
                  <div className="booking-ref-group">
                    <span className="booking-ref-label">Booking Reference</span>
                    <span className="booking-ref-id font-mono">{bookingId}</span>
                  </div>

                  <span
                    className={`status-pill ${
                      isCancelled ? 'status-cancelled' : 'status-scheduled'
                    }`}
                  >
                    {booking.bookingStatus || 'Confirmed'}
                  </span>
                </div>

                {/* Flight Route & Details */}
                <div className="user-booking-route">
                  <div className="booking-airline-row">
                    <Plane size={16} className="booking-plane-icon" />
                    <strong>{flight.airline || 'SkyLink Flight'}</strong>
                    <span className="booking-flight-number">({flight.flightNumber || 'N/A'})</span>
                  </div>

                  <div className="booking-endpoints-row">
                    <div className="booking-city-point">
                      <span className="city-name">{flight.departureCity || 'Origin'}</span>
                      <span className="city-time">{flight.departureTime ? formatTime(flight.departureTime) : '--:--'}</span>
                    </div>

                    <div className="booking-route-arrow">
                      <div className="route-dash-line" />
                      <Plane size={14} className="route-arrow-icon" />
                    </div>

                    <div className="booking-city-point arrival">
                      <span className="city-name">{flight.arrivalCity || 'Destination'}</span>
                    </div>
                  </div>

                  <div className="booking-meta-row">
                    <span className="booking-meta-item">
                      <Calendar size={14} />
                      {flight.departureTime ? formatDate(flight.departureTime) : 'Date N/A'}
                    </span>
                    {booking.selectedSeats && booking.selectedSeats.length > 0 ? (
                      <span className="booking-meta-item seats-highlight">
                        <Armchair size={14} />
                        <span>
                          Seats: <strong>{booking.selectedSeats.join(', ')}</strong> ({booking.numberOfSeats} {booking.numberOfSeats === 1 ? 'seat' : 'seats'})
                        </span>
                      </span>
                    ) : (
                      <span className="booking-meta-item">
                        <Users size={14} />
                        {booking.numberOfSeats} {booking.numberOfSeats === 1 ? 'Seat' : 'Seats'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Booking Footer */}
                <div className="user-booking-footer">
                  <div className="booking-total-price">
                    <span className="price-label">Total Amount</span>
                    <span className="price-val">{formatCurrency(booking.totalPrice)}</span>
                  </div>

                  <div className="booking-card-actions">
                    <Link
                      to={`/bookings/${bookingId}`}
                      className="btn btn-secondary btn-sm"
                    >
                      <span>View Details</span>
                      <ArrowRight size={14} />
                    </Link>

                    {!isCancelled && (
                      <button
                        type="button"
                        className="btn btn-destructive-outline btn-sm"
                        onClick={() => setCancellingBookingId(bookingId)}
                      >
                        <Ban size={14} />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(cancellingBookingId)}
        title="Cancel This Flight Booking?"
        message="Are you sure you want to cancel this booking? Your reserved seats will be released back into availability. This action cannot be undone."
        confirmText="Yes, Cancel Booking"
        cancelText="Keep Booking"
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancellingBookingId(null)}
        loading={cancelLoading}
        isDestructive={true}
      />
    </div>
  );
}

export default BookingsPage;
