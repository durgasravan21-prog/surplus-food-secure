import api from './api';
import { v4 as uuidv4 } from 'uuid';

const idempotencyHeader = () => ({ headers: { 'Idempotency-Key': uuidv4() } });

export const matchingService = {
  getMatched: (params) => api.get('/listings/matched', { params }),
  accept: (id) => api.post(`/matches/${id}/accept`, {}, idempotencyHeader()),
  decline: (id) => api.post(`/matches/${id}/decline`, {}, idempotencyHeader()),
  toggleAutoMatch: (enabled) => api.patch('/ngo/auto-match', { enabled }),
};
