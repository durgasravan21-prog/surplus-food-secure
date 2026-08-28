import api from './api';

export const verificationService = {
  submit: (data) => api.post('/verification/submit', data),
  getStatus: () => api.get('/verification/me'),
  review: (id, decision, reason) =>
    api.post(`/verification/${id}/review`, { decision, reason }),
  getQueue: (params) => api.get('/admin/verification/queue', { params }),
};
