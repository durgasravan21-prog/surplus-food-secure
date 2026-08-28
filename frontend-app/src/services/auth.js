import api from './api';

export const authService = {
  googleCallback: (code, redirectUri) =>
    api.post('/auth/google/callback', { code, redirect_uri: redirectUri }),

  selectRole: (role) =>
    api.post('/auth/role', { role }),

  refresh: (refreshToken) =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),

  logout: () => api.post('/auth/logout'),
};
