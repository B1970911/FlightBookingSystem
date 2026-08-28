import api from './api';

export const paymentService = {
  /**
   * Initialize / create a payment record for a booking
   * @param {Object} paymentData - { bookingId: string }
   * @returns {Promise<Object>} Created payment record
   */
  async createPayment(paymentData) {
    return api.post('/api/payments', paymentData);
  },

  /**
   * Confirm payment by payment ID (triggers confirmation email via Resend in the backend)
   * @param {string} id - Payment ID
   * @returns {Promise<{ message: string, payment: Object }>}
   */
  async confirmPayment(id) {
    return api.put(`/api/payments/${id}/confirm`);
  },
};

export default paymentService;
