import { useState, useEffect, useRef } from 'react';
import { X, Plane, AlertCircle, Loader2 } from 'lucide-react';

const ETHIOPIAN_CITIES = [
  'Addis Ababa (ADD)',
  'Bahir Dar (BJR)',
  'Gondar (GDQ)',
  'Lalibela (LLI)',
  'Dire Dawa (DIR)',
  'Hawassa (AWA)',
  'Mekele (MQX)',
  'Jimma (JIM)',
  'Arba Minch (AMH)',
  'Axum (AXU)',
  'Nairobi (NBO)',
  'Dubai (DXB)',
];

const AIRLINES = [
  'Ethiopian Airlines',
  'SkyLink Ethiopia',
  'National Airways',
  'Abyssinian Flight Services',
];

/**
 * Converts a Date string / object to local YYYY-MM-DDTHH:mm for datetime-local inputs
 */
function toDatetimeLocal(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getInitialFormData(flight) {
  if (flight) {
    return {
      flightNumber: flight.flightNumber || '',
      airline: flight.airline || 'Ethiopian Airlines',
      departureCity: flight.departureCity || '',
      arrivalCity: flight.arrivalCity || '',
      departureTime: toDatetimeLocal(flight.departureTime),
      arrivalTime: toDatetimeLocal(flight.arrivalTime),
      price: flight.price !== undefined ? flight.price : '',
      totalSeats: flight.totalSeats !== undefined ? flight.totalSeats : 120,
      availableSeats: flight.availableSeats !== undefined ? flight.availableSeats : 120,
      status: flight.status || 'Scheduled',
    };
  }

  // Default initial dates (tomorrow)
  const now = new Date();
  const dep = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  dep.setHours(9, 0, 0, 0);
  const arr = new Date(dep.getTime() + 1.5 * 60 * 60 * 1000);

  return {
    flightNumber: '',
    airline: 'Ethiopian Airlines',
    departureCity: 'Addis Ababa (ADD)',
    arrivalCity: 'Bahir Dar (BJR)',
    departureTime: toDatetimeLocal(dep),
    arrivalTime: toDatetimeLocal(arr),
    price: 2500,
    totalSeats: 120,
    availableSeats: 120,
    status: 'Scheduled',
  };
}

function FlightModalInner({
  flight,
  onClose,
  onSubmit,
  loading,
}) {
  const isEdit = Boolean(flight);
  const modalRef = useRef(null);

  const [formData, setFormData] = useState(() => getInitialFormData(flight));
  const [validationError, setValidationError] = useState('');

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [loading, onClose]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let parsedValue = value;

    if (type === 'number') {
      parsedValue = value === '' ? '' : Number(value);
    }

    setFormData((prev) => {
      const updated = { ...prev, [name]: parsedValue };

      // If creating and totalSeats changes, auto-update availableSeats if they matched
      if (!isEdit && name === 'totalSeats' && (prev.availableSeats === prev.totalSeats || prev.availableSeats > parsedValue)) {
        updated.availableSeats = parsedValue;
      }
      return updated;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setValidationError('');

    // Validations
    if (!formData.flightNumber.trim()) {
      setValidationError('Flight number is required.');
      return;
    }
    if (!formData.departureCity.trim() || !formData.arrivalCity.trim()) {
      setValidationError('Both departure and arrival cities are required.');
      return;
    }
    if (formData.departureCity.trim().toLowerCase() === formData.arrivalCity.trim().toLowerCase()) {
      setValidationError('Departure and arrival cities cannot be the same.');
      return;
    }
    if (!formData.departureTime || !formData.arrivalTime) {
      setValidationError('Departure and arrival times are required.');
      return;
    }

    const depDate = new Date(formData.departureTime);
    const arrDate = new Date(formData.arrivalTime);

    if (arrDate <= depDate) {
      setValidationError('Arrival time must be strictly after the departure time.');
      return;
    }

    if (formData.price === '' || Number(formData.price) < 0) {
      setValidationError('Please specify a valid price in ETB (>= 0).');
      return;
    }

    if (formData.totalSeats < 1) {
      setValidationError('Total seats must be at least 1.');
      return;
    }

    if (formData.availableSeats > formData.totalSeats) {
      setValidationError('Available seats cannot exceed total seat capacity.');
      return;
    }

    if (formData.availableSeats < 0) {
      setValidationError('Available seats cannot be negative.');
      return;
    }

    onSubmit({
      ...formData,
      flightNumber: formData.flightNumber.trim().toUpperCase(),
      departureTime: new Date(formData.departureTime).toISOString(),
      arrivalTime: new Date(formData.arrivalTime).toISOString(),
      price: Number(formData.price),
      totalSeats: Number(formData.totalSeats),
      availableSeats: Number(formData.availableSeats),
    });
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-backdrop" onClick={!loading ? onClose : undefined} />
      <div className="modal-card modal-card-large" ref={modalRef}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-icon-badge primary">
              <Plane size={22} />
            </div>
            <div>
              <h3 className="modal-title">
                {isEdit ? `Edit Flight ${flight.flightNumber}` : 'Create New Flight'}
              </h3>
              <p className="modal-subtitle">
                {isEdit
                  ? 'Update flight schedule, seat availability, and pricing in ETB'
                  : 'Add a new scheduled route to the SkyLink flight inventory'}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={loading}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="admin-flight-form">
          {validationError && (
            <div className="auth-alert error" role="alert" style={{ marginBottom: '16px' }}>
              <AlertCircle size={18} className="alert-icon" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="form-grid-2">
            {/* Flight Number */}
            <div className="form-group">
              <label htmlFor="flightNumber" className="form-label">
                Flight Number <span className="required-star">*</span>
              </label>
              <input
                id="flightNumber"
                type="text"
                name="flightNumber"
                className="form-input font-mono"
                placeholder="e.g. ET-302"
                value={formData.flightNumber}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            {/* Airline */}
            <div className="form-group">
              <label htmlFor="airline" className="form-label">
                Airline <span className="required-star">*</span>
              </label>
              <input
                id="airline"
                type="text"
                name="airline"
                list="airline-suggestions"
                className="form-input"
                placeholder="e.g. Ethiopian Airlines"
                value={formData.airline}
                onChange={handleChange}
                required
                disabled={loading}
              />
              <datalist id="airline-suggestions">
                {AIRLINES.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="form-grid-2">
            {/* Departure City */}
            <div className="form-group">
              <label htmlFor="departureCity" className="form-label">
                Departure City <span className="required-star">*</span>
              </label>
              <input
                id="departureCity"
                type="text"
                name="departureCity"
                list="city-suggestions"
                className="form-input"
                placeholder="e.g. Addis Ababa (ADD)"
                value={formData.departureCity}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            {/* Arrival City */}
            <div className="form-group">
              <label htmlFor="arrivalCity" className="form-label">
                Arrival City <span className="required-star">*</span>
              </label>
              <input
                id="arrivalCity"
                type="text"
                name="arrivalCity"
                list="city-suggestions"
                className="form-input"
                placeholder="e.g. Bahir Dar (BJR)"
                value={formData.arrivalCity}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Datalist for Cities */}
          <datalist id="city-suggestions">
            {ETHIOPIAN_CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>

          <div className="form-grid-2">
            {/* Departure Time */}
            <div className="form-group">
              <label htmlFor="departureTime" className="form-label">
                Departure Date &amp; Time <span className="required-star">*</span>
              </label>
              <input
                id="departureTime"
                type="datetime-local"
                name="departureTime"
                className="form-input"
                value={formData.departureTime}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            {/* Arrival Time */}
            <div className="form-group">
              <label htmlFor="arrivalTime" className="form-label">
                Arrival Date &amp; Time <span className="required-star">*</span>
              </label>
              <input
                id="arrivalTime"
                type="datetime-local"
                name="arrivalTime"
                className="form-input"
                value={formData.arrivalTime}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-grid-3">
            {/* Price (ETB) */}
            <div className="form-group">
              <label htmlFor="price" className="form-label">
                Price (ETB) <span className="required-star">*</span>
              </label>
              <div className="input-icon-wrapper">
                <input
                  id="price"
                  type="number"
                  name="price"
                  min="0"
                  step="50"
                  className="form-input"
                  placeholder="2500"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Total Seats */}
            <div className="form-group">
              <label htmlFor="totalSeats" className="form-label">
                Total Seats <span className="required-star">*</span>
              </label>
              <input
                id="totalSeats"
                type="number"
                name="totalSeats"
                min="1"
                className="form-input"
                placeholder="120"
                value={formData.totalSeats}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            {/* Available Seats */}
            <div className="form-group">
              <label htmlFor="availableSeats" className="form-label">
                Available Seats <span className="required-star">*</span>
              </label>
              <input
                id="availableSeats"
                type="number"
                name="availableSeats"
                min="0"
                max={formData.totalSeats || undefined}
                className="form-input"
                placeholder="120"
                value={formData.availableSeats}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Status */}
          <div className="form-group">
            <label htmlFor="status" className="form-label">
              Flight Status
            </label>
            <select
              id="status"
              name="status"
              className="form-select"
              value={formData.status}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="Scheduled">Scheduled</option>
              <option value="Delayed">Delayed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="btn-spinner" />
                  <span>Saving Flight...</span>
                </>
              ) : (
                <span>{isEdit ? 'Update Flight' : 'Create Flight'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function FlightFormModal({
  isOpen,
  flight = null,
  onClose,
  onSubmit,
  loading = false,
}) {
  if (!isOpen) return null;

  // Use flight ID or 'new' as key to guarantee fresh state when opening or switching flights
  const key = flight ? flight._id || flight.id : 'new';

  return (
    <FlightModalInner
      key={key}
      flight={flight}
      onClose={onClose}
      onSubmit={onSubmit}
      loading={loading}
    />
  );
}

export default FlightFormModal;
