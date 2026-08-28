import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { flightService } from '../services/flightService';
import { bookingService } from '../services/bookingService';
import { paymentService } from '../services/paymentService';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate, formatTime } from '../utils/formatDate';
import { useAuth } from '../hooks/useAuth';
import {
  Plane,
  Calendar,
  Users,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Mail,
  Receipt,
  Ticket,
  Clock,
} from 'lucide-react';

export function BookingCreatePage() {
  const { flightId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Flight loading state
  const [flight, setFlight] = useState(null);
  const [flightLoading, setFlightLoading] = useState(true);
  const [flightError, setFlightError] = useState(null);

  // Booking step state
  // Steps: 'CONFIG' | 'BOOKING_CREATED' | 'PAYMENT_PENDING' | 'PAYMENT_CONFIRMED'
  const [step, setStep] = useState('CONFIG');
  const [numberOfSeats, setNumberOfSeats] = useState(1);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Returned data from backend
  const [createdBooking, setCreatedBooking] = useState(null);
  const [createdPayment, setCreatedPayment] = useState(null);
  const [confirmedPaymentData, setConfirmedPaymentData] = useState(null);

  // Load flight details
  useEffect(() => {
    let isMounted = true;

    async function loadFlight() {
      if (!flightId) return;
      setFlightLoading(true);
      setFlightError(null);

      try {
        const data = await flightService.getFlightById(flightId);
        if (isMounted) {
          setFlight(data);
          if (data.availableSeats < 1 || data.status === 'Cancelled') {
            setFlightError('This flight has no available seats or has been cancelled.');
          }
        }
      } catch (err) {
        if (isMounted) {
          const msg =
            err.status === 404
              ? 'Flight not found.'
              : err.data?.message || err.message || 'Failed to load flight.';
          setFlightError(msg);
        }
      } finally {
        if (isMounted) {
          setFlightLoading(false);
        }
      }
    }

    loadFlight();

    return () => {
      isMounted = false;
    };
  }, [flightId]);

  // Step 1: Submit Booking Creation
  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!flight) return;

    if (numberOfSeats < 1) {
      setActionError('Please select at least 1 seat.');
      return;
    }
    if (numberOfSeats > flight.availableSeats) {
      setActionError(`Only ${flight.availableSeats} seats are available.`);
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      // Backend calculates totalPrice from flight.price * numberOfSeats
      const booking = await bookingService.createBooking({
        flightId: flight._id || flight.id,
        numberOfSeats: Number(numberOfSeats),
      });

      setCreatedBooking(booking);
      setStep('BOOKING_CREATED');
    } catch (err) {
      const msg =
        err.data?.message ||
        err.message ||
        'Failed to create booking. Please check seat availability.';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Step 2: Initialize Payment for Booking
  const handleProceedToPayment = async () => {
    if (!createdBooking) return;

    setActionLoading(true);
    setActionError(null);

    try {
      const payment = await paymentService.createPayment({
        bookingId: createdBooking._id || createdBooking.id,
      });

      setCreatedPayment(payment);
      setStep('PAYMENT_PENDING');
    } catch (err) {
      const msg =
        err.data?.message ||
        err.message ||
        'Failed to initialize payment. Please try again.';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Step 3: Confirm Payment (Simulated in Backend, Triggers Resend Email)
  const handleConfirmPayment = async () => {
    if (!createdPayment) return;

    setActionLoading(true);
    setActionError(null);

    try {
      const paymentId = createdPayment._id || createdPayment.id;
      const response = await paymentService.confirmPayment(paymentId);
      setConfirmedPaymentData(response);
      setStep('PAYMENT_CONFIRMED');
    } catch (err) {
      const msg =
        err.data?.message ||
        err.message ||
        'Payment confirmation failed. Please try again.';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Loading Flight
  if (flightLoading) {
    return (
      <div className="booking-page-container">
        <div className="flights-loading-state" role="status">
          <div className="auth-spinner" />
          <p>Loading flight booking options...</p>
        </div>
      </div>
    );
  }

  // Flight Error State
  if (flightError || !flight) {
    return (
      <div className="booking-page-container">
        <div className="flights-error-state" role="alert">
          <AlertCircle size={40} className="error-state-icon" />
          <h2>Booking Unavailable</h2>
          <p>{flightError || 'Unable to load flight for booking.'}</p>
          <button
            type="button"
            className="btn-retry"
            onClick={() => navigate('/flights')}
          >
            <ArrowLeft size={16} />
            <span>Return to Flight Search</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page-container">
      {/* Progress Steps Header */}
      <div className="booking-progress-bar">
        <div className={`step-item ${step === 'CONFIG' ? 'active' : 'completed'}`}>
          <div className="step-number">1</div>
          <span className="step-label">Configure Seats</span>
        </div>
        <div className="step-connector" />
        <div
          className={`step-item ${
            step === 'BOOKING_CREATED' || step === 'PAYMENT_PENDING'
              ? 'active'
              : step === 'PAYMENT_CONFIRMED'
              ? 'completed'
              : ''
          }`}
        >
          <div className="step-number">2</div>
          <span className="step-label">Booking Summary</span>
        </div>
        <div className="step-connector" />
        <div className={`step-item ${step === 'PAYMENT_CONFIRMED' ? 'active' : ''}`}>
          <div className="step-number">3</div>
          <span className="step-label">Payment &amp; E-Ticket</span>
        </div>
      </div>

      {actionError && (
        <div className="auth-alert error" role="alert" style={{ marginBottom: '24px' }}>
          <AlertCircle size={18} className="alert-icon" />
          <span>{actionError}</span>
        </div>
      )}

      {/* =========================================================================
          STAGE 1: CONFIGURE SEATS & PASSENGERS
          ========================================================================= */}
      {step === 'CONFIG' && (
        <div className="booking-layout-grid">
          {/* Main Booking Form */}
          <div className="booking-form-card">
            <div className="booking-card-header">
              <div className="header-badge">
                <Ticket size={18} />
                <span>Reserve Flight</span>
              </div>
              <h1 className="booking-page-title">Passenger &amp; Seat Selection</h1>
              <p className="booking-page-subtitle">
                Booking for <strong>{user?.name}</strong> ({user?.email})
              </p>
            </div>

            <form onSubmit={handleCreateBooking} className="seat-selection-form">
              {/* Flight Summary Box */}
              <div className="flight-brief-card">
                <div className="brief-header">
                  <div className="brief-airline">
                    <Plane size={18} className="brief-icon" />
                    <span>{flight.airline}</span>
                  </div>
                  <span className="brief-flight-no">{flight.flightNumber}</span>
                </div>

                <div className="brief-route">
                  <div>
                    <span className="brief-city">{flight.departureCity}</span>
                    <span className="brief-time">{formatTime(flight.departureTime)}</span>
                  </div>
                  <div className="brief-arrow">&rarr;</div>
                  <div>
                    <span className="brief-city">{flight.arrivalCity}</span>
                    <span className="brief-time">{formatTime(flight.arrivalTime)}</span>
                  </div>
                </div>

                <div className="brief-meta">
                  <span className="brief-date">
                    <Calendar size={14} />
                    {formatDate(flight.departureTime)}
                  </span>
                  <span className="brief-seats-left">
                    <Users size={14} />
                    {flight.availableSeats} seats remaining
                  </span>
                </div>
              </div>

              {/* Number of Seats Selection */}
              <div className="form-group" style={{ marginTop: '20px' }}>
                <label htmlFor="seatsSelect" className="form-label">
                  Number of Passengers / Seats
                </label>
                <div className="seats-input-row">
                  <select
                    id="seatsSelect"
                    className="seats-select-dropdown"
                    value={numberOfSeats}
                    onChange={(e) => setNumberOfSeats(Number(e.target.value))}
                    disabled={actionLoading}
                  >
                    {Array.from(
                      { length: Math.min(flight.availableSeats, 10) },
                      (_, i) => i + 1
                    ).map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'Seat (1 Passenger)' : `Seats (${n} Passengers)`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price Calculation Notice */}
              <div className="estimated-fare-box">
                <div className="fare-row">
                  <span>Price per seat</span>
                  <span>{formatCurrency(flight.price)}</span>
                </div>
                <div className="fare-row">
                  <span>Number of seats</span>
                  <span>&times; {numberOfSeats}</span>
                </div>
                <div className="fare-divider" />
                <div className="fare-row total">
                  <span>Estimated Total (ETB)</span>
                  <span className="total-amount">
                    {formatCurrency(flight.price * numberOfSeats)}
                  </span>
                </div>
              </div>

              <div className="booking-form-actions">
                <Link to={`/flights/${flightId}`} className="btn btn-secondary">
                  <ArrowLeft size={16} />
                  <span>Cancel</span>
                </Link>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading || flight.availableSeats < 1}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 size={16} className="btn-spinner" />
                      <span>Creating Booking...</span>
                    </>
                  ) : (
                    <span>Create Booking</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Guarantee Sidebar */}
          <aside className="booking-sidebar-card">
            <h3 className="sidebar-heading">Booking Inclusions</h3>
            <ul className="inclusions-list">
              <li>
                <CheckCircle2 size={16} className="check-icon" />
                <span>Instant digital confirmation</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="check-icon" />
                <span>Official Ethiopian Birr (ETB) pricing</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="check-icon" />
                <span>Automated Resend confirmation email</span>
              </li>
              <li>
                <CheckCircle2 size={16} className="check-icon" />
                <span>Self-service cancellation options</span>
              </li>
            </ul>
            <div className="trust-security-badge" style={{ marginTop: '24px' }}>
              <ShieldCheck size={16} className="trust-icon" />
              <span>Secure Booking by SkyLink Ethiopia</span>
            </div>
          </aside>
        </div>
      )}

      {/* =========================================================================
          STAGE 2: BOOKING CREATED SUMMARY
          ========================================================================= */}
      {step === 'BOOKING_CREATED' && createdBooking && (
        <div className="booking-confirmation-wrapper">
          <div className="confirmation-card">
            <div className="confirmation-badge success">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="confirmation-title">Booking Created Successfully!</h2>
            <p className="confirmation-subtitle">
              Your flight reservation has been placed. Please complete the payment to confirm your seats.
            </p>

            <div className="confirmation-details-table">
              <div className="detail-item">
                <span className="detail-label">Booking Reference</span>
                <span className="detail-value font-mono">
                  {createdBooking._id || createdBooking.id}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Flight</span>
                <span className="detail-value">
                  {flight.airline} ({flight.flightNumber})
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Route</span>
                <span className="detail-value">
                  {flight.departureCity} &rarr; {flight.arrivalCity}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Departure</span>
                <span className="detail-value">
                  {formatDate(flight.departureTime)} at {formatTime(flight.departureTime)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Number of Seats</span>
                <span className="detail-value">{createdBooking.numberOfSeats}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Total Price</span>
                <span className="detail-value price-highlight">
                  {formatCurrency(createdBooking.totalPrice)}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Booking Status</span>
                <span className="status-pill active">
                  {createdBooking.bookingStatus || 'Confirmed'}
                </span>
              </div>
            </div>

            <div className="confirmation-actions-group">
              <button
                type="button"
                className="btn btn-primary btn-proceed-pay"
                onClick={handleProceedToPayment}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <Loader2 size={18} className="btn-spinner" />
                    <span>Preparing Payment...</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={18} />
                    <span>Proceed to Payment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STAGE 3: PAYMENT PENDING & CONFIRMATION
          ========================================================================= */}
      {step === 'PAYMENT_PENDING' && createdPayment && (
        <div className="booking-confirmation-wrapper">
          <div className="confirmation-card payment-card">
            <div className="confirmation-badge payment">
              <CreditCard size={32} />
            </div>
            <h2 className="confirmation-title">Complete Your Payment</h2>
            <p className="confirmation-subtitle">
              Verify your booking payment details and confirm below.
            </p>

            <div className="payment-simulation-notice">
              <ShieldCheck size={18} />
              <span>
                Backend Payment Integration — Price strictly in Ethiopian Birr (ETB).
              </span>
            </div>

            <div className="confirmation-details-table">
              <div className="detail-item">
                <span className="detail-label">Payment ID</span>
                <span className="detail-value font-mono">
                  {createdPayment._id || createdPayment.id}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Booking ID</span>
                <span className="detail-value font-mono">
                  {createdPayment.booking}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Payment Status</span>
                <span className="status-pill idle">
                  {createdPayment.paymentStatus || 'Pending'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Amount Due</span>
                <span className="detail-value price-highlight">
                  {formatCurrency(createdPayment.amount)}
                </span>
              </div>
            </div>

            <div className="confirmation-actions-group">
              <button
                type="button"
                className="btn btn-primary btn-confirm-pay"
                onClick={handleConfirmPayment}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <Loader2 size={18} className="btn-spinner" />
                    <span>Confirming Payment with Server...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Confirm Payment ({formatCurrency(createdPayment.amount)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          STAGE 4: PAYMENT CONFIRMED & SUCCESS RECEIPT
          ========================================================================= */}
      {step === 'PAYMENT_CONFIRMED' && (
        <div className="booking-confirmation-wrapper">
          <div className="confirmation-card success-card">
            <div className="confirmation-badge success">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="confirmation-title">Payment Confirmed!</h2>
            <p className="confirmation-subtitle">
              Your flight reservation is fully confirmed and your e-ticket has been issued.
            </p>

            <div className="email-sent-banner">
              <Mail size={20} className="mail-icon" />
              <div>
                <strong>Confirmation Email Sent via Resend</strong>
                <p>
                  A confirmation receipt and booking summary have been dispatched to{' '}
                  <strong>{user?.email}</strong>.
                </p>
              </div>
            </div>

            <div className="confirmation-details-table">
              <div className="detail-item">
                <span className="detail-label">Payment Status</span>
                <span className="status-pill active">Paid</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Payment Date</span>
                <span className="detail-value">
                  {confirmedPaymentData?.payment?.paymentDate
                    ? new Date(confirmedPaymentData.payment.paymentDate).toLocaleString()
                    : new Date().toLocaleString()}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Amount Paid</span>
                <span className="detail-value price-highlight">
                  {formatCurrency(
                    confirmedPaymentData?.payment?.amount || createdBooking?.totalPrice
                  )}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Booking Reference</span>
                <span className="detail-value font-mono">
                  {createdBooking?._id || createdBooking?.id}
                </span>
              </div>
            </div>

            <div className="confirmation-actions-group final-actions">
              <Link to="/bookings" className="btn btn-primary">
                <Receipt size={18} />
                <span>View My Bookings</span>
              </Link>
              <Link
                to={`/bookings/${createdBooking?._id || createdBooking?.id}`}
                className="btn btn-secondary"
              >
                <Clock size={18} />
                <span>Booking Details</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingCreatePage;
