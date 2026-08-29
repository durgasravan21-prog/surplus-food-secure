import express from 'express';
import { getById, updateById, findAll } from '../db/supabase.js';
import { success, notFound, forbidden, badRequest, serverError } from '../utils/envelope.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { idempotency } from '../middleware/idempotency.js';
import { logAudit } from '../services/audit.js';
import { broadcast } from '../websocket/index.js';
import { triggerDeliveryAssignment } from '../services/deliveryAssignment.js';

const router = express.Router();

router.get('/delivery-offers/pending', authenticate, authorize('DELIVERY_PARTNER', 'ADMIN'), async (req, res) => {
  try {
    const assignments = await findAll('delivery_assignments', { partner_id: req.user.id, status: 'PENDING' });
    const listings = await findAll('listings');
    const listingMap = new Map(listings.map(l => [l.id, l]));

    const data = assignments.map((d) => {
      const listing = listingMap.get(d.listing_id) || {};
      return {
        id: d.id,
        listing_id: d.listing_id,
        distance_km: d.distance_km,
        expires_at: d.expires_at,
        food_type: listing.food_type,
        quantity_meals: listing.quantity_meals,
        pickup_lat: listing.lat,
        pickup_lng: listing.lng
      };
    });

    return success(res, data);
  } catch (err) {
    return serverError(res, err.message);
  }
});

router.post('/delivery-offers/:id/accept', authenticate, authorize('DELIVERY_PARTNER'), idempotency, async (req, res) => {
  try {
    const assignment = await getById('delivery_assignments', req.params.id);

    if (!assignment) {
      return notFound(res, 'Assignment not found');
    }

    if (assignment.partner_id !== req.user.id) {
      return forbidden(res, 'Not your assignment');
    }

    if (assignment.status !== 'PENDING') {
      return badRequest(res, 'Assignment is not pending');
    }

    await updateById('delivery_assignments', assignment.id, { status: 'ACCEPTED' });

    const listing = await getById('listings', assignment.listing_id);
    if (listing) {
      await updateById('listings', listing.id, { status: 'DELIVERY_ASSIGNED' });
      
      try {
        broadcast(listing.donor_id, 'LISTING_STATUS_CHANGED', { listing_id: listing.id, status: 'DELIVERY_ASSIGNED' });
      } catch (e) {
        console.error('Failed to broadcast', e);
      }
    }

    logAudit(req.user.id, 'DELIVERY_OFFER_ACCEPTED', 'DeliveryAssignment', assignment.id, '{}');
    return success(res, { id: assignment.id, status: 'DELIVERY_ASSIGNED' });
  } catch (err) {
    return serverError(res, err.message);
  }
});

router.post('/delivery-offers/:id/decline', authenticate, authorize('DELIVERY_PARTNER'), idempotency, async (req, res) => {
  try {
    const assignment = await getById('delivery_assignments', req.params.id);

    if (!assignment) {
      return notFound(res, 'Assignment not found');
    }

    if (assignment.partner_id !== req.user.id) {
      return forbidden(res, 'Not your assignment');
    }

    if (assignment.status !== 'PENDING') {
      return badRequest(res, 'Assignment is not pending');
    }

    await updateById('delivery_assignments', assignment.id, { status: 'DECLINED' });

    try {
      const listing = await getById('listings', assignment.listing_id);
      if (listing) {
        triggerDeliveryAssignment(listing, assignment.match_ngo_id);
      }
    } catch (e) {
      console.error('Failed to trigger delivery assignment', e);
    }

    logAudit(req.user.id, 'DELIVERY_OFFER_DECLINED', 'DeliveryAssignment', assignment.id, '{}');
    return success(res, { id: assignment.id, status: 'DECLINED' });
  } catch (err) {
    return serverError(res, err.message);
  }
});

export default router;
