import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth';
import { wsManager } from '../services/websocket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setUser(parsed);
        if (token) wsManager.connect(token);
      } catch {
        localStorage.removeItem('user_data');
        localStorage.removeItem('access_token');
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (code, redirectUri) => {
    const response = await authService.googleCallback(code, redirectUri);
    const { access_token, refresh_token, ...userData } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('user_data', JSON.stringify(userData));
    setUser(userData);
    wsManager.connect(access_token);
    return userData;
  }, []);

  const selectRole = useCallback(async (role) => {
    try {
      const response = await authService.selectRole(role);
      const updatedUser = { ...user, ...response.data };
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      console.error('Role selection failed:', err);
      throw err;
    }
  }, [user]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore logout errors
    } finally {
      wsManager.disconnect();
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_data');
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem('user_data', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        selectRole,
        logout,
        updateUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
