/**
 * API Routes for matching operations
 */
import express from 'express';
import { getById, updateById, findAll, insert } from '../db/supabase.js';
import { success, badRequest, notFound, forbidden, serverError } from '../utils/envelope.js';
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

router.get('/listings/matched', authenticate, authorize('NGO', 'ADMIN'), async (req, res) => {
  try {
    const [matches, listings, users] = await Promise.all([
      findAll('match_attempts', { ngo_id: req.user.id }),
      findAll('listings'),
      findAll('users')
    ]);
    const activeMatches = matches.filter((m) => ['PENDING', 'ACCEPTED'].includes(m.outcome));
    const listingMap = new Map(listings.map(l => [l.id, l]));
    const userMap = new Map(users.map(u => [u.id, u]));

    const data = activeMatches.map((m) => {
      const listing = listingMap.get(m.listing_id) || {};
      const donor = userMap.get(listing.donor_id) || {};
      return {
        match_id: m.id,
        listing_id: m.listing_id,
        expires_at: m.expires_at,
        distance_km: m.distance_km,
        outcome: m.outcome,
        food_type: listing.food_type,
        quantity_meals: listing.quantity_meals,
        best_before_at: listing.best_before_at,
        status: listing.status,
        donor_name: donor.name || 'Donor'
      };
    });

    return success(res, data);
  } catch (err) {
    return serverError(res, err.message);
  }
});

router.post('/matches/:id/accept', authenticate, authorize('NGO'), requireVerified, idempotency, matchActionLimiter, async (req, res) => {
  try {
    const matchId = req.params.id;
    const match = await getById('match_attempts', matchId);
    
    if (!match) {
      return notFound(res, 'Match attempt not found');
    }

    if (match.ngo_id !== req.user.id) {
      return forbidden(res, 'Not authorized for this match');
    }

    if (match.outcome !== 'PENDING') {
      return badRequest(res, 'Match attempt is no longer pending');
    }

    await updateById('match_attempts', matchId, {
      outcome: 'ACCEPTED',
      responded_at: new Date().toISOString()
    });

    const listing = await getById('listings', match.listing_id);
    if (listing) {
      await updateById('listings', listing.id, { status: 'NGO_ACCEPTED' });
      const updatedListing = await getById('listings', listing.id);

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
  } catch (err) {
    return serverError(res, err.message);
  }
});

router.post('/matches/:id/decline', authenticate, authorize('NGO'), requireVerified, idempotency, matchActionLimiter, async (req, res) => {
  try {
    const matchId = req.params.id;
    const match = await getById('match_attempts', matchId);
    
    if (!match) {
      return notFound(res, 'Match attempt not found');
    }

    if (match.ngo_id !== req.user.id) {
      return forbidden(res, 'Not authorized for this match');
    }

    if (match.outcome !== 'PENDING') {
      return badRequest(res, 'Match attempt is no longer pending');
    }

    await updateById('match_attempts', matchId, {
      outcome: 'DECLINED',
      responded_at: new Date().toISOString()
    });

    const listing = await getById('listings', match.listing_id);
    if (listing) {
      try {
        if (triggerMatching) triggerMatching(listing);
      } catch (e) {
        console.error('Trigger matching failed:', e);
      }
    }

    logAudit(req.user.id, 'MATCH_DECLINED', 'MatchAttempt', matchId, '{}');

    return success(res, { match_id: matchId, status: 'DECLINED' });
  } catch (err) {
    return serverError(res, err.message);
  }
});

router.patch('/ngo/auto-match', authenticate, authorize('NGO'), async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return badRequest(res, 'enabled must be a boolean');
    }

    let profile = await getById('ngo_profiles', req.user.id);
    if (!profile) {
      profile = {
        user_id: req.user.id,
        org_name: req.user.name || 'NGO Shelter',
        reg_no: '80G-DEFAULT',
        address: 'Local City',
        lat: 17.3850,
        lng: 78.4867,
        service_radius_km: 10,
        daily_capacity: 100,
        claimed_today: 0,
        auto_match_enabled: enabled,
        operating_hours_open: '08:00',
        operating_hours_close: '21:00'
      };
      await insert('ngo_profiles', profile);
    } else {
      await updateById('ngo_profiles', req.user.id, { auto_match_enabled: enabled });
    }

    logAudit(req.user.id, 'AUTO_MATCH_TOGGLED', 'NGOProfile', req.user.id, JSON.stringify({ auto_match_enabled: enabled }));

    return success(res, { auto_match_enabled: enabled });
  } catch (err) {
    return serverError(res, err.message);
  }
});

export default router;
