import express from 'express';
import { getById, updateById, getDb } from '../db/database.js';
import { success, notFound, forbidden, badRequest } from '../utils/envelope.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { idempotency } from '../middleware/idempotency.js';
import { logAudit } from '../services/audit.js';
import { broadcast } from '../websocket/index.js';
import { triggerDeliveryAssignment } from '../services/deliveryAssignment.js';

const router = express.Router();

router.get('/delivery-offers/pending', authenticate, authorize('DELIVERY_PARTNER', 'ADMIN'), (req, res) => {
  const query = `
    SELECT d.id, d.listing_id, d.distance_km, d.expires_at,
           l.food_type, l.quantity_meals, l.lat as pickup_lat, l.lng as pickup_lng
    FROM delivery_assignments d
    LEFT JOIN listings l ON d.listing_id = l.id
    WHERE d.partner_id = ? AND d.status = 'PENDING'
  `;
  const data = getDb().prepare(query).all(req.user.id);
  return success(res, data);
});

router.post('/delivery-offers/:id/accept', authenticate, authorize('DELIVERY_PARTNER'), idempotency, (req, res) => {
  const assignment = getById('delivery_assignments', req.params.id);

  if (!assignment) {
    return notFound(res, 'Assignment not found');
  }

  if (assignment.partner_id !== req.user.id) {
    return forbidden(res, 'Not your assignment');
  }

  if (assignment.status !== 'PENDING') {
    return badRequest(res, 'Assignment is not pending');
  }

  updateById('delivery_assignments', assignment.id, { status: 'ACCEPTED' });

  const listing = getById('listings', assignment.listing_id);
  if (listing) {
    updateById('listings', listing.id, { status: 'DELIVERY_ASSIGNED' });
    
    try {
      broadcast(listing.donor_id, 'LISTING_STATUS_CHANGED', { listing_id: listing.id, status: 'DELIVERY_ASSIGNED' });
    } catch (e) {
      console.error('Failed to broadcast', e);
    }
  }

  logAudit(req.user.id, 'DELIVERY_OFFER_ACCEPTED', 'DeliveryAssignment', assignment.id, '{}');
  return success(res, { id: assignment.id, status: 'DELIVERY_ASSIGNED' });
});

router.post('/delivery-offers/:id/decline', authenticate, authorize('DELIVERY_PARTNER'), idempotency, (req, res) => {
  const assignment = getById('delivery_assignments', req.params.id);

  if (!assignment) {
    return notFound(res, 'Assignment not found');
  }

  if (assignment.partner_id !== req.user.id) {
    return forbidden(res, 'Not your assignment');
  }

  if (assignment.status !== 'PENDING') {
    return badRequest(res, 'Assignment is not pending');
  }

  updateById('delivery_assignments', assignment.id, { status: 'DECLINED' });

  try {
    const listing = getById('listings', assignment.listing_id);
    if (listing) {
      triggerDeliveryAssignment(listing);
    }
  } catch (e) {
    console.error('Failed to trigger delivery assignment', e);
  }

  logAudit(req.user.id, 'DELIVERY_OFFER_DECLINED', 'DeliveryAssignment', assignment.id, '{}');
  return success(res, { id: assignment.id, status: 'DECLINED' });
});

export default router;
