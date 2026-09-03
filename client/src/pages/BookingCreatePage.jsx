import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { flightService } from '../services/flightService';
import { bookingService } from '../services/bookingService';
import { paymentService } from '../services/paymentService';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate, formatTime } from '../utils/formatDate';
import { useAuth } from '../hooks/useAuth';
import { SeatMap } from '../components/flights/SeatMap';
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
  Armchair,
  X,
  Sparkles,
  Crown,
  RefreshCw,
} from 'lucide-react';

export function BookingCreatePage() {
  const { flightId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Flight & Seat Loading State
  const [flight, setFlight] = useState(null);
  const [flightSeats, setFlightSeats] = useState([]);
  const [flightLoading, setFlightLoading] = useState(true);
  const [flightError, setFlightError] = useState(null);

  // Booking step state
  // Steps: 'CONFIG' | 'BOOKING_CREATED' | 'PAYMENT_PENDING' | 'PAYMENT_CONFIRMED'
  const [step, setStep] = useState('CONFIG');

  // Seat Selection state (for flights with configured seats)
  const [selectedSeats, setSelectedSeats] = useState([]);

  // Legacy quantity state (for flights without configured seat map)
  const [numberOfSeats, setNumberOfSeats] = useState(1);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [seatRefreshNotice, setSeatRefreshNotice] = useState(null);

  // Returned data from backend
  const [createdBooking, setCreatedBooking] = useState(null);
  const [createdPayment, setCreatedPayment] = useState(null);
  const [confirmedPaymentData, setConfirmedPaymentData] = useState(null);

  // Load flight & seat map details
  const loadFlightAndSeats = useCallback(async () => {
    if (!flightId) return;
    setFlightLoading(true);
    setFlightError(null);

    try {
      const [flightData, seatData] = await Promise.all([
        flightService.getFlightById(flightId),
        flightService.getFlightSeats(flightId).catch(() => ({ seats: [] })),
      ]);

      setFlight(flightData);
      const seatsArr = Array.isArray(seatData?.seats) ? seatData.seats : [];
      setFlightSeats(seatsArr);

      if (flightData.availableSeats < 1 || flightData.status === 'Cancelled') {
        setFlightError('This flight has no available seats or has been cancelled.');
      }
    } catch (err) {
      const msg =
        err.status === 404
          ? 'Flight not found.'
          : err.data?.message || err.message || 'Failed to load flight.';
      setFlightError(msg);
    } finally {
      setFlightLoading(false);
    }
  }, [flightId]);

  useEffect(() => {
    let isMounted = true;

    async function initialLoad() {
      if (!flightId) return;
      setFlightLoading(true);
      setFlightError(null);

      try {
        const [flightData, seatData] = await Promise.all([
          flightService.getFlightById(flightId),
          flightService.getFlightSeats(flightId).catch(() => ({ seats: [] })),
        ]);

        if (isMounted) {
          setFlight(flightData);
          const seatsArr = Array.isArray(seatData?.seats) ? seatData.seats : [];
          setFlightSeats(seatsArr);

          if (flightData.availableSeats < 1 || flightData.status === 'Cancelled') {
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

    initialLoad();

    return () => {
      isMounted = false;
    };
  }, [flightId]);

  const hasConfiguredSeats = flightSeats.length > 0;

  // Seat dictionary for quick detail lookup
  const seatLookup = useMemo(() => {
    const map = new Map();
    flightSeats.forEach((s) => {
      map.set(s.seatNumber.toUpperCase(), s);
    });
    return map;
  }, [flightSeats]);

  // Selected seat details and estimated total calculation
  const { selectedSeatDetails, estimatedTotal } = useMemo(() => {
    if (hasConfiguredSeats) {
      const details = selectedSeats
        .map((num) => seatLookup.get(num.toUpperCase()))
        .filter(Boolean);

      const total = details.reduce((sum, s) => sum + (s.price || 0), 0);
      return { selectedSeatDetails: details, estimatedTotal: total };
    }

    // Legacy calculation
    const legacyTotal = (flight?.price || 0) * numberOfSeats;
    return { selectedSeatDetails: [], estimatedTotal: legacyTotal };
  }, [hasConfiguredSeats, selectedSeats, seatLookup, flight, numberOfSeats]);

  // Handle seat click in interactive seat map
  const handleSeatClick = (seat) => {
    if (seat.status === 'Booked') return;

    setActionError(null);
    setSeatRefreshNotice(null);

    const seatNum = seat.seatNumber.toUpperCase();
    setSelectedSeats((prev) => {
      if (prev.includes(seatNum)) {
        return prev.filter((s) => s !== seatNum);
      }
      return [...prev, seatNum];
    });
  };

  // Remove a seat from selection list
  const handleRemoveSeat = (seatNum) => {
    setSelectedSeats((prev) => prev.filter((s) => s !== seatNum));
  };

  // Step 1: Submit Booking Creation
  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!flight) return;

    setActionError(null);
    setSeatRefreshNotice(null);

    // Branch 1: Configured seats flow
    if (hasConfiguredSeats) {
      if (selectedSeats.length === 0) {
        setActionError('Please select at least 1 available seat from the aircraft seat map.');
        return;
      }

      setActionLoading(true);

      try {
        // Send flightId and selectedSeats ONLY (backend calculates and validates total price)
        const booking = await bookingService.createBooking({
          flightId: flight._id || flight.id || flightId,
          selectedSeats: selectedSeats,
        });

        setCreatedBooking(booking);
        setStep('BOOKING_CREATED');
      } catch (err) {
        const errorMsg =
          err.data?.message ||
          err.message ||
          'Failed to create booking. One or more seats may no longer be available.';

        setActionError(errorMsg);

        // Handle seat booking race condition: Reload seats and filter out unavailable ones
        try {
          const refreshedSeatsData = await flightService.getFlightSeats(flightId);
          const freshSeats = Array.isArray(refreshedSeatsData?.seats)
            ? refreshedSeatsData.seats
            : [];
          setFlightSeats(freshSeats);

          const freshAvailableSet = new Set(
            freshSeats
              .filter((s) => s.status === 'Available')
              .map((s) => s.seatNumber.toUpperCase())
          );

          // Keep only seats that are still available
          setSelectedSeats((prev) => {
            const stillValid = prev.filter((s) => freshAvailableSet.has(s.toUpperCase()));
            if (stillValid.length !== prev.length) {
              setSeatRefreshNotice(
                'The seat map was refreshed. Any seats taken by other passengers have been removed from your selection.'
              );
            }
            return stillValid;
          });
        } catch (refreshErr) {
          console.error('Error refreshing seats after collision:', refreshErr);
        }
      } finally {
        setActionLoading(false);
      }
      return;
    }

    // Branch 2: Legacy quantity booking flow
    if (numberOfSeats < 1) {
      setActionError('Please select at least 1 seat.');
      return;
    }
    if (numberOfSeats > flight.availableSeats) {
      setActionError(`Only ${flight.availableSeats} seats are available.`);
      return;
    }

    setActionLoading(true);

    try {
      const booking = await bookingService.createBooking({
        flightId: flight._id || flight.id || flightId,
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
          <p>Loading flight booking options and cabin seating...</p>
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
          <span className="step-label">
            {hasConfiguredSeats ? 'Select Seats' : 'Configure Seats'}
          </span>
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

      {seatRefreshNotice && (
        <div className="auth-alert success" role="status" style={{ marginBottom: '24px' }}>
          <RefreshCw size={18} className="alert-icon" />
          <span>{seatRefreshNotice}</span>
        </div>
      )}

      {/* =========================================================================
          STAGE 1: SEAT SELECTION / QUANTITY CONFIGURATION
          ========================================================================= */}
      {step === 'CONFIG' && (
        <div className="booking-layout-grid seat-booking-layout">
          {/* Main Content Column */}
          <div className="booking-form-card seat-selection-main-card">
            {/* Card Header */}
            <div className="booking-card-header">
              <div className="header-badge">
                <Ticket size={18} />
                <span>Reserve Flight</span>
              </div>
              <h1 className="booking-page-title">
                {hasConfiguredSeats ? 'Select Your Cabin Seats' : 'Passenger & Seat Selection'}
              </h1>
              <p className="booking-page-subtitle">
                Booking for <strong>{user?.name}</strong> ({user?.email})
              </p>
            </div>

            {/* Flight Itinerary Brief Card */}
            <div className="flight-brief-card">
              <div className="brief-header">
                <div className="brief-airline">
                  <Plane size={18} className="brief-icon" />
                  <span>{flight.airline}</span>
                </div>
                <span className="brief-flight-no font-mono">{flight.flightNumber}</span>
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

            {/* BRANCH A: Interactive Seat Selection Map */}
            {hasConfiguredSeats ? (
              <div className="interactive-seat-selection-wrapper">
                <div className="seat-selection-instructions">
                  <div className="instruct-item">
                    <Armchair size={16} />
                    <span>Click on any available seat to add or remove it from your reservation.</span>
                  </div>
                  <button
                    type="button"
                    className="btn-link-refresh"
                    onClick={loadFlightAndSeats}
                    title="Refresh seat availability in real time"
                  >
                    <RefreshCw size={13} />
                    <span>Refresh Seats</span>
                  </button>
                </div>

                <div className="seat-map-booking-viewport">
                  <SeatMap
                    seats={flightSeats}
                    selectedSeats={selectedSeats}
                    onSeatClick={handleSeatClick}
                    selectable={true}
                    showPrices={true}
                    showLegend={true}
                  />
                </div>
              </div>
            ) : (
              /* BRANCH B: Legacy Booking Flow (No seat map configured) */
              <div className="legacy-seats-selection-wrapper">
                <div className="legacy-notice-box">
                  <Users size={18} className="notice-icon" />
                  <div>
                    <strong>Standard Open Seating</strong>
                    <p>
                      This flight operates with general open cabin seating. Please specify the number of passenger seats required.
                    </p>
                  </div>
                </div>

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
              </div>
            )}
          </div>

          {/* Sidebar Summary Column */}
          <aside className="booking-sidebar-card selected-seats-sidebar">
            <h3 className="sidebar-heading">
              {hasConfiguredSeats ? 'Selected Seats Summary' : 'Fare Summary'}
            </h3>

            {hasConfiguredSeats ? (
              <div className="selected-seats-breakdown-box">
                {selectedSeatDetails.length === 0 ? (
                  <div className="no-seats-selected-hint">
                    <Armchair size={28} className="hint-icon" />
                    <p>No seats selected yet.</p>
                    <span>Click available seats on the aircraft layout to reserve them.</span>
                  </div>
                ) : (
                  <div className="selected-seats-list">
                    <div className="seats-list-header">
                      <span>Seat Details</span>
                      <span>Price (ETB)</span>
                    </div>

                    {selectedSeatDetails.map((seat) => (
                      <div key={seat.seatNumber} className="selected-seat-item-card">
                        <div className="seat-item-info">
                          <div className="seat-num-class-row">
                            <strong className="seat-tag-code font-mono">
                              {seat.seatNumber}
                            </strong>
                            <span
                              className={`seat-class-badge ${
                                seat.seatClass === 'Business' ? 'business' : 'economy'
                              }`}
                            >
                              {seat.seatClass === 'Business' ? (
                                <>
                                  <Crown size={10} />
                                  <span>Business</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles size={10} />
                                  <span>Economy</span>
                                </>
                              )}
                            </span>
                          </div>
                          <span className="seat-pos-text">
                            {seat.position} Seat
                          </span>
                        </div>

                        <div className="seat-item-price-action">
                          <span className="seat-price-val font-mono">
                            {formatCurrency(seat.price)}
                          </span>
                          <button
                            type="button"
                            className="seat-remove-btn"
                            onClick={() => handleRemoveSeat(seat.seatNumber)}
                            title={`Remove seat ${seat.seatNumber}`}
                            aria-label={`Remove seat ${seat.seatNumber}`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="fare-divider" />

                <div className="selected-seats-total-block">
                  <div className="fare-row">
                    <span>Selected Seat Count</span>
                    <strong>
                      {selectedSeats.length}{' '}
                      {selectedSeats.length === 1 ? 'Seat' : 'Seats'}
                    </strong>
                  </div>

                  <div className="fare-row total">
                    <span>Estimated Total</span>
                    <span className="total-amount price-highlight">
                      {formatCurrency(estimatedTotal)}
                    </span>
                  </div>
                  <span className="price-authoritative-note">
                    Official total confirmed by server upon booking.
                  </span>
                </div>
              </div>
            ) : (
              <div className="legacy-fare-breakdown-box">
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
                  <span>Estimated Total</span>
                  <span className="total-amount price-highlight">
                    {formatCurrency(estimatedTotal)}
                  </span>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="booking-form-actions-stack">
              <button
                type="button"
                className="btn btn-primary btn-full"
                onClick={handleCreateBooking}
                disabled={
                  actionLoading ||
                  flight.availableSeats < 1 ||
                  (hasConfiguredSeats && selectedSeats.length === 0)
                }
              >
                {actionLoading ? (
                  <>
                    <Loader2 size={16} className="btn-spinner" />
                    <span>Creating Booking...</span>
                  </>
                ) : (
                  <>
                    <Ticket size={16} />
                    <span>
                      {hasConfiguredSeats
                        ? `Create Booking (${selectedSeats.length} ${
                            selectedSeats.length === 1 ? 'Seat' : 'Seats'
                          })`
                        : `Create Booking (${numberOfSeats} ${
                            numberOfSeats === 1 ? 'Seat' : 'Seats'
                          })`}
                    </span>
                  </>
                )}
              </button>

              <Link to={`/flights/${flightId}`} className="btn btn-secondary btn-full">
                <ArrowLeft size={16} />
                <span>Cancel</span>
              </Link>
            </div>

            {/* Inclusions List */}
            <div className="sidebar-trust-section">
              <ul className="inclusions-list">
                <li>
                  <CheckCircle2 size={15} className="check-icon" />
                  <span>Transparent Ethiopian Birr (ETB) pricing</span>
                </li>
                <li>
                  <CheckCircle2 size={15} className="check-icon" />
                  <span>Real-time seat reservation locking</span>
                </li>
                <li>
                  <CheckCircle2 size={15} className="check-icon" />
                  <span>Instant Resend confirmation email</span>
                </li>
              </ul>
              <div className="trust-security-badge" style={{ marginTop: '16px' }}>
                <ShieldCheck size={16} className="trust-icon" />
                <span>SkyLink Ethiopia Verified Booking</span>
              </div>
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
              Your flight reservation has been placed. Please complete payment to issue your e-ticket.
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

              {/* Reserved Seats List */}
              {createdBooking.selectedSeats && createdBooking.selectedSeats.length > 0 ? (
                <div className="detail-item full-width-detail">
                  <span className="detail-label">Assigned Seats</span>
                  <div className="assigned-seats-badges-row">
                    {createdBooking.selectedSeats.map((seatNum) => (
                      <span key={seatNum} className="assigned-seat-pill font-mono">
                        <Armchair size={13} />
                        <strong>{seatNum}</strong>
                      </span>
                    ))}
                    <span className="seat-count-tag">
                      ({createdBooking.numberOfSeats} {createdBooking.numberOfSeats === 1 ? 'Seat' : 'Seats'})
                    </span>
                  </div>
                </div>
              ) : (
                <div className="detail-item">
                  <span className="detail-label">Reserved Seats</span>
                  <span className="detail-value">
                    {createdBooking.numberOfSeats} {createdBooking.numberOfSeats === 1 ? 'Seat' : 'Seats'} (Open Seating)
                  </span>
                </div>
              )}

              {/* Server-Confirmed Total Price */}
              <div className="detail-item">
                <span className="detail-label">Authoritative Total Price</span>
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
                    <span>Proceed to Payment ({formatCurrency(createdBooking.totalPrice)})</span>
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
              {createdBooking?.selectedSeats && createdBooking.selectedSeats.length > 0 && (
                <div className="detail-item full-width-detail">
                  <span className="detail-label">Confirmed Seats</span>
                  <div className="assigned-seats-badges-row">
                    {createdBooking.selectedSeats.map((seatNum) => (
                      <span key={seatNum} className="assigned-seat-pill font-mono">
                        <Armchair size={13} />
                        <strong>{seatNum}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
