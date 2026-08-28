import { useState, useMemo } from 'react';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate, formatTime } from '../../utils/formatDate';
import {
  Ticket,
  Search,
  Filter,
  Ban,
  Users,
} from 'lucide-react';

export function AdminBookingsTable({
  bookings = [],
  loading = false,
  onCancelBooking,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Filter bookings based on search and status
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesStatus =
        statusFilter === 'ALL' || booking.bookingStatus === statusFilter;

      const q = searchTerm.toLowerCase().trim();
      const bookingId = (booking._id || booking.id || '').toLowerCase();
      const userName = (booking.user?.name || '').toLowerCase();
      const userEmail = (booking.user?.email || '').toLowerCase();
      const flightNum = (booking.flight?.flightNumber || '').toLowerCase();
      const depCity = (booking.flight?.departureCity || '').toLowerCase();
      const arrCity = (booking.flight?.arrivalCity || '').toLowerCase();

      const matchesSearch =
        !q ||
        bookingId.includes(q) ||
        userName.includes(q) ||
        userEmail.includes(q) ||
        flightNum.includes(q) ||
        depCity.includes(q) ||
        arrCity.includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [bookings, searchTerm, statusFilter]);

  return (
    <div className="admin-section-card">
      {/* Section Header Toolbar */}
      <div className="admin-table-toolbar">
        <div className="toolbar-left">
          <div className="toolbar-search-box">
            <Search size={16} className="search-box-icon" />
            <input
              type="text"
              placeholder="Search by customer, email, flight #, ref..."
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
              <option value="ALL">All Reservation Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="toolbar-stats-note">
          <span>
            Showing <strong>{filteredBookings.length}</strong> of{' '}
            <strong>{bookings.length}</strong> total bookings
          </span>
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="admin-table-loading">
          <div className="auth-spinner" />
          <p>Loading all system bookings...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="admin-table-empty">
          <Ticket size={36} className="empty-icon" />
          <h4>No bookings found</h4>
          <p>
            {searchTerm || statusFilter !== 'ALL'
              ? 'Try clearing your search query or status filter.'
              : 'There are no passenger bookings recorded in the system.'}
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
                <th>Booking Ref</th>
                <th>Passenger</th>
                <th>Flight &amp; Route</th>
                <th>Departure Time</th>
                <th>Seats</th>
                <th>Total Fare (ETB)</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((booking) => {
                const bookingId = booking._id || booking.id;
                const flight = booking.flight || {};
                const user = booking.user || {};
                const isCancelled = booking.bookingStatus === 'Cancelled';

                return (
                  <tr key={bookingId}>
                    {/* Booking Reference */}
                    <td>
                      <span className="booking-ref-tag font-mono" title={bookingId}>
                        {bookingId}
                      </span>
                    </td>

                    {/* Passenger */}
                    <td>
                      <div className="user-cell">
                        <span className="user-name">{user.name || 'Anonymous User'}</span>
                        <span className="user-email">{user.email || 'No email'}</span>
                      </div>
                    </td>

                    {/* Flight & Route */}
                    <td>
                      <div className="booking-flight-cell">
                        <div className="flight-num-badge font-mono">
                          {flight.flightNumber || 'FL-???'}
                        </div>
                        <span className="booking-route-text">
                          {flight.departureCity || 'Origin'} &rarr; {flight.arrivalCity || 'Dest'}
                        </span>
                      </div>
                    </td>

                    {/* Departure Time */}
                    <td>
                      <div className="booking-time-cell">
                        <strong>
                          {flight.departureTime ? formatTime(flight.departureTime) : '--:--'}
                        </strong>
                        <span className="date-sub">
                          {flight.departureTime ? formatDate(flight.departureTime) : 'N/A'}
                        </span>
                      </div>
                    </td>

                    {/* Seats */}
                    <td>
                      <span className="seats-badge">
                        <Users size={13} />
                        <span>{booking.numberOfSeats}</span>
                      </span>
                    </td>

                    {/* Total Fare */}
                    <td>
                      <span className="price-cell font-mono">
                        {formatCurrency(booking.totalPrice)}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      <span
                        className={`status-pill ${
                          isCancelled ? 'status-cancelled' : 'status-scheduled'
                        }`}
                      >
                        {booking.bookingStatus || 'Confirmed'}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="text-right">
                      {!isCancelled ? (
                        <button
                          type="button"
                          className="btn-destructive-outline btn-xs"
                          onClick={() => onCancelBooking(booking)}
                          title="Cancel Customer Booking"
                        >
                          <Ban size={13} />
                          <span>Cancel</span>
                        </button>
                      ) : (
                        <span className="text-muted-xs">Cancelled</span>
                      )}
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

export default AdminBookingsTable;
