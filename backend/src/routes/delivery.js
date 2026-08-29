import express from 'express';
import { getById, updateById, getDb } from '../db/database.js';
import { success, notFound, forbidden, badRequest } from '../utils/envelope.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { requireVerified } from '../middleware/requireVerified.js';
import { logAudit } from '../services/audit.js';
import { broadcast } from '../websocket/index.js';

const router = express.Router();

router.post('/delivery/:id/status', authenticate, requireVerified, authorize('DELIVERY_PARTNER'), (req, res) => {
  const assignment = getById('delivery_assignments', req.params.id);
  const { status } = req.body;

  if (!assignment) {
    return notFound(res, 'Assignment not found');
  }

  if (assignment.partner_id !== req.user.id) {
    return forbidden(res, 'Not your assignment');
  }

  const validStatuses = ['PARTNER_ARRIVED_PICKUP', 'PICKED_UP', 'DELIVERED'];
  if (!validStatuses.includes(status)) {
    return badRequest(res, 'Invalid status');
  }

  const transitions = {
    'ACCEPTED': 'PARTNER_ARRIVED_PICKUP',
    'PARTNER_ARRIVED_PICKUP': 'PICKED_UP',
    'PICKED_UP': 'DELIVERED'
  };

  if (transitions[assignment.status] !== status) {
    return badRequest(res, 'Invalid state transition');
  }

  if (status === 'DELIVERED' && !assignment.dropoff_photo_url) {
    return badRequest(res, 'Proof photo required before marking delivered');
  }

  updateById('delivery_assignments', assignment.id, { status });

  const listing = getById('listings', assignment.listing_id);
  if (listing) {
    updateById('listings', listing.id, { status });
    try {
      broadcast(listing.donor_id, 'LISTING_STATUS_CHANGED', { listing_id: listing.id, status });
    } catch (e) {
      console.error('Failed to broadcast', e);
    }
  }

  logAudit(req.user.id, 'DELIVERY_STATUS_UPDATED', 'DeliveryAssignment', assignment.id, JSON.stringify({ status }));
  return success(res, { id: assignment.id, status });
});

router.post('/delivery/:id/photo', authenticate, requireVerified, authorize('DELIVERY_PARTNER'), (req, res) => {
  const assignment = getById('delivery_assignments', req.params.id);
  const { stage, file_url } = req.body;

  if (!assignment) {
    return notFound(res, 'Assignment not found');
  }

  if (assignment.partner_id !== req.user.id) {
    return forbidden(res, 'Not your assignment');
  }

  const updates = {};
  if (stage === 'PICKUP') {
    updates.pickup_photo_url = file_url;
  } else if (stage === 'DROPOFF') {
    updates.dropoff_photo_url = file_url;
  } else {
    return badRequest(res, 'Invalid stage');
  }
  
  updateById('delivery_assignments', assignment.id, updates);

  logAudit(req.user.id, 'DELIVERY_PHOTO_UPLOADED', 'DeliveryAssignment', assignment.id, JSON.stringify({ stage }));
  return success(res, { success: true, file_url });
});

router.post('/delivery/:id/no-show', authenticate, (req, res) => {
  const assignment = getById('delivery_assignments', req.params.id);
  const { flagged_role, notes } = req.body;

  if (!assignment) {
    return notFound(res, 'Assignment not found');
  }

  let flagged_user_id = null;
  const listing = getById('listings', assignment.listing_id);
  
  if (flagged_role === 'DONOR') {
    flagged_user_id = listing ? listing.donor_id : null;
  } else if (flagged_role === 'DELIVERY_PARTNER') {
    flagged_user_id = assignment.partner_id;
  } else if (flagged_role === 'NGO') {
    const match = getDb().prepare('SELECT ngo_id FROM match_attempts WHERE listing_id = ? AND outcome = \'ACCEPTED\'').get(assignment.listing_id);
    flagged_user_id = match ? match.ngo_id : null;
  }

  const metadata = assignment.metadata ? JSON.parse(assignment.metadata) : {};
  if (!metadata.no_shows) {
    metadata.no_shows = [];
  }
  metadata.no_shows.push({ reporter_id: req.user.id, flagged_role, flagged_user_id, notes, created_at: Date.now() });
  
  updateById('delivery_assignments', assignment.id, { metadata: JSON.stringify(metadata) });

  if (flagged_user_id) {
    const user = getById('users', flagged_user_id);
    if (user) {
      const newScore = (user.trust_score || 100) - 5;
      updateById('users', user.id, { 
        trust_score: newScore,
        suspended: newScore < 50 ? 1 : user.suspended
      });
    }
  }

  logAudit(req.user.id, 'NO_SHOW_REPORTED', 'DeliveryAssignment', assignment.id, JSON.stringify({ flagged_role }));
  return success(res, { success: true });
});

router.post('/delivery/:id/self-arrange', authenticate, authorize('NGO'), (req, res) => {
  const assignment = getById('delivery_assignments', req.params.id);
  
  if (!assignment) {
    return notFound(res, 'Assignment not found');
  }

  const listing = getById('listings', assignment.listing_id);
  if (!listing) {
    return notFound(res, 'Listing not found');
  }

  const match = getDb().prepare('SELECT ngo_id FROM match_attempts WHERE listing_id = ? AND outcome = \'ACCEPTED\'').get(listing.id);
  if (!match || match.ngo_id !== req.user.id) {
    return forbidden(res, 'Not your match');
  }

  updateById('listings', listing.id, { status: 'PICKED_UP' });
  updateById('delivery_assignments', assignment.id, { status: 'SELF_ARRANGED' });

  logAudit(req.user.id, 'SELF_ARRANGE', 'DeliveryAssignment', assignment.id, '{}');
  return success(res, { success: true });
});

export default router;
