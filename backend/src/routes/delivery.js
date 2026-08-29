import express from 'express';
import { getById, updateById, findAll } from '../db/supabase.js';
import { success, notFound, forbidden, badRequest, serverError } from '../utils/envelope.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { requireVerified } from '../middleware/requireVerified.js';
import { logAudit } from '../services/audit.js';
import { broadcast } from '../websocket/index.js';

const router = express.Router();

router.post('/delivery/:id/status', authenticate, requireVerified, authorize('DELIVERY_PARTNER'), async (req, res) => {
  try {
    const assignment = await getById('delivery_assignments', req.params.id);
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

    await updateById('delivery_assignments', assignment.id, { status });

    const listing = await getById('listings', assignment.listing_id);
    if (listing) {
      await updateById('listings', listing.id, { status });
      try {
        broadcast(listing.donor_id, 'LISTING_STATUS_CHANGED', { listing_id: listing.id, status });
      } catch (e) {
        console.error('Failed to broadcast', e);
      }
    }

    logAudit(req.user.id, 'DELIVERY_STATUS_UPDATED', 'DeliveryAssignment', assignment.id, JSON.stringify({ status }));
    return success(res, { id: assignment.id, status });
  } catch (err) {
    return serverError(res, err.message);
  }
});

router.post('/delivery/:id/photo', authenticate, requireVerified, authorize('DELIVERY_PARTNER'), async (req, res) => {
  try {
    const assignment = await getById('delivery_assignments', req.params.id);
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
    
    await updateById('delivery_assignments', assignment.id, updates);

    logAudit(req.user.id, 'DELIVERY_PHOTO_UPLOADED', 'DeliveryAssignment', assignment.id, JSON.stringify({ stage }));
    return success(res, { success: true, file_url });
  } catch (err) {
    return serverError(res, err.message);
  }
});

router.post('/delivery/:id/no-show', authenticate, async (req, res) => {
  try {
    const assignment = await getById('delivery_assignments', req.params.id);
    const { flagged_role, notes } = req.body;

    if (!assignment) {
      return notFound(res, 'Assignment not found');
    }

    let flagged_user_id = null;
    const listing = await getById('listings', assignment.listing_id);
    
    if (flagged_role === 'DONOR') {
      flagged_user_id = listing ? listing.donor_id : null;
    } else if (flagged_role === 'DELIVERY_PARTNER') {
      flagged_user_id = assignment.partner_id;
    } else if (flagged_role === 'NGO') {
      const matches = await findAll('match_attempts', { listing_id: assignment.listing_id, outcome: 'ACCEPTED' });
      flagged_user_id = matches[0]?.ngo_id || null;
    }

    const metadata = assignment.metadata ? (typeof assignment.metadata === 'string' ? JSON.parse(assignment.metadata) : assignment.metadata) : {};
    if (!metadata.no_shows) {
      metadata.no_shows = [];
    }
    metadata.no_shows.push({ reporter_id: req.user.id, flagged_role, flagged_user_id, notes, created_at: Date.now() });
    
    await updateById('delivery_assignments', assignment.id, { metadata: JSON.stringify(metadata) });

    if (flagged_user_id) {
      const user = await getById('users', flagged_user_id);
      if (user) {
        const newScore = (user.trust_score || 100) - 5;
        await updateById('users', user.id, { 
          trust_score: newScore,
          suspended: newScore < 50
        });
      }
    }

    logAudit(req.user.id, 'NO_SHOW_REPORTED', 'DeliveryAssignment', assignment.id, JSON.stringify({ flagged_role }));
    return success(res, { success: true });
  } catch (err) {
    return serverError(res, err.message);
  }
});

router.post('/delivery/:id/self-arrange', authenticate, authorize('NGO'), async (req, res) => {
  try {
    const assignment = await getById('delivery_assignments', req.params.id);
    
    if (!assignment) {
      return notFound(res, 'Assignment not found');
    }

    const listing = await getById('listings', assignment.listing_id);
    if (!listing) {
      return notFound(res, 'Listing not found');
    }

    const matches = await findAll('match_attempts', { listing_id: listing.id, outcome: 'ACCEPTED' });
    const match = matches[0];

    if (!match || match.ngo_id !== req.user.id) {
      return forbidden(res, 'Not your match');
    }

    await updateById('listings', listing.id, { status: 'PICKED_UP' });
    await updateById('delivery_assignments', assignment.id, { status: 'SELF_ARRANGED' });

    logAudit(req.user.id, 'SELF_ARRANGE', 'DeliveryAssignment', assignment.id, '{}');
    return success(res, { success: true });
  } catch (err) {
    return serverError(res, err.message);
  }
});

export default router;
