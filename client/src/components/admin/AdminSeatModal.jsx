import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { flightService } from '../../services/flightService';
import { formatCurrency } from '../../utils/formatCurrency';
import { SeatMap } from '../flights/SeatMap';
import {
  X,
  Plane,
  Wand2,
  SlidersHorizontal,
  Eye,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
  Lock,
  RefreshCw,
  Crown,
  Users,
} from 'lucide-react';

function AdminSeatModalInner({
  flight,
  onClose,
  onSuccess,
}) {
  const modalRef = useRef(null);
  const flightId = flight?._id || flight?.id;

  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'generate' | 'custom'
  const [loadingSeats, setLoadingSeats] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Seat map data from backend
  const [seatData, setSeatData] = useState({
    seats: [],
    totalSeats: 0,
    availableSeats: 0,
  });

  // Generator form state
  const basePrice = Number(flight?.price) || 2500;
  const [genBusinessRows, setGenBusinessRows] = useState(2);
  const [genEconomyRows, setGenEconomyRows] = useState(8);

  // Six position-specific prices (Business & Economy)
  const [genBusinessWindowPrice, setGenBusinessWindowPrice] = useState(
    Math.round(basePrice * 1.8)
  );
  const [genBusinessMiddlePrice, setGenBusinessMiddlePrice] = useState(
    Math.round(basePrice * 1.4)
  );
  const [genBusinessAislePrice, setGenBusinessAislePrice] = useState(
    Math.round(basePrice * 1.6)
  );

  const [genEconomyWindowPrice, setGenEconomyWindowPrice] = useState(
    Math.round(basePrice * 1.15)
  );
  const [genEconomyMiddlePrice, setGenEconomyMiddlePrice] = useState(
    Math.round(basePrice * 0.95)
  );
  const [genEconomyAislePrice, setGenEconomyAislePrice] = useState(
    basePrice
  );

  // Custom editor state (clone of seats for editing)
  const [customSeats, setCustomSeats] = useState([]);
  const [newSeatNumber, setNewSeatNumber] = useState('');
  const [newSeatClass, setNewSeatClass] = useState('Economy');
  const [newSeatPosition, setNewSeatPosition] = useState('Window');
  const [newSeatPrice, setNewSeatPrice] = useState(flight?.price || 2500);

  // Fetch flight seats
  const loadSeats = useCallback(async () => {
    if (!flightId) return;
    setLoadingSeats(true);
    setError(null);
    try {
      const data = await flightService.getFlightSeats(flightId);
      setSeatData({
        seats: Array.isArray(data.seats) ? data.seats : [],
        totalSeats: data.totalSeats || (data.seats ? data.seats.length : 0),
        availableSeats: data.availableSeats !== undefined ? data.availableSeats : 0,
      });
      // Initialize custom seats list
      setCustomSeats(
        Array.isArray(data.seats)
          ? data.seats.map((s) => ({ ...s }))
          : []
      );
    } catch (err) {
      const msg =
        err.data?.message || err.message || 'Failed to load flight seats.';
      setError(msg);
    } finally {
      setLoadingSeats(false);
    }
  }, [flightId]);

  useEffect(() => {
    let isMounted = true;

    async function fetchInitialSeats() {
      if (!flightId) return;
      setLoadingSeats(true);
      setError(null);

      try {
        const data = await flightService.getFlightSeats(flightId);
        if (isMounted) {
          setSeatData({
            seats: Array.isArray(data.seats) ? data.seats : [],
            totalSeats: data.totalSeats || (data.seats ? data.seats.length : 0),
            availableSeats: data.availableSeats !== undefined ? data.availableSeats : 0,
          });
          setCustomSeats(
            Array.isArray(data.seats)
              ? data.seats.map((s) => ({ ...s }))
              : []
          );
        }
      } catch (err) {
        if (isMounted) {
          const msg =
            err.data?.message || err.message || 'Failed to load flight seats.';
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setLoadingSeats(false);
        }
      }
    }

    fetchInitialSeats();

    return () => {
      isMounted = false;
    };
  }, [flightId]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !actionLoading) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [actionLoading, onClose]);

  // Derived statistics
  const seatStats = useMemo(() => {
    const seats = seatData.seats || [];
    const businessCount = seats.filter((s) => s.seatClass === 'Business').length;
    const economyCount = seats.filter((s) => s.seatClass === 'Economy').length;
    const bookedCount = seats.filter((s) => s.status === 'Booked').length;
    const availableCount = seats.filter((s) => s.status === 'Available').length;

    return {
      total: seats.length,
      businessCount,
      economyCount,
      bookedCount,
      availableCount,
    };
  }, [seatData.seats]);

  // Handle Auto-Generate Submit
  const handleGenerateSeats = async (e) => {
    e.preventDefault();
    if (!flightId) return;

    if (
      genBusinessWindowPrice === '' ||
      genBusinessMiddlePrice === '' ||
      genBusinessAislePrice === '' ||
      genEconomyWindowPrice === '' ||
      genEconomyMiddlePrice === '' ||
      genEconomyAislePrice === ''
    ) {
      setError('All six seat prices are required.');
      return;
    }

    const bWin = Number(genBusinessWindowPrice);
    const bMid = Number(genBusinessMiddlePrice);
    const bAisle = Number(genBusinessAislePrice);
    const eWin = Number(genEconomyWindowPrice);
    const eMid = Number(genEconomyMiddlePrice);
    const eAisle = Number(genEconomyAislePrice);

    if (
      isNaN(bWin) || isNaN(bMid) || isNaN(bAisle) ||
      isNaN(eWin) || isNaN(eMid) || isNaN(eAisle)
    ) {
      setError('All six seat prices must be valid numbers.');
      return;
    }

    if (
      bWin < 0 || bMid < 0 || bAisle < 0 ||
      eWin < 0 || eMid < 0 || eAisle < 0
    ) {
      setError('Seat prices must be non-negative (minimum 0 ETB).');
      return;
    }

    const bRows = Number(genBusinessRows);
    const eRows = Number(genEconomyRows);

    if (isNaN(bRows) || bRows < 0 || !Number.isInteger(bRows)) {
      setError('Business rows must be a non-negative integer.');
      return;
    }

    if (isNaN(eRows) || eRows < 1 || !Number.isInteger(eRows)) {
      setError('Economy rows must be an integer of at least 1.');
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await flightService.generateFlightSeats(flightId, {
        businessRows: bRows,
        economyRows: eRows,
        businessWindowPrice: bWin,
        businessMiddlePrice: bMid,
        businessAislePrice: bAisle,
        economyWindowPrice: eWin,
        economyMiddlePrice: eMid,
        economyAislePrice: eAisle,
      });

      const updatedFlight = res.flight || res;
      setSeatData({
        seats: updatedFlight.seats || [],
        totalSeats: updatedFlight.totalSeats || (updatedFlight.seats ? updatedFlight.seats.length : 0),
        availableSeats: updatedFlight.availableSeats || 0,
      });
      setCustomSeats(
        Array.isArray(updatedFlight.seats)
          ? updatedFlight.seats.map((s) => ({ ...s }))
          : []
      );

      setSuccessMsg(
        `Generated ${updatedFlight.seats?.length || 0} seats successfully (${bRows * 6} Business, ${eRows * 6} Economy).`
      );
      setActiveTab('preview');
      if (onSuccess) onSuccess(updatedFlight);
    } catch (err) {
      const msg =
        err.data?.message ||
        err.message ||
        'Failed to generate seat map. Ensure flight has no active confirmed bookings.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Add a seat to customSeats list
  const handleAddCustomSeat = (e) => {
    e.preventDefault();
    const formattedNum = newSeatNumber.trim().toUpperCase();
    if (!formattedNum) {
      setError('Please provide a valid seat number (e.g. 1A, 3F).');
      return;
    }

    if (customSeats.some((s) => s.seatNumber.toUpperCase() === formattedNum)) {
      setError(`Seat number ${formattedNum} already exists in configuration.`);
      return;
    }

    if (newSeatPrice < 0 || isNaN(newSeatPrice)) {
      setError('Seat price must be a non-negative number.');
      return;
    }

    const newSeat = {
      seatNumber: formattedNum,
      seatClass: newSeatClass,
      position: newSeatPosition,
      price: Number(newSeatPrice),
      status: 'Available',
    };

    setCustomSeats((prev) => [...prev, newSeat]);
    setNewSeatNumber('');
    setError(null);
  };

  // Remove a custom seat (only if not booked)
  const handleRemoveCustomSeat = (seatNumber) => {
    const seat = customSeats.find((s) => s.seatNumber === seatNumber);
    if (seat?.status === 'Booked') {
      setError(`Cannot remove booked seat ${seatNumber}.`);
      return;
    }
    setCustomSeats((prev) => prev.filter((s) => s.seatNumber !== seatNumber));
    setError(null);
  };

  // Update a single seat field in customSeats list
  const handleUpdateCustomSeat = (index, field, value) => {
    setCustomSeats((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: field === 'price' ? Number(value) : value,
      };
      return updated;
    });
  };

  // Save Custom Seat Configuration
  const handleSaveCustomSeats = async () => {
    if (!flightId) return;

    if (customSeats.length === 0) {
      setError('Seat configuration must contain at least one seat.');
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await flightService.configureFlightSeats(flightId, customSeats);
      const updatedFlight = res.flight || res;

      setSeatData({
        seats: updatedFlight.seats || [],
        totalSeats: updatedFlight.totalSeats || (updatedFlight.seats ? updatedFlight.seats.length : 0),
        availableSeats: updatedFlight.availableSeats || 0,
      });

      setSuccessMsg(`Saved custom seat map with ${customSeats.length} seats successfully.`);
      setActiveTab('preview');
      if (onSuccess) onSuccess(updatedFlight);
    } catch (err) {
      const msg =
        err.data?.message ||
        err.message ||
        'Failed to save custom seat configuration.';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  if (!flight) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-backdrop" onClick={!actionLoading ? onClose : undefined} />
      <div className="modal-card modal-card-xlarge admin-seat-modal" ref={modalRef}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-badge primary">
              <Plane size={22} />
            </div>
            <div>
              <div className="modal-title-with-badge">
                <h3 className="modal-title">Seat Inventory &bull; {flight.flightNumber}</h3>
                <span className="modal-flight-route">
                  ({flight.departureCity} &rarr; {flight.arrivalCity})
                </span>
              </div>
              <p className="modal-subtitle">
                Configure cabin classes, individual ETB prices, and airline-style seat layouts
              </p>
            </div>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={actionLoading}
            aria-label="Close seat modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="admin-modal-tabs">
          <button
            type="button"
            className={`admin-modal-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            <Eye size={16} />
            <span>Seat Map Preview ({seatStats.total})</span>
          </button>

          <button
            type="button"
            className={`admin-modal-tab-btn ${activeTab === 'generate' ? 'active' : ''}`}
            onClick={() => setActiveTab('generate')}
          >
            <Wand2 size={16} />
            <span>Auto-Generate Layout</span>
          </button>

          <button
            type="button"
            className={`admin-modal-tab-btn ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >
            <SlidersHorizontal size={16} />
            <span>Custom Seat Config</span>
          </button>

          <button
            type="button"
            className="admin-modal-refresh-btn"
            onClick={loadSeats}
            disabled={loadingSeats || actionLoading}
            title="Reload seat data from server"
          >
            <RefreshCw size={14} className={loadingSeats ? 'btn-spinner' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="auth-alert error" role="alert" style={{ margin: '16px 24px 0' }}>
            <AlertCircle size={18} className="alert-icon" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-alert success" role="status" style={{ margin: '16px 24px 0' }}>
            <CheckCircle2 size={18} className="alert-icon" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="admin-seat-modal-body">
          {/* TAB 1: PREVIEW SEAT MAP */}
          {activeTab === 'preview' && (
            <div className="admin-seat-preview-tab">
              {/* Summary Stats Row */}
              <div className="admin-seat-metrics-row">
                <div className="metric-pill">
                  <span className="metric-num font-mono">{seatStats.total}</span>
                  <span className="metric-lbl">Total Seats</span>
                </div>
                <div className="metric-pill business">
                  <Crown size={14} className="metric-icon" />
                  <span className="metric-num font-mono">{seatStats.businessCount}</span>
                  <span className="metric-lbl">Business Class</span>
                </div>
                <div className="metric-pill economy">
                  <Users size={14} className="metric-icon" />
                  <span className="metric-num font-mono">{seatStats.economyCount}</span>
                  <span className="metric-lbl">Economy Class</span>
                </div>
                <div className="metric-pill available">
                  <span className="metric-num font-mono">{seatStats.availableCount}</span>
                  <span className="metric-lbl">Available</span>
                </div>
                <div className="metric-pill booked">
                  <Lock size={13} className="metric-icon" />
                  <span className="metric-num font-mono">{seatStats.bookedCount}</span>
                  <span className="metric-lbl">Booked</span>
                </div>
              </div>

              {loadingSeats ? (
                <div className="admin-seat-loading-state">
                  <div className="auth-spinner" />
                  <p>Loading flight seat map from server...</p>
                </div>
              ) : seatData.seats.length === 0 ? (
                <div className="admin-no-seats-card">
                  <Plane size={40} className="empty-plane-icon" />
                  <h4>No Seat Map Configured</h4>
                  <p>
                    This flight currently uses legacy open capacity ({flight.availableSeats}/{flight.totalSeats} seats).
                    You can generate a standard Boeing/Airbus-style seat map with Business and Economy cabins or configure custom seats.
                  </p>
                  <div className="empty-actions-row">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setActiveTab('generate')}
                    >
                      <Wand2 size={16} />
                      <span>Auto-Generate Standard Seat Map</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setActiveTab('custom')}
                    >
                      <Plus size={16} />
                      <span>Configure Custom Seats</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="admin-seatmap-viewport">
                  <SeatMap
                    seats={seatData.seats}
                    selectable={false}
                    readOnly={true}
                    showPrices={true}
                    showLegend={true}
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AUTO-GENERATE SEAT MAP */}
          {activeTab === 'generate' && (
            <div className="admin-seat-generate-tab">
              <div className="generator-intro-card">
                <Wand2 size={24} className="intro-icon" />
                <div>
                  <h4>Standard Aircraft Layout Generator</h4>
                  <p>
                    Quickly generate a 6-abreast layout (A-B-C | D-E-F) with automatic Window, Middle, and Aisle assignments.
                    {seatStats.bookedCount > 0 && (
                      <span className="warning-text-inline">
                        {' '}Notice: Cannot regenerate seat maps for flights with active confirmed bookings.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <form onSubmit={handleGenerateSeats} className="admin-generator-form">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label htmlFor="genBusinessRows" className="form-label">
                      Business Class Rows (Rows 1 to N)
                    </label>
                    <input
                      id="genBusinessRows"
                      type="number"
                      min="0"
                      max="15"
                      className="form-input"
                      value={genBusinessRows}
                      onChange={(e) => setGenBusinessRows(e.target.value === '' ? '' : Number(e.target.value))}
                      required
                      disabled={actionLoading}
                    />
                    <span className="form-hint-xs">
                      Produces {Number(genBusinessRows || 0) * 6} Business Class seats
                    </span>
                  </div>

                  <div className="form-group">
                    <label htmlFor="genEconomyRows" className="form-label">
                      Economy Class Rows (Rows {Number(genBusinessRows || 0) + 1} to {Number(genBusinessRows || 0) + Number(genEconomyRows || 0)})
                    </label>
                    <input
                      id="genEconomyRows"
                      type="number"
                      min="1"
                      max="60"
                      className="form-input"
                      value={genEconomyRows}
                      onChange={(e) => setGenEconomyRows(e.target.value === '' ? '' : Number(e.target.value))}
                      required
                      disabled={actionLoading}
                    />
                    <span className="form-hint-xs">
                      Produces {Number(genEconomyRows || 0) * 6} Economy Class seats
                    </span>
                  </div>
                </div>

                {/* BUSINESS CLASS PRICING */}
                <div style={{ marginTop: '8px', marginBottom: '16px' }}>
                  <h5 className="sub-form-heading" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <Crown size={15} style={{ color: '#D97706' }} />
                    <span>Business Class Pricing</span>
                  </h5>
                  <div className="form-grid-3">
                    <div className="form-group">
                      <label htmlFor="genBusinessWindowPrice" className="form-label">
                        Business Window Price (ETB)
                      </label>
                      <input
                        id="genBusinessWindowPrice"
                        type="number"
                        min="0"
                        step="50"
                        className="form-input font-mono"
                        value={genBusinessWindowPrice}
                        onChange={(e) => setGenBusinessWindowPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        required
                        disabled={actionLoading}
                      />
                      <span className="form-hint-xs">
                        Formatted as {formatCurrency(genBusinessWindowPrice)}
                      </span>
                    </div>

                    <div className="form-group">
                      <label htmlFor="genBusinessMiddlePrice" className="form-label">
                        Business Middle Price (ETB)
                      </label>
                      <input
                        id="genBusinessMiddlePrice"
                        type="number"
                        min="0"
                        step="50"
                        className="form-input font-mono"
                        value={genBusinessMiddlePrice}
                        onChange={(e) => setGenBusinessMiddlePrice(e.target.value === '' ? '' : Number(e.target.value))}
                        required
                        disabled={actionLoading}
                      />
                      <span className="form-hint-xs">
                        Formatted as {formatCurrency(genBusinessMiddlePrice)}
                      </span>
                    </div>

                    <div className="form-group">
                      <label htmlFor="genBusinessAislePrice" className="form-label">
                        Business Aisle Price (ETB)
                      </label>
                      <input
                        id="genBusinessAislePrice"
                        type="number"
                        min="0"
                        step="50"
                        className="form-input font-mono"
                        value={genBusinessAislePrice}
                        onChange={(e) => setGenBusinessAislePrice(e.target.value === '' ? '' : Number(e.target.value))}
                        required
                        disabled={actionLoading}
                      />
                      <span className="form-hint-xs">
                        Formatted as {formatCurrency(genBusinessAislePrice)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ECONOMY CLASS PRICING */}
                <div style={{ marginBottom: '16px' }}>
                  <h5 className="sub-form-heading" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <Users size={15} style={{ color: '#2563EB' }} />
                    <span>Economy Class Pricing</span>
                  </h5>
                  <div className="form-grid-3">
                    <div className="form-group">
                      <label htmlFor="genEconomyWindowPrice" className="form-label">
                        Economy Window Price (ETB)
                      </label>
                      <input
                        id="genEconomyWindowPrice"
                        type="number"
                        min="0"
                        step="50"
                        className="form-input font-mono"
                        value={genEconomyWindowPrice}
                        onChange={(e) => setGenEconomyWindowPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        required
                        disabled={actionLoading}
                      />
                      <span className="form-hint-xs">
                        Formatted as {formatCurrency(genEconomyWindowPrice)}
                      </span>
                    </div>

                    <div className="form-group">
                      <label htmlFor="genEconomyMiddlePrice" className="form-label">
                        Economy Middle Price (ETB)
                      </label>
                      <input
                        id="genEconomyMiddlePrice"
                        type="number"
                        min="0"
                        step="50"
                        className="form-input font-mono"
                        value={genEconomyMiddlePrice}
                        onChange={(e) => setGenEconomyMiddlePrice(e.target.value === '' ? '' : Number(e.target.value))}
                        required
                        disabled={actionLoading}
                      />
                      <span className="form-hint-xs">
                        Formatted as {formatCurrency(genEconomyMiddlePrice)}
                      </span>
                    </div>

                    <div className="form-group">
                      <label htmlFor="genEconomyAislePrice" className="form-label">
                        Economy Aisle Price (ETB)
                      </label>
                      <input
                        id="genEconomyAislePrice"
                        type="number"
                        min="0"
                        step="50"
                        className="form-input font-mono"
                        value={genEconomyAislePrice}
                        onChange={(e) => setGenEconomyAislePrice(e.target.value === '' ? '' : Number(e.target.value))}
                        required
                        disabled={actionLoading}
                      />
                      <span className="form-hint-xs">
                        Formatted as {formatCurrency(genEconomyAislePrice)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Generator Summary Calculation */}
                <div className="generator-summary-box">
                  <div className="summary-col">
                    <span className="sum-label">Total Aircraft Capacity</span>
                    <strong className="sum-val">
                      {(Number(genBusinessRows || 0) + Number(genEconomyRows || 0)) * 6} Seats
                    </strong>
                  </div>
                  <div className="summary-col">
                    <span className="sum-label">Cabin Breakdown</span>
                    <strong className="sum-val">
                      {Number(genBusinessRows || 0) * 6} Business &bull; {Number(genEconomyRows || 0) * 6} Economy
                    </strong>
                  </div>
                  <div className="summary-col">
                    <span className="sum-label">Aisle Configuration</span>
                    <strong className="sum-val">3 - 3 (A-B-C | D-E-F)</strong>
                  </div>
                </div>

                <div className="admin-form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={actionLoading || seatStats.bookedCount > 0}
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 size={16} className="btn-spinner" />
                        <span>Generating Seats...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 size={16} />
                        <span>Generate &amp; Apply Seat Map</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: CUSTOM SEAT CONFIGURATION */}
          {activeTab === 'custom' && (
            <div className="admin-seat-custom-tab">
              {/* Add New Seat Sub-Form */}
              <form onSubmit={handleAddCustomSeat} className="custom-add-seat-form">
                <h5 className="sub-form-heading">Add Individual Seat</h5>
                <div className="custom-add-inputs-row">
                  <div className="input-field">
                    <label className="field-label-xs">Seat Number</label>
                    <input
                      type="text"
                      className="form-input form-input-sm font-mono"
                      placeholder="e.g. 1A"
                      value={newSeatNumber}
                      onChange={(e) => setNewSeatNumber(e.target.value)}
                      required
                      disabled={actionLoading}
                    />
                  </div>

                  <div className="input-field">
                    <label className="field-label-xs">Class</label>
                    <select
                      className="form-select form-select-sm"
                      value={newSeatClass}
                      onChange={(e) => setNewSeatClass(e.target.value)}
                      disabled={actionLoading}
                    >
                      <option value="Economy">Economy</option>
                      <option value="Business">Business</option>
                    </select>
                  </div>

                  <div className="input-field">
                    <label className="field-label-xs">Position</label>
                    <select
                      className="form-select form-select-sm"
                      value={newSeatPosition}
                      onChange={(e) => setNewSeatPosition(e.target.value)}
                      disabled={actionLoading}
                    >
                      <option value="Window">Window</option>
                      <option value="Middle">Middle</option>
                      <option value="Aisle">Aisle</option>
                    </select>
                  </div>

                  <div className="input-field">
                    <label className="field-label-xs">Price (ETB)</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input form-input-sm font-mono"
                      value={newSeatPrice}
                      onChange={(e) => setNewSeatPrice(Number(e.target.value))}
                      required
                      disabled={actionLoading}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-secondary btn-sm add-seat-btn"
                    disabled={actionLoading}
                  >
                    <Plus size={14} />
                    <span>Add Seat</span>
                  </button>
                </div>
              </form>

              {/* Seats Table Editor */}
              <div className="custom-seats-table-wrapper">
                <div className="custom-table-header-row">
                  <span>Seats Configured: <strong>{customSeats.length}</strong></span>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveCustomSeats}
                    disabled={actionLoading || customSeats.length === 0}
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 size={14} className="btn-spinner" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save All Changes</span>
                    )}
                  </button>
                </div>

                <div className="custom-seats-scroll-table">
                  <table className="admin-data-table custom-seats-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Seat Number</th>
                        <th>Class</th>
                        <th>Position</th>
                        <th>Price (ETB)</th>
                        <th>Status</th>
                        <th className="text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customSeats.map((seat, index) => {
                        const isBooked = seat.status === 'Booked';

                        return (
                          <tr key={seat.seatNumber || index}>
                            <td className="font-mono text-muted-xs">{index + 1}</td>
                            <td>
                              <span className="font-mono font-bold">{seat.seatNumber}</span>
                            </td>
                            <td>
                              <select
                                className="form-select form-select-xs"
                                value={seat.seatClass}
                                onChange={(e) =>
                                  handleUpdateCustomSeat(index, 'seatClass', e.target.value)
                                }
                                disabled={actionLoading}
                              >
                                <option value="Economy">Economy</option>
                                <option value="Business">Business</option>
                              </select>
                            </td>
                            <td>
                              <select
                                className="form-select form-select-xs"
                                value={seat.position}
                                onChange={(e) =>
                                  handleUpdateCustomSeat(index, 'position', e.target.value)
                                }
                                disabled={actionLoading}
                              >
                                <option value="Window">Window</option>
                                <option value="Middle">Middle</option>
                                <option value="Aisle">Aisle</option>
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                min="0"
                                className="form-input form-input-xs font-mono"
                                value={seat.price}
                                onChange={(e) =>
                                  handleUpdateCustomSeat(index, 'price', e.target.value)
                                }
                                disabled={actionLoading}
                              />
                            </td>
                            <td>
                              <span
                                className={`status-pill ${
                                  isBooked ? 'status-cancelled' : 'status-scheduled'
                                }`}
                              >
                                {seat.status || 'Available'}
                              </span>
                            </td>
                            <td className="text-right">
                              {isBooked ? (
                                <span className="locked-badge" title="Booked seats cannot be deleted">
                                  <Lock size={12} />
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  className="btn-icon-action delete"
                                  onClick={() => handleRemoveCustomSeat(seat.seatNumber)}
                                  disabled={actionLoading}
                                  title="Delete seat"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={actionLoading}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminSeatModal({
  isOpen,
  flight = null,
  onClose,
  onSuccess,
}) {
  if (!isOpen || !flight) return null;

  const key = flight._id || flight.id || 'flight-seat-modal';

  return (
    <AdminSeatModalInner
      key={key}
      flight={flight}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

export default AdminSeatModal;


