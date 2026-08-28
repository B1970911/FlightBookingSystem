import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  formatDate,
  formatTime,
  formatFlightDuration,
} from '../../utils/formatDate';
import { Plane, Users, ArrowRight, Clock } from 'lucide-react';

export function FlightCard({ flight }) {
  if (!flight) return null;

  const {
    _id,
    id,
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

  return (
    <article className="flight-card" aria-label={`Flight ${flightNumber} from ${departureCity} to ${arrivalCity}`}>
      {/* Top Bar: Airline, Flight No, Status */}
      <div className="flight-card-header">
        <div className="airline-badge">
          <div className="airline-icon-box">
            <Plane size={18} className="airline-icon" />
          </div>
          <div>
            <span className="airline-name">{airline}</span>
            <span className="flight-number">{flightNumber}</span>
          </div>
        </div>

        <span className={`flight-status-badge ${getStatusClass(status)}`}>
          {status}
        </span>
      </div>

      {/* Main Flight Schedule */}
      <div className="flight-schedule-grid">
        {/* Departure */}
        <div className="schedule-point departure">
          <span className="point-time">{formatTime(departureTime)}</span>
          <span className="point-city">{departureCity}</span>
          <span className="point-date">{formatDate(departureTime)}</span>
        </div>

        {/* Path & Duration */}
        <div className="flight-duration-indicator" aria-label={`Flight duration ${duration}`}>
          <span className="duration-text">
            <Clock size={13} />
            {duration}
          </span>
          <div className="duration-line-box">
            <div className="duration-dot start" />
            <div className="duration-line" />
            <Plane size={16} className="duration-plane-icon" />
            <div className="duration-dot end" />
          </div>
          <span className="direct-badge">Direct</span>
        </div>

        {/* Arrival */}
        <div className="schedule-point arrival">
          <span className="point-time">{formatTime(arrivalTime)}</span>
          <span className="point-city">{arrivalCity}</span>
          <span className="point-date">{formatDate(arrivalTime)}</span>
        </div>
      </div>

      {/* Card Footer: Seats, Price, Action */}
      <div className="flight-card-footer">
        <div className="seat-availability">
          <Users size={16} className="seat-icon" />
          <span>
            {availableSeats !== undefined ? (
              <>
                <strong>{availableSeats}</strong>
                {totalSeats ? ` / ${totalSeats}` : ''} seats left
              </>
            ) : (
              'Seats available'
            )}
          </span>
          {availableSeats !== undefined && availableSeats > 0 && availableSeats <= 5 && (
            <span className="low-seats-warning">Low availability</span>
          )}
        </div>

        <div className="flight-card-action-group">
          <div className="price-box">
            <span className="price-caption">Starting from</span>
            <span className="price-amount">{formatCurrency(price)}</span>
          </div>

          <Link
            to={`/flights/${flightId}`}
            className={`btn-view-flight ${!isAvailable ? 'btn-view-disabled' : ''}`}
            aria-label={`View details for flight ${flightNumber}`}
          >
            <span>View Details</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default FlightCard;
