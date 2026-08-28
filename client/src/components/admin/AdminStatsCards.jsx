import { formatCurrency } from '../../utils/formatCurrency';
import {
  DollarSign,
  Ticket,
  CheckCircle2,
  XCircle,
  Plane,
  TrendingUp,
} from 'lucide-react';

export function AdminStatsCards({ stats = {}, flightCount = 0, loading = false }) {
  const totalBookings = stats.totalBookings || 0;
  const confirmedBookings = stats.confirmedBookings || 0;
  const cancelledBookings = stats.cancelledBookings || 0;
  const totalRevenue = stats.totalRevenue || 0;

  const confirmedRate =
    totalBookings > 0
      ? Math.round((confirmedBookings / totalBookings) * 100)
      : 0;

  const cancelledRate =
    totalBookings > 0
      ? Math.round((cancelledBookings / totalBookings) * 100)
      : 0;

  return (
    <div className="admin-stats-grid">
      {/* Total Revenue Card */}
      <div className="admin-stat-card primary">
        <div className="stat-card-header">
          <span className="stat-card-title">Total Revenue</span>
          <div className="stat-icon-wrapper primary">
            <DollarSign size={20} />
          </div>
        </div>
        <div className="stat-card-body">
          <div className="stat-value-large font-mono">
            {loading ? '...' : formatCurrency(totalRevenue)}
          </div>
          <div className="stat-card-footer">
            <span className="stat-badge success">
              <TrendingUp size={12} />
              <span>Confirmed Gross</span>
            </span>
            <span className="stat-footer-text">from {confirmedBookings} bookings</span>
          </div>
        </div>
      </div>

      {/* Total Bookings Card */}
      <div className="admin-stat-card">
        <div className="stat-card-header">
          <span className="stat-card-title">Total Reservations</span>
          <div className="stat-icon-wrapper info">
            <Ticket size={20} />
          </div>
        </div>
        <div className="stat-card-body">
          <div className="stat-value-large font-mono">
            {loading ? '...' : totalBookings}
          </div>
          <div className="stat-card-footer">
            <span className="stat-badge neutral">All Time</span>
            <span className="stat-footer-text">passenger orders</span>
          </div>
        </div>
      </div>

      {/* Confirmed Bookings Card */}
      <div className="admin-stat-card">
        <div className="stat-card-header">
          <span className="stat-card-title">Confirmed Bookings</span>
          <div className="stat-icon-wrapper success">
            <CheckCircle2 size={20} />
          </div>
        </div>
        <div className="stat-card-body">
          <div className="stat-value-large font-mono">
            {loading ? '...' : confirmedBookings}
          </div>
          <div className="stat-card-footer">
            <span className="stat-badge success">{confirmedRate}% rate</span>
            <span className="stat-footer-text">valid itineraries</span>
          </div>
        </div>
      </div>

      {/* Cancelled Bookings Card */}
      <div className="admin-stat-card">
        <div className="stat-card-header">
          <span className="stat-card-title">Cancelled Bookings</span>
          <div className="stat-icon-wrapper error">
            <XCircle size={20} />
          </div>
        </div>
        <div className="stat-card-body">
          <div className="stat-value-large font-mono">
            {loading ? '...' : cancelledBookings}
          </div>
          <div className="stat-card-footer">
            <span className="stat-badge error">{cancelledRate}% rate</span>
            <span className="stat-footer-text">seats returned</span>
          </div>
        </div>
      </div>

      {/* Active Flights Card */}
      <div className="admin-stat-card">
        <div className="stat-card-header">
          <span className="stat-card-title">Active Routes</span>
          <div className="stat-icon-wrapper warning">
            <Plane size={20} />
          </div>
        </div>
        <div className="stat-card-body">
          <div className="stat-value-large font-mono">
            {loading ? '...' : flightCount}
          </div>
          <div className="stat-card-footer">
            <span className="stat-badge info">In System</span>
            <span className="stat-footer-text">managed schedules</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminStatsCards;
