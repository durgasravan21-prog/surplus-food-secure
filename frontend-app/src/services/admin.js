import api from './api';

export const adminService = {
  suspendUser: (id, reason) => api.post(`/admin/users/${id}/suspend`, { reason }),
  reinstateUser: (id) => api.post(`/admin/users/${id}/reinstate`),
  changeRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  overrideMatch: (id, action, ngoId) =>
    api.post(`/admin/matches/${id}/override`, { action, ngo_id: ngoId }),
};
