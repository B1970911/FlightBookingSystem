import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { bookingService } from '../services/bookingService';
import { paymentService } from '../services/paymentService';
import { formatCurrency } from '../utils/formatCurrency';
import {
  formatDate,
  formatTime,
  formatFlightDuration,
} from '../utils/formatDate';
import { ConfirmModal } from '../components/common';
import {
  ArrowLeft,
  Plane,
  Calendar,
  Clock,
  Users,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Ban,
  ShieldCheck,
  User,
  Mail,
  Loader2,
} from 'lucide-react';

export function BookingDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cancellation modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  // Payment flow state within details
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadBooking() {
      if (!id) return;
      setLoading(true);
      setError(null);

      try {
        const data = await bookingService.getBookingById(id);
        if (isMounted) {
          setBooking(data);
        }
      } catch (err) {
        if (isMounted) {
          const msg =
            err.status === 404
              ? 'Booking not found.'
              : err.status === 403
              ? 'You are not authorized to view this booking.'
              : err.data?.message || err.message || 'Unable to load booking details.';
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadBooking();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Handle Booking Cancellation
  const handleCancelBooking = async () => {
    if (!booking) return;

    setCancelLoading(true);
    setCancelError(null);

    try {
      const bookingId = booking._id || booking.id;
      const updated = await bookingService.cancelBooking(bookingId);
      setBooking((prev) => ({
        ...prev,
        bookingStatus: updated.bookingStatus || 'Cancelled',
      }));
      setShowCancelModal(false);
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

  // Quick Pay from details if needed
  const handleQuickPay = async () => {
    if (!booking) return;

    setPaymentLoading(true);
    setCancelError(null);

    try {
      const bookingId = booking._id || booking.id;
      // 1. Create payment
      let paymentRecord;
      try {
        paymentRecord = await paymentService.createPayment({ bookingId });
      } catch (err) {
        // If payment record already exists, proceed to confirm
        if (err.data?.message?.includes('already exists')) {
          // Payment already created
        } else {
          throw err;
        }
      }

      if (paymentRecord?._id) {
        await paymentService.confirmPayment(paymentRecord._id);
      }
      setPaymentSuccess(true);
    } catch (err) {
      const msg = err.data?.message || err.message || 'Payment failed.';
      setCancelError(msg);
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="booking-page-container">
        <div className="flights-loading-state" role="status">
          <div className="auth-spinner" />
          <p>Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="booking-page-container">
        <div className="flights-error-state" role="alert">
          <AlertCircle size={40} className="error-state-icon" />
          <h2>Booking Details Unavailable</h2>
          <p>{error || 'Could not find booking.'}</p>
          <button type="button" className="btn-retry" onClick={() => navigate('/bookings')}>
            <ArrowLeft size={16} />
            <span>Back to My Bookings</span>
          </button>
        </div>
      </div>
    );
  }

  const bookingId = booking._id || booking.id;
  const flight = booking.flight || {};
  const isCancelled = booking.bookingStatus === 'Cancelled';
  const duration = formatFlightDuration(flight.departureTime, flight.arrivalTime);

  return (
    <div className="booking-details-page-container">
      {/* Back Link */}
      <div className="details-nav-bar">
        <Link to="/bookings" className="back-link">
          <ArrowLeft size={16} />
          <span>Back to My Bookings</span>
        </Link>
      </div>

      {cancelError && (
        <div className="auth-alert error" role="alert" style={{ marginBottom: '20px' }}>
          <AlertCircle size={18} className="alert-icon" />
          <span>{cancelError}</span>
        </div>
      )}

      {paymentSuccess && (
        <div className="auth-alert success" role="alert" style={{ marginBottom: '20px' }}>
          <CheckCircle2 size={18} className="alert-icon" />
          <span>
            Payment confirmed! A confirmation receipt has been sent via Resend email.
          </span>
        </div>
      )}

      <div className="booking-details-layout">
        {/* Main Details Card */}
        <section className="booking-info-main-card">
          {/* Header */}
          <div className="booking-details-header">
            <div>
              <span className="booking-ref-label">Booking Reference</span>
              <h1 className="booking-ref-title font-mono">{bookingId}</h1>
            </div>

            <span
              className={`status-pill ${
                isCancelled ? 'status-cancelled' : 'status-scheduled'
              }`}
            >
              {booking.bookingStatus || 'Confirmed'}
            </span>
          </div>

          {/* Passenger Information */}
          <div className="passenger-info-box">
            <h3 className="section-subheading">Passenger Details</h3>
            <div className="passenger-fields-row">
              <div className="passenger-field">
                <User size={16} className="field-icon" />
                <div>
                  <span className="field-label">Passenger Name</span>
                  <strong className="field-val">{booking.user?.name || 'N/A'}</strong>
                </div>
              </div>

              <div className="passenger-field">
                <Mail size={16} className="field-icon" />
                <div>
                  <span className="field-label">Email Address</span>
                  <strong className="field-val">{booking.user?.email || 'N/A'}</strong>
                </div>
              </div>

              <div className="passenger-field">
                <Users size={16} className="field-icon" />
                <div>
                  <span className="field-label">Reserved Seats</span>
                  <strong className="field-val">{booking.numberOfSeats} Seat(s)</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Flight Itinerary */}
          <div className="details-journey-box">
            <h3 className="section-subheading">
              Flight Itinerary &bull; {flight.airline || 'SkyLink'} ({flight.flightNumber || 'N/A'})
            </h3>

            <div className="journey-grid">
              <div className="journey-point departure">
                <div className="point-badge">Departure</div>
                <div className="point-city-large">{flight.departureCity || 'Origin'}</div>
                <div className="point-time-large">
                  {flight.departureTime ? formatTime(flight.departureTime) : '--:--'}
                </div>
                <div className="point-date-row">
                  <Calendar size={15} />
                  <span>{flight.departureTime ? formatDate(flight.departureTime) : 'N/A'}</span>
                </div>
              </div>

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
                <span className="journey-airline-note">{flight.airline || 'SkyLink Airlines'}</span>
              </div>

              <div className="journey-point arrival">
                <div className="point-badge">Arrival</div>
                <div className="point-city-large">{flight.arrivalCity || 'Destination'}</div>
                <div className="point-time-large">
                  {flight.arrivalTime ? formatTime(flight.arrivalTime) : '--:--'}
                </div>
                <div className="point-date-row">
                  <Calendar size={15} />
                  <span>{flight.arrivalTime ? formatDate(flight.arrivalTime) : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sidebar Actions & Fare */}
        <aside className="booking-details-sidebar">
          <h3 className="sidebar-title">Payment &amp; Actions</h3>

          <div className="fare-breakdown-box">
            <div className="fare-row">
              <span>Booked Seats</span>
              <span>{booking.numberOfSeats}</span>
            </div>
            <div className="fare-divider" />
            <div className="fare-row total">
              <span>Total Price (ETB)</span>
              <span className="total-amount">{formatCurrency(booking.totalPrice)}</span>
            </div>
          </div>

          <div className="sidebar-actions-stack">
            {!isCancelled && (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-full"
                  onClick={handleQuickPay}
                  disabled={paymentLoading}
                >
                  {paymentLoading ? (
                    <>
                      <Loader2 size={16} className="btn-spinner" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={16} />
                      <span>Confirm / Pay Now</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn btn-destructive-outline btn-full"
                  onClick={() => setShowCancelModal(true)}
                  disabled={cancelLoading}
                >
                  <Ban size={16} />
                  <span>Cancel Booking</span>
                </button>
              </>
            )}

            {isCancelled && (
              <div className="cancellation-notice-box">
                <AlertCircle size={20} className="cancel-icon" />
                <div>
                  <strong>Booking Cancelled</strong>
                  <p>Your reserved seats have been returned to inventory.</p>
                </div>
              </div>
            )}

            <div className="trust-security-badge" style={{ marginTop: '16px' }}>
              <ShieldCheck size={16} className="trust-icon" />
              <span>SkyLink Ethiopia Verified Booking</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Cancel Modal */}
      <ConfirmModal
        isOpen={showCancelModal}
        title="Cancel Booking?"
        message="Are you sure you want to cancel this booking? This will release your seats back to the airline inventory."
        confirmText="Confirm Cancellation"
        cancelText="Keep Booking"
        onConfirm={handleCancelBooking}
        onCancel={() => setShowCancelModal(false)}
        loading={cancelLoading}
        isDestructive={true}
      />
    </div>
  );
}

export default BookingDetailsPage;
