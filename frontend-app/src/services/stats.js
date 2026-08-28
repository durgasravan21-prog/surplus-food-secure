import api from './api';

export const statsService = {
  getImpact: (params) => api.get('/stats/impact', { params }),
  getAdminDashboard: () => api.get('/admin/dashboard'),
};
