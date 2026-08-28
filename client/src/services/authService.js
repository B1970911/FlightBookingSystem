import api from './api';

export const authService = {
  /**
   * Register a new user
   * @param {Object} userData - { name, email, password }
   * @returns {Promise<{ message: string, user: { id: string, name: string, email: string, role: string } }>}
   */
  async register(userData) {
    return api.post('/api/users/register', userData);
  },

  /**
   * Log in an existing user
   * @param {Object} credentials - { email, password }
   * @returns {Promise<{ message: string, token: string, user: { id: string, name: string, email: string, role: string } }>}
   */
  async login(credentials) {
    return api.post('/api/users/login', credentials);
  },

  /**
   * Fetch current authenticated user's profile
   * @returns {Promise<{ message: string, user: Object }>}
   */
  async getProfile() {
    return api.get('/api/users/profile');
  },
};

export default authService;
