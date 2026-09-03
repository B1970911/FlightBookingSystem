import { useState, useEffect, useCallback } from 'react';
import { flightService } from '../services/flightService';
import { bookingService } from '../services/bookingService';
import {
  AdminStatsCards,
  AdminFlightsTable,
  AdminBookingsTable,
  FlightFormModal,
  AdminSeatModal,
  ConfirmModal,
} from '../components';
import {
  LayoutDashboard,
  Plane,
  Ticket,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Plus,
  ShieldCheck,
} from 'lucide-react';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'flights' | 'bookings'

  // Data states
  const [stats, setStats] = useState({
    totalBookings: 0,
    confirmedBookings: 0,
    cancelledBookings: 0,
    totalRevenue: 0,
  });
  const [flights, setFlights] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Flight Modal state (Create / Edit)
  const [isFlightModalOpen, setIsFlightModalOpen] = useState(false);
  const [editingFlight, setEditingFlight] = useState(null);
  const [flightModalLoading, setFlightModalLoading] = useState(false);

  // Seat Management Modal state
  const [managingSeatsFlight, setManagingSeatsFlight] = useState(null);

  // Delete Flight Modal state
  const [deletingFlight, setDeletingFlight] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Cancel Flight Modal state
  const [cancellingFlight, setCancellingFlight] = useState(null);
  const [cancelFlightLoading, setCancelFlightLoading] = useState(false);

  // Cancel Customer Booking Modal state
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Auto-dismiss success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Load all admin data
  const loadAdminData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    setError(null);

    try {
      const [statsRes, flightsRes, bookingsRes] = await Promise.all([
        bookingService.getBookingStats().catch((err) => {
          console.error('Failed to load stats', err);
          return { totalBookings: 0, confirmedBookings: 0, cancelledBookings: 0, totalRevenue: 0 };
        }),
        flightService.getFlights().catch((err) => {
          console.error('Failed to load flights', err);
          return [];
        }),
        bookingService.getAllBookings().catch((err) => {
          console.error('Failed to load all bookings', err);
          return [];
        }),
      ]);

      setStats(statsRes || {});
      setFlights(Array.isArray(flightsRes) ? flightsRes : []);
      setBookings(Array.isArray(bookingsRes) ? bookingsRes : []);
    } catch (err) {
      const msg =
        err.data?.message ||
        err.message ||
        'Failed to load admin management dashboard. Please check your privileges.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function fetchInitial() {
      try {
        const [statsRes, flightsRes, bookingsRes] = await Promise.all([
          bookingService.getBookingStats().catch((err) => {
            console.error('Failed to load stats', err);
            return { totalBookings: 0, confirmedBookings: 0, cancelledBookings: 0, totalRevenue: 0 };
          }),
          flightService.getFlights().catch((err) => {
            console.error('Failed to load flights', err);
            return [];
          }),
          bookingService.getAllBookings().catch((err) => {
            console.error('Failed to load all bookings', err);
            return [];
          }),
        ]);

        if (isMounted) {
          setStats(statsRes || {});
          setFlights(Array.isArray(flightsRes) ? flightsRes : []);
          setBookings(Array.isArray(bookingsRes) ? bookingsRes : []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          const msg =
            err.data?.message ||
            err.message ||
            'Failed to load admin management dashboard. Please check your privileges.';
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchInitial();

    return () => {
      isMounted = false;
    };
  }, []);

  // Open Create Flight Modal
  const handleOpenCreateFlight = () => {
    setEditingFlight(null);
    setIsFlightModalOpen(true);
  };

  // Open Edit Flight Modal
  const handleOpenEditFlight = (flight) => {
    setEditingFlight(flight);
    setIsFlightModalOpen(true);
  };

  // Open Manage Seats Modal
  const handleOpenManageSeats = (flight) => {
    setManagingSeatsFlight(flight);
  };

  // Handle Seat Map Updated from Modal
  const handleSeatModalSuccess = (updatedFlight) => {
    const flightId = updatedFlight._id || updatedFlight.id;
    setFlights((prev) =>
      prev.map((f) => ((f._id || f.id) === flightId ? updatedFlight : f))
    );
    setSuccessMessage(`Seat map for flight ${updatedFlight.flightNumber} updated successfully.`);
    loadAdminData(true);
  };

  // Handle Flight Submit (Create or Update)
  const handleFlightSubmit = async (formData) => {
    setFlightModalLoading(true);
    try {
      if (editingFlight) {
        const flightId = editingFlight._id || editingFlight.id;
        const res = await flightService.updateFlight(flightId, formData);
        const updated = res.flight || res;

        setFlights((prev) =>
          prev.map((f) => ((f._id || f.id) === flightId ? updated : f))
        );
        setSuccessMessage(`Flight ${formData.flightNumber} updated successfully.`);
      } else {
        const res = await flightService.createFlight(formData);
        const created = res.flight || res;

        setFlights((prev) => [created, ...prev]);
        setSuccessMessage(`Flight ${formData.flightNumber} created successfully.`);
      }

      setIsFlightModalOpen(false);
      setEditingFlight(null);
      // Refresh stats quietly
      loadAdminData(true);
    } catch (err) {
      const msg =
        err.data?.message ||
        err.message ||
        'Failed to save flight. Please check the inputs.';
      setError(msg);
    } finally {
      setFlightModalLoading(false);
    }
  };

  // Handle Delete Flight Confirm
  const handleConfirmDeleteFlight = async () => {
    if (!deletingFlight) return;

    setDeleteLoading(true);
    try {
      const flightId = deletingFlight._id || deletingFlight.id;
      await flightService.deleteFlight(flightId);

      setFlights((prev) => prev.filter((f) => (f._id || f.id) !== flightId));
      setSuccessMessage(`Flight ${deletingFlight.flightNumber} deleted successfully.`);
      setDeletingFlight(null);
      // Refresh stats quietly
      loadAdminData(true);
    } catch (err) {
      if (err.status === 409) {
        setError(
          'This flight cannot be deleted because it has active bookings. Cancel the flight instead.'
        );
      } else {
        const msg =
          err.data?.message ||
          err.message ||
          'Failed to delete flight.';
        setError(msg);
      }
      setDeletingFlight(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle Cancel Flight Confirm
  const handleConfirmCancelFlight = async () => {
    if (!cancellingFlight) return;

    setCancelFlightLoading(true);
    try {
      const flightId = cancellingFlight._id || cancellingFlight.id;
      const res = await flightService.cancelFlight(flightId);
      const updatedFlight = res.flight || res;

      setFlights((prev) =>
        prev.map((f) => {
          const currentId = f._id || f.id;
          if (currentId === flightId) {
            return {
              ...f,
              ...updatedFlight,
              status: 'Cancelled',
            };
          }
          return f;
        })
      );
      setSuccessMessage(
        res.message || `Flight ${cancellingFlight.flightNumber} cancelled successfully.`
      );
      setCancellingFlight(null);
      // Refresh stats quietly
      loadAdminData(true);
    } catch (err) {
      const msg =
        err.data?.message ||
        err.message ||
        'Failed to cancel flight.';
      setError(msg);
      setCancellingFlight(null);
    } finally {
      setCancelFlightLoading(false);
    }
  };

  // Handle Cancel Customer Booking Confirm
  const handleConfirmCancelBooking = async () => {
    if (!cancellingBooking) return;

    setCancelLoading(true);
    try {
      const bookingId = cancellingBooking._id || cancellingBooking.id;
      const updated = await bookingService.cancelBooking(bookingId);

      // Update bookings list
      setBookings((prev) =>
        prev.map((b) =>
          (b._id || b.id) === bookingId
            ? { ...b, bookingStatus: updated.bookingStatus || 'Cancelled' }
            : b
        )
      );

      // Restore seats in local flights state if flight found
      if (cancellingBooking.flight) {
        const fId = cancellingBooking.flight._id || cancellingBooking.flight.id || cancellingBooking.flight;
        setFlights((prev) =>
          prev.map((f) =>
            (f._id || f.id) === fId
              ? { ...f, availableSeats: f.availableSeats + cancellingBooking.numberOfSeats }
              : f
          )
        );
      }

      setSuccessMessage('Booking cancelled and seats restored to inventory.');
      setCancellingBooking(null);
      // Refresh stats
      loadAdminData(true);
    } catch (err) {
      const msg =
        err.data?.message ||
        err.message ||
        'Failed to cancel booking.';
      setError(msg);
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="admin-page-container">
      {/* Top Banner */}
      <div className="admin-header-banner">
        <div className="admin-header-left">
          <div className="admin-badge">
            <ShieldCheck size={16} />
            <span>Administrator Portal</span>
          </div>
          <h1>Operations &amp; Analytics Dashboard</h1>
          <p>
            Monitor flight revenues in Ethiopian Birr (ETB), manage scheduled routes, and oversee all customer reservations.
          </p>
        </div>

        <div className="admin-header-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => loadAdminData(true)}
            disabled={loading || refreshing}
            title="Refresh dashboard data"
          >
            <RefreshCw size={16} className={refreshing ? 'btn-spinner' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreateFlight}
          >
            <Plus size={16} />
            <span>New Flight</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="auth-alert success" role="status" style={{ marginBottom: '24px' }}>
          <CheckCircle2 size={18} className="alert-icon" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="auth-alert error" role="alert" style={{ marginBottom: '24px' }}>
          <AlertCircle size={18} className="alert-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Admin Tabs */}
      <div className="admin-tabs-nav">
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <LayoutDashboard size={18} />
          <span>Analytics Overview</span>
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'flights' ? 'active' : ''}`}
          onClick={() => setActiveTab('flights')}
        >
          <Plane size={18} />
          <span>Flight Inventory ({flights.length})</span>
        </button>

        <button
          type="button"
          className={`admin-tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          <Ticket size={18} />
          <span>All Reservations ({bookings.length})</span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="admin-tab-content">
          {/* Key Metrics */}
          <AdminStatsCards
            stats={stats}
            flightCount={flights.length}
            loading={loading}
          />

          {/* Quick Flights Overview Preview */}
          <div className="admin-overview-grid">
            <div className="overview-subpanel">
              <div className="subpanel-header">
                <div className="subpanel-title-group">
                  <Plane size={18} />
                  <h3>Recent Flight Schedules</h3>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => setActiveTab('flights')}
                >
                  Manage All Flights
                </button>
              </div>

              <AdminFlightsTable
                flights={flights.slice(0, 5)}
                loading={loading}
                onAddNewFlight={handleOpenCreateFlight}
                onEditFlight={handleOpenEditFlight}
                onDeleteFlight={(flight) => setDeletingFlight(flight)}
                onCancelFlight={(flight) => setCancellingFlight(flight)}
                onManageSeats={handleOpenManageSeats}
              />
            </div>

            <div className="overview-subpanel">
              <div className="subpanel-header">
                <div className="subpanel-title-group">
                  <Ticket size={18} />
                  <h3>Recent Customer Bookings</h3>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => setActiveTab('bookings')}
                >
                  Manage All Bookings
                </button>
              </div>

              <AdminBookingsTable
                bookings={bookings.slice(0, 5)}
                loading={loading}
                onCancelBooking={(booking) => setCancellingBooking(booking)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Flight Inventory Management */}
      {activeTab === 'flights' && (
        <div className="admin-tab-content">
          <AdminFlightsTable
            flights={flights}
            loading={loading}
            onAddNewFlight={handleOpenCreateFlight}
            onEditFlight={handleOpenEditFlight}
            onDeleteFlight={(flight) => setDeletingFlight(flight)}
            onCancelFlight={(flight) => setCancellingFlight(flight)}
            onManageSeats={handleOpenManageSeats}
          />
        </div>
      )}

      {/* Tab 3: System-wide Bookings Management */}
      {activeTab === 'bookings' && (
        <div className="admin-tab-content">
          <AdminBookingsTable
            bookings={bookings}
            loading={loading}
            onCancelBooking={(booking) => setCancellingBooking(booking)}
          />
        </div>
      )}

      {/* Flight Create / Edit Modal */}
      <FlightFormModal
        isOpen={isFlightModalOpen}
        flight={editingFlight}
        onClose={() => {
          setIsFlightModalOpen(false);
          setEditingFlight(null);
        }}
        onSubmit={handleFlightSubmit}
        loading={flightModalLoading}
      />

      {/* Admin Seat Management Modal */}
      <AdminSeatModal
        isOpen={Boolean(managingSeatsFlight)}
        flight={managingSeatsFlight}
        onClose={() => setManagingSeatsFlight(null)}
        onSuccess={handleSeatModalSuccess}
      />

      {/* Delete Flight Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingFlight)}
        title="Delete Flight Record?"
        message={`Are you sure you want to permanently delete flight ${deletingFlight?.flightNumber} (${deletingFlight?.departureCity} → ${deletingFlight?.arrivalCity})? This operation cannot be reversed.`}
        confirmText="Delete Flight"
        cancelText="Keep Flight"
        onConfirm={handleConfirmDeleteFlight}
        onCancel={() => setDeletingFlight(null)}
        loading={deleteLoading}
        isDestructive={true}
      />

      {/* Cancel Flight Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(cancellingFlight)}
        title="Cancel Flight Schedule?"
        message={`Are you sure you want to cancel flight ${cancellingFlight?.flightNumber} (${cancellingFlight?.departureCity} → ${cancellingFlight?.arrivalCity})? New bookings will be blocked, while existing reservations and seat maps will be preserved.`}
        confirmText="Cancel Flight"
        cancelText="Keep Active"
        onConfirm={handleConfirmCancelFlight}
        onCancel={() => setCancellingFlight(null)}
        loading={cancelFlightLoading}
        isDestructive={true}
      />

      {/* Cancel Booking Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(cancellingBooking)}
        title="Cancel Customer Reservation?"
        message={`Are you sure you want to cancel booking reference ${cancellingBooking?._id || cancellingBooking?.id}? The reserved ${cancellingBooking?.numberOfSeats} seat(s) will be automatically returned to the flight's inventory.`}
        confirmText="Confirm Cancellation"
        cancelText="Keep Reservation"
        onConfirm={handleConfirmCancelBooking}
        onCancel={() => setCancellingBooking(null)}
        loading={cancelLoading}
        isDestructive={true}
      />
    </div>
  );
}

export default AdminPage;

