import api from './api';

export const disputesService = {
  create: (data) => api.post('/disputes', data),
  getAll: (params) => api.get('/admin/disputes', { params }),
  resolve: (id, outcome, trustScoreDelta) =>
    api.post(`/admin/disputes/${id}/resolve`, { outcome, trust_score_delta: trustScoreDelta }),
};
