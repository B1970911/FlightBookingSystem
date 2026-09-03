import api from './api';

export const flightService = {
  /**
   * Get all flights with optional query filters
   * @param {Object} filters - { departureCity, arrivalCity, airline, status, minPrice, maxPrice }
   * @returns {Promise<Array>}
   */
  async getFlights(filters = {}) {
    return api.get('/api/flights', filters);
  },

  /**
   * Get a single flight by ID
   * @param {string} id - Flight MongoDB ID
   * @returns {Promise<Object>}
   */
  async getFlightById(id) {
    return api.get(`/api/flights/${id}`);
  },

  /**
   * Create a new flight (Admin only)
   * @param {Object} flightData - { flightNumber, airline, departureCity, arrivalCity, departureTime, arrivalTime, price, totalSeats, availableSeats, status }
   * @returns {Promise<{ message: string, flight: Object }>}
   */
  async createFlight(flightData) {
    return api.post('/api/flights', flightData);
  },

  /**
   * Update an existing flight (Admin only)
   * @param {string} id - Flight ID
   * @param {Object} flightData - Partial or full flight updates
   * @returns {Promise<{ message: string, flight: Object }>}
   */
  async updateFlight(id, flightData) {
    return api.put(`/api/flights/${id}`, flightData);
  },

  /**
   * Delete a flight (Admin only)
   * @param {string} id - Flight ID
   * @returns {Promise<{ message: string }>}
   */
  async deleteFlight(id) {
    return api.delete(`/api/flights/${id}`);
  },

  /**
   * Cancel a flight (Admin only)
   * @param {string} id - Flight ID
   * @returns {Promise<{ message: string, flight: Object }>}
   */
  async cancelFlight(id) {
    return api.put(`/api/flights/${id}/cancel`);
  },

  /**
   * Get flight seat map and configured seats
   * @param {string} id - Flight ID
   * @returns {Promise<{ flightId: string, flightNumber: string, totalSeats: number, availableSeats: number, seats: Array }>}
   */
  async getFlightSeats(id) {
    return api.get(`/api/flights/${id}/seats`);
  },

  /**
   * Configure custom flight seat map (Admin only)
   * @param {string} id - Flight ID
   * @param {Array} seats - Array of seat objects [{ seatNumber, seatClass, position, price, status }]
   * @returns {Promise<{ message: string, flight: Object }>}
   */
  async configureFlightSeats(id, seats) {
    return api.put(`/api/flights/${id}/seats`, { seats });
  },

  /**
   * Auto-generate standard flight seat map (Admin only)
   * @param {string} id - Flight ID
   * @param {Object} options - { businessRows, economyRows, businessWindowPrice, businessMiddlePrice, businessAislePrice, economyWindowPrice, economyMiddlePrice, economyAislePrice }
   * @returns {Promise<{ message: string, flight: Object }>}
   */
  async generateFlightSeats(id, options = {}) {
    return api.post(`/api/flights/${id}/generate-seats`, options);
  },
};

export default flightService;

