/**
 * API Routes for managing food listings
 */
import express from 'express';
import { z } from 'zod';
import { newId, getById, insert, updateById, findAll } from '../db/supabase.js';
import { success, badRequest, notFound, forbidden, serverError } from '../utils/envelope.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { requireVerified } from '../middleware/requireVerified.js';
import { logAudit } from '../services/audit.js';
import { haversineDistance } from '../utils/haversine.js';
import { triggerMatching } from '../services/matchingEngine.js';
import { triggerDeliveryAssignment } from '../services/deliveryAssignment.js';

const router = express.Router();

const createListingSchema = z.object({
  food_type: z.string().min(1),
  quantity_meals: z.number().int().min(1).max(500),
  perishability: z.enum(['HIGHLY_PERISHABLE', 'MODERATE', 'PACKAGED_SHELF_STABLE']),
  best_before_at: z.string().datetime(),
  pickup_window: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  photo_url: z.string().url().or(z.literal('')).optional().nullable(),
  lat: z.number(),
  lng: z.number(),
  safety_ack: z.boolean().optional(),
});

// POST /listings
router.post('/listings', authenticate, requireVerified, authorize('RESTAURANT', 'INDIVIDUAL_DONOR'), async (req, res) => {
  try {
    const validated = createListingSchema.parse(req.body);

    if (req.user.role === 'INDIVIDUAL_DONOR' && validated.safety_ack !== true) {
      return badRequest(res, 'Safety acknowledgement is required for individual donors.');
    }

    const newListing = {
      id: newId(),
      donor_id: req.user.id,
      food_type: validated.food_type,
      quantity_meals: validated.quantity_meals,
      perishability: validated.perishability,
      best_before_at: validated.best_before_at,
      pickup_window_start: validated.pickup_window.start,
      pickup_window_end: validated.pickup_window.end,
      photo_url: validated.photo_url || null,
      lat: validated.lat,
      lng: validated.lng,
      status: 'LISTED',
      safety_ack: validated.safety_ack ? 1 : 0,
      cancel_reason: null,
      created_at: new Date().toISOString()
    };

    await insert('listings', newListing);
    logAudit(req.user.id, 'LISTING_CREATED', 'Listing', newListing.id, JSON.stringify(newListing));

    triggerMatching(newListing);

    return success(res, newListing, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      return badRequest(res, msg);
    }
    return serverError(res, error.message);
  }
});

// GET /listings/mine
router.get('/listings/mine', authenticate, authorize('RESTAURANT', 'INDIVIDUAL_DONOR', 'ADMIN'), async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    const filter = req.user.role === 'ADMIN' ? {} : { donor_id: req.user.id };
    if (status) filter.status = status;

    const listings = await findAll('listings', filter, 'created_at DESC', parseInt(limit));
    return success(res, listings);
  } catch (error) {
    return serverError(res, error.message);
  }
});

// GET /listings/board
router.get('/listings/board', authenticate, requireVerified, authorize('NGO', 'ADMIN'), async (req, res) => {
  try {
    const { lat, lng, radius_km = 50 } = req.query;
    const userLat = lat ? parseFloat(lat) : 0;
    const userLng = lng ? parseFloat(lng) : 0;
    const maxRadius = parseFloat(radius_km);

    const listings = await findAll('listings', { status: 'LISTED' }, 'best_before_at ASC');

    const result = listings.map((l) => {
      const distance_km = (userLat && userLng)
        ? haversineDistance(userLat, userLng, l.lat || 0, l.lng || 0)
        : 0;
      return { ...l, distance_km };
    }).filter((l) => !maxRadius || l.distance_km <= maxRadius);

    return success(res, result);
  } catch (error) {
    return serverError(res, error.message);
  }
});

// GET /listings/:id
router.get('/listings/:id', authenticate, async (req, res) => {
  try {
    const listing = await getById('listings', req.params.id);
    if (!listing) {
      return notFound(res, 'Listing not found.');
    }
    return success(res, listing);
  } catch (error) {
    return serverError(res, error.message);
  }
});

// POST /listings/:id/cancel
router.post('/listings/:id/cancel', authenticate, async (req, res) => {
  try {
    const { reason } = req.body;
    const listing = await getById('listings', req.params.id);
    if (!listing) return notFound(res, 'Listing not found.');

    if (listing.donor_id !== req.user.id && req.user.role !== 'ADMIN') {
      return forbidden(res, 'You do not have permission to cancel this listing.');
    }

    if (!['LISTED', 'MATCHED_PENDING_NGO_ACCEPT'].includes(listing.status)) {
      return badRequest(res, `Cannot cancel listing in status ${listing.status}`);
    }

    await updateById('listings', listing.id, {
      status: 'CANCELLED',
      cancel_reason: reason || 'Cancelled by donor'
    });

    logAudit(req.user.id, 'LISTING_CANCELLED', 'Listing', listing.id, JSON.stringify({ reason }));

    return success(res, { listing_id: listing.id, status: 'CANCELLED' });
  } catch (error) {
    return serverError(res, error.message);
  }
});

// POST /listings/:id/claim
router.post('/listings/:id/claim', authenticate, requireVerified, authorize('NGO'), async (req, res) => {
  try {
    const listing = await getById('listings', req.params.id);
    if (!listing) return notFound(res, 'Listing not found.');

    if (listing.status !== 'LISTED') {
      return badRequest(res, 'Listing is no longer available to claim.');
    }

    await updateById('listings', listing.id, { status: 'NGO_ACCEPTED' });

    const matchAttempt = {
      id: newId(),
      listing_id: listing.id,
      ngo_id: req.user.id,
      offered_at: new Date().toISOString(),
      expires_at: null,
      responded_at: new Date().toISOString(),
      outcome: 'ACCEPTED',
      distance_km: 0
    };
    await insert('match_attempts', matchAttempt);

    logAudit(req.user.id, 'LISTING_CLAIMED_MANUAL', 'Listing', listing.id, JSON.stringify({ ngo_id: req.user.id }));

    triggerDeliveryAssignment(listing, req.user.id);

    return success(res, { success: true, listing_id: listing.id });
  } catch (error) {
    return serverError(res, error.message);
  }
});

// POST /listings/:id/confirm-receipt
router.post('/listings/:id/confirm-receipt', authenticate, authorize('NGO'), async (req, res) => {
  try {
    const listing = await getById('listings', req.params.id);
    if (!listing) return notFound(res, 'Listing not found.');

    if (!['DELIVERED', 'PICKED_UP'].includes(listing.status)) {
      return badRequest(res, 'Listing must be picked up or delivered before confirming receipt.');
    }

    await updateById('listings', listing.id, { status: 'DELIVERED' });
    logAudit(req.user.id, 'RECEIPT_CONFIRMED', 'Listing', listing.id, '{}');

    return success(res, { success: true });
  } catch (error) {
    return serverError(res, error.message);
  }
});

export default router;
