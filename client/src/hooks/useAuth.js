import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Custom hook to easily consume the AuthContext
 * @returns {{ user: Object|null, token: string|null, loading: boolean, isAuthenticated: boolean, isAdmin: boolean, login: Function, register: Function, logout: Function, restoreUser: Function }}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;
