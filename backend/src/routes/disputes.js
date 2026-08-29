import express from 'express';
import { newId, getById, updateById, insert, getDb } from '../db/database.js';
import { success, notFound } from '../utils/envelope.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { logAudit } from '../services/audit.js';

const router = express.Router();

router.post('/disputes', authenticate, (req, res) => {
  const { listing_id, delivery_id, description, photo_url } = req.body;

  const id = newId();
  insert('disputes', {
    id,
    reporter_id: req.user.id,
    listing_id: listing_id || null,
    delivery_id: delivery_id || null,
    description: description || null,
    photo_url: photo_url || null,
    outcome: null,
    trust_score_delta: 0,
    resolved_by: null,
    created_at: new Date().toISOString(),
    resolved_at: null
  });

  logAudit(req.user.id, 'DISPUTE_CREATED', 'Dispute', id, '{}');
  return success(res, { dispute_id: id });
});

router.get('/admin/disputes', authenticate, authorize('ADMIN'), (req, res) => {
  const { status } = req.query;
  
  let query = 'SELECT * FROM disputes';
  let params = [];
  
  if (status === 'OPEN') {
    query += ' WHERE outcome IS NULL';
  } else if (status === 'RESOLVED') {
    query += ' WHERE outcome IS NOT NULL';
  }

  const allDisputes = getDb().prepare(query).all(...params);
  return success(res, allDisputes);
});

router.post('/admin/disputes/:id/resolve', authenticate, authorize('ADMIN'), (req, res) => {
  const dispute = getById('disputes', req.params.id);

  if (!dispute) {
    return notFound(res, 'Dispute not found');
  }

  const { outcome, trust_score_delta, target_user_id } = req.body;
  
  updateById('disputes', dispute.id, {
    outcome: outcome || null,
    trust_score_delta: trust_score_delta || 0,
    resolved_by: req.user.id,
    resolved_at: new Date().toISOString()
  });

  if (trust_score_delta && trust_score_delta !== 0 && target_user_id) {
    const user = getById('users', target_user_id);
    if (user) {
      const newScore = (user.trust_score || 100) + trust_score_delta;
      updateById('users', user.id, { trust_score: newScore });
    }
  }

  logAudit(req.user.id, 'DISPUTE_RESOLVED', 'Dispute', dispute.id, '{}');
  return success(res, { success: true });
});

export default router;
