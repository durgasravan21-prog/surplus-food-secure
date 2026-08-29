import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth';
import { wsManager } from '../services/websocket';
import { ROLES, VERIFICATION_STATUS } from '../config/constants';

const AuthContext = createContext(null);

const DEMO_USERS = {
  [ROLES.RESTAURANT]: {
    user_id: 'demo-rest-01',
    email: 'chef@saffronkitchen.in',
    role: ROLES.RESTAURANT,
    verification_status: VERIFICATION_STATUS.APPROVED,
    org_name: 'Saffron Grand Commercial Kitchen',
    fssai_no: '12345678901234',
  },
  [ROLES.INDIVIDUAL_DONOR]: {
    user_id: 'demo-donor-02',
    email: 'priya.sharma@gmail.com',
    role: ROLES.INDIVIDUAL_DONOR,
    verification_status: VERIFICATION_STATUS.APPROVED,
    address: 'Koramangala 4th Block, Bengaluru',
  },
  [ROLES.NGO]: {
    user_id: 'demo-ngo-03',
    email: 'director@annasevatrust.org',
    role: ROLES.NGO,
    verification_status: VERIFICATION_STATUS.APPROVED,
    org_name: 'Anna Seva Trust Food Bank',
    reg_no: '80G-2024-KA-004521',
    daily_capacity: 150,
    daily_capacity_remaining: 110,
    service_radius_km: 7,
    auto_match_enabled: true,
  },
  [ROLES.DELIVERY_PARTNER]: {
    user_id: 'demo-rider-04',
    email: 'rahul.rider@annayog.app',
    role: ROLES.DELIVERY_PARTNER,
    verification_status: VERIFICATION_STATUS.APPROVED,
    vehicle_type: 'BIKE',
    status: 'ONLINE',
  },
  [ROLES.ADMIN]: {
    user_id: 'demo-admin-05',
    email: 'durgasravan21@gmail.com',
    name: 'Durga Sravan',
    role: ROLES.ADMIN,
    verification_status: VERIFICATION_STATUS.APPROVED,
  },
};

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
      }
    } else {
      // Default to Restaurant demo user for seamless preview
      const defaultUser = DEMO_USERS[ROLES.RESTAURANT];
      setUser(defaultUser);
      localStorage.setItem('user_data', JSON.stringify(defaultUser));
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

  const switchDemoRole = useCallback((roleName) => {
    const demoUser = DEMO_USERS[roleName] || DEMO_USERS[ROLES.RESTAURANT];
    setUser(demoUser);
    localStorage.setItem('user_data', JSON.stringify(demoUser));
    return demoUser;
  }, []);

  const selectRole = useCallback(async (role) => {
    try {
      const response = await authService.selectRole(role);
      const updatedUser = { ...user, ...response.data };
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    } catch {
      // Fallback for local demo simulation
      const fallbackUser = DEMO_USERS[role] || { ...user, role };
      localStorage.setItem('user_data', JSON.stringify(fallbackUser));
      setUser(fallbackUser);
      return fallbackUser;
    }
  }, [user]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // continue logout even if API is offline
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    wsManager.disconnect();
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('user_data', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, selectRole, logout, updateUser, switchDemoRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
