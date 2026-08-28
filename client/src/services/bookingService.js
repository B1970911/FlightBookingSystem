import api from './api';

export const bookingService = {
  /**
   * Create a new flight booking
   * @param {Object} bookingData - { flightId: string, numberOfSeats: number }
   * @returns {Promise<Object>} Created booking
   */
  async createBooking(bookingData) {
    return api.post('/api/bookings', bookingData);
  },

  /**
   * Get all bookings belonging to the currently logged in user
   * @returns {Promise<Array>} List of user bookings with populated user and flight details
   */
  async getMyBookings() {
    return api.get('/api/bookings/my-bookings');
  },

  /**
   * Get a single booking by ID
   * @param {string} id - Booking ID
   * @returns {Promise<Object>} Booking with populated details
   */
  async getBookingById(id) {
    return api.get(`/api/bookings/${id}`);
  },

  /**
   * Cancel an existing booking
   * @param {string} id - Booking ID
   * @returns {Promise<Object>} Cancelled booking
   */
  async cancelBooking(id) {
    return api.put(`/api/bookings/${id}/cancel`);
  },

  /**
   * Get all bookings across the entire system (Admin only)
   * @returns {Promise<Array>} List of all bookings
   */
  async getAllBookings() {
    return api.get('/api/bookings');
  },

  /**
   * Get booking statistics and total revenue (Admin only)
   * @returns {Promise<{ totalBookings: number, confirmedBookings: number, cancelledBookings: number, totalRevenue: number }>}
   */
  async getBookingStats() {
    return api.get('/api/bookings/stats');
  },
};

export default bookingService;
