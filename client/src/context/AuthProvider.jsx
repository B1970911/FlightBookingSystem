import { useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { authService } from '../services/authService';

/**
 * Normalize user data to ensure uniform shape across register/login/profile
 */
function normalizeUser(userData) {
  if (!userData) return null;
  return {
    id: userData.id || userData._id,
    name: userData.name,
    email: userData.email,
    role: userData.role || 'user',
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')));

  useEffect(() => {
    let isMounted = true;
    const storedToken = localStorage.getItem('token');

    if (!storedToken) {
      return;
    }

    async function verifyStoredToken() {
      try {
        const response = await authService.getProfile();
        if (isMounted && response?.user) {
          setUser(normalizeUser(response.user));
          setToken(storedToken);
        }
      } catch (error) {
        if (error.status === 401 || error.status === 403) {
          localStorage.removeItem('token');
          if (isMounted) {
            setUser(null);
            setToken(null);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    verifyStoredToken();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Log in user with credentials and save JWT to localStorage
   */
  const login = async (credentials) => {
    const response = await authService.login(credentials);
    if (response && response.token && response.user) {
      localStorage.setItem('token', response.token);
      setToken(response.token);
      const normalized = normalizeUser(response.user);
      setUser(normalized);
      return { token: response.token, user: normalized, message: response.message };
    }
    throw new Error(response?.message || 'Login failed. Invalid response from server.');
  };

  /**
   * Register a new user, and optionally auto-login upon success
   */
  const register = async (userData, autoLogin = true) => {
    const response = await authService.register(userData);
    if (autoLogin && response) {
      const loginRes = await login({
        email: userData.email,
        password: userData.password,
      });
      return { ...response, autoLoggedIn: true, loginData: loginRes };
    }
    return response;
  };

  /**
   * Log out user by clearing state and localStorage
   */
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(user && token),
    isAdmin: Boolean(user && user.role === 'admin'),
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
