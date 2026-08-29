/**
 * API Routes for matching operations
 * Handles retrieving match attempts, accepting/declining, and configuring auto-match.
 */
import express from 'express';
import { getById, updateById, getDb } from '../db/database.js';
import { success, badRequest, notFound, forbidden } from '../utils/envelope.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { requireVerified } from '../middleware/requireVerified.js';
import { idempotency } from '../middleware/idempotency.js';
import { matchActionLimiter } from '../middleware/rateLimiter.js';
import { logAudit } from '../services/audit.js';
import { triggerDeliveryAssignment } from '../services/deliveryAssignment.js';
import { triggerMatching } from '../services/matchingEngine.js';
import { broadcast } from '../websocket/index.js';

const router = express.Router();

router.get('/listings/matched', authenticate, authorize('NGO', 'ADMIN'), (req, res) => {
  const query = `
    SELECT m.id as match_id, m.listing_id, m.expires_at, m.distance_km, m.outcome,
           l.food_type, l.quantity_meals, l.best_before_at, l.status,
           u.name as donor_name
    FROM match_attempts m
    JOIN listings l ON m.listing_id = l.id
    JOIN users u ON l.donor_id = u.id
    WHERE m.ngo_id = ? AND m.outcome IN ('PENDING', 'ACCEPTED')
  `;
  const data = getDb().prepare(query).all(req.user.id);
  return success(res, data);
});

router.post('/matches/:id/accept', authenticate, authorize('NGO'), requireVerified, idempotency, matchActionLimiter, (req, res) => {
  const matchId = req.params.id;
  const match = getById('match_attempts', matchId);
  
  if (!match) {
    return notFound(res, 'Match attempt not found');
  }

  if (match.ngo_id !== req.user.id) {
    return forbidden(res, 'Not authorized for this match');
  }

  const result = getDb().prepare(`
    UPDATE match_attempts 
    SET outcome = 'ACCEPTED', responded_at = ? 
    WHERE id = ? AND outcome = 'PENDING'
  `).run(new Date().toISOString(), matchId);

  if (result.changes === 0) {
    return badRequest(res, 'Match attempt is no longer pending');
  }

  const listing = getById('listings', match.listing_id);
  if (listing) {
    getDb().prepare(`UPDATE listings SET status = 'NGO_ACCEPTED' WHERE id = ?`).run(listing.id);
    
    // Fetch updated listing for hooks
    const updatedListing = getById('listings', listing.id);

    try {
      if (triggerDeliveryAssignment) triggerDeliveryAssignment(updatedListing, req.user.id);
      if (broadcast) {
        broadcast(listing.donor_id, 'LISTING_STATUS_CHANGED', { listing_id: listing.id, status: 'NGO_ACCEPTED' });
      }
    } catch (e) {
      console.error('Post-accept hooks failed:', e);
    }
  }

  logAudit(req.user.id, 'MATCH_ACCEPTED', 'MatchAttempt', matchId, '{}');

  return success(res, { match_id: matchId, status: 'NGO_ACCEPTED' });
});

router.post('/matches/:id/decline', authenticate, authorize('NGO'), requireVerified, idempotency, matchActionLimiter, (req, res) => {
  const matchId = req.params.id;
  const match = getById('match_attempts', matchId);
  
  if (!match) {
    return notFound(res, 'Match attempt not found');
  }

  if (match.ngo_id !== req.user.id) {
    return forbidden(res, 'Not authorized for this match');
  }

  const result = getDb().prepare(`
    UPDATE match_attempts 
    SET outcome = 'DECLINED', responded_at = ? 
    WHERE id = ? AND outcome = 'PENDING'
  `).run(new Date().toISOString(), matchId);

  if (result.changes === 0) {
    return badRequest(res, 'Match attempt is no longer pending');
  }

  const listing = getById('listings', match.listing_id);
  if (listing) {
    try {
      if (triggerMatching) triggerMatching(listing);
    } catch (e) {
      console.error('Trigger matching failed:', e);
    }
  }

  logAudit(req.user.id, 'MATCH_DECLINED', 'MatchAttempt', matchId, '{}');

  return success(res, { match_id: matchId, status: 'DECLINED' });
});

router.patch('/ngo/auto-match', authenticate, authorize('NGO'), requireVerified, (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return badRequest(res, 'enabled must be a boolean');
  }

  const profile = getById('ngo_profiles', req.user.id);
  if (!profile) {
    return notFound(res, 'NGO profile not found');
  }

  updateById('ngo_profiles', req.user.id, { auto_match_enabled: enabled ? 1 : 0 });

  logAudit(req.user.id, 'AUTO_MATCH_TOGGLED', 'NGOProfile', req.user.id, JSON.stringify({ auto_match_enabled: enabled }));

  return success(res, { auto_match_enabled: enabled });
});

export default router;
