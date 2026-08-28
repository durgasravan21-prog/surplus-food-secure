import api from './api';

export const listingsService = {
  create: (data) => api.post('/listings', data),
  getMine: (params) => api.get('/listings/mine', { params }),
  getById: (id) => api.get(`/listings/${id}`),
  cancel: (id, reason) => api.post(`/listings/${id}/cancel`, { reason }),
  getBoard: (params) => api.get('/listings/board', { params }),
  claim: (id) => api.post(`/listings/${id}/claim`),
  confirmReceipt: (id) => api.post(`/listings/${id}/confirm-receipt`),
};
