import api from './api';
import { v4 as uuidv4 } from 'uuid';

const idempotencyHeader = () => ({ headers: { 'Idempotency-Key': uuidv4() } });

export const deliveryService = {
  getPendingOffers: () => api.get('/delivery-offers/pending'),
  acceptOffer: (id) => api.post(`/delivery-offers/${id}/accept`, {}, idempotencyHeader()),
  declineOffer: (id) => api.post(`/delivery-offers/${id}/decline`, {}, idempotencyHeader()),
  updateStatus: (id, status) => api.post(`/delivery/${id}/status`, { status }),
  uploadPhoto: (id, stage, fileUrl) =>
    api.post(`/delivery/${id}/photo`, { stage, file_url: fileUrl }),
  reportNoShow: (id, flaggedRole, notes) =>
    api.post(`/delivery/${id}/no-show`, { flagged_role: flaggedRole, notes }),
  selfArrange: (id) => api.post(`/delivery/${id}/self-arrange`),
};
