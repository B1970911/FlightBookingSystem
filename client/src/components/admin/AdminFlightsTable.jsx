import { useState, useMemo } from 'react';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, formatTime, formatFlightDuration } from '../../utils/formatDate';
import {
  Plane,
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  Calendar,
  ArrowRight,
} from 'lucide-react';

export function AdminFlightsTable({
  flights = [],
  loading = false,
  onAddNewFlight,
  onEditFlight,
  onDeleteFlight,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filter flights based on search and status
  const filteredFlights = useMemo(() => {
    return flights.filter((flight) => {
      const matchesStatus =
        statusFilter === 'ALL' || flight.status === statusFilter;

      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        flight.flightNumber?.toLowerCase().includes(q) ||
        flight.airline?.toLowerCase().includes(q) ||
        flight.departureCity?.toLowerCase().includes(q) ||
        flight.arrivalCity?.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [flights, searchTerm, statusFilter]);

  return (
    <div className="admin-section-card">
      {/* Section Header */}
      <div className="admin-table-toolbar">
        <div className="toolbar-left">
          <div className="toolbar-search-box">
            <Search size={16} className="search-box-icon" />
            <input
              type="text"
              placeholder="Search flight #, airline, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchTerm('')}
              >
                &times;
              </button>
            )}
          </div>

          <div className="toolbar-filter-group">
            <Filter size={15} className="filter-icon" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="admin-filter-select"
            >
              <option value="ALL">All Flight Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Delayed">Delayed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={onAddNewFlight}
        >
          <Plus size={16} />
          <span>Add New Flight</span>
        </button>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="admin-table-loading">
          <div className="auth-spinner" />
          <p>Loading flight schedules...</p>
        </div>
      ) : filteredFlights.length === 0 ? (
        <div className="admin-table-empty">
          <Plane size={36} className="empty-icon" />
          <h4>No flights found</h4>
          <p>
            {searchTerm || statusFilter !== 'ALL'
              ? 'Try clearing your search query or status filter.'
              : 'No flights are currently registered in the database.'}
          </p>
          {(searchTerm || statusFilter !== 'ALL') && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Flight &amp; Airline</th>
                <th>Route (Origin &rarr; Destination)</th>
                <th>Departure &amp; Arrival</th>
                <th>Price (ETB)</th>
                <th>Seat Inventory</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFlights.map((flight) => {
                const flightId = flight._id || flight.id;
                const total = flight.totalSeats || 0;
                const available = flight.availableSeats || 0;
                const booked = Math.max(0, total - available);
                const occupancyPercent = total > 0 ? Math.round((booked / total) * 100) : 0;
                const duration = formatFlightDuration(flight.departureTime, flight.arrivalTime);

                return (
                  <tr key={flightId}>
                    {/* Flight & Airline */}
                    <td>
                      <div className="flight-cell-primary">
                        <span className="flight-number-tag font-mono">{flight.flightNumber}</span>
                        <span className="flight-airline-name">{flight.airline}</span>
                      </div>
                    </td>

                    {/* Route */}
                    <td>
                      <div className="route-cell">
                        <span className="route-city origin">{flight.departureCity}</span>
                        <ArrowRight size={14} className="route-arrow" />
                        <span className="route-city destination">{flight.arrivalCity}</span>
                      </div>
                    </td>

                    {/* Schedule */}
                    <td>
                      <div className="schedule-cell">
                        <div className="schedule-time-row">
                          <strong>{formatTime(flight.departureTime)}</strong>
                          <span className="time-sep">&rarr;</span>
                          <strong>{formatTime(flight.arrivalTime)}</strong>
                          <span className="schedule-duration-pill">({duration})</span>
                        </div>
                        <div className="schedule-date-row">
                          <Calendar size={12} />
                          <span>{formatDate(flight.departureTime)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td>
                      <span className="price-cell font-mono">
                        {formatCurrency(flight.price)}
                      </span>
                    </td>

                    {/* Seat Inventory */}
                    <td>
                      <div className="seat-inventory-cell">
                        <div className="seat-counts-row">
                          <span className={available === 0 ? 'seats-zero' : 'seats-avail'}>
                            {available} left
                          </span>
                          <span className="seats-total">/ {total} seats</span>
                        </div>
                        <div className="seat-progress-bar">
                          <div
                            className={`seat-progress-fill ${
                              occupancyPercent >= 90
                                ? 'high'
                                : occupancyPercent >= 50
                                ? 'medium'
                                : 'low'
                            }`}
                            style={{ width: `${occupancyPercent}%` }}
                            title={`${occupancyPercent}% booked (${booked}/${total})`}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td>
                      <span
                        className={`status-pill ${
                          flight.status === 'Cancelled'
                            ? 'status-cancelled'
                            : flight.status === 'Delayed'
                            ? 'status-delayed'
                            : 'status-scheduled'
                        }`}
                      >
                        {flight.status || 'Scheduled'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="text-right">
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="btn-icon-action edit"
                          onClick={() => onEditFlight(flight)}
                          title="Edit Flight"
                          aria-label={`Edit flight ${flight.flightNumber}`}
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          type="button"
                          className="btn-icon-action delete"
                          onClick={() => onDeleteFlight(flight)}
                          title="Delete Flight"
                          aria-label={`Delete flight ${flight.flightNumber}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminFlightsTable;
