/**
 * API Routes for managing food listings
 * Handles creating, updating, retrieving, cancelling, and claiming listings.
 */
import express from 'express';
import { z } from 'zod';
import { newId, getById, insert, getDb } from '../db/database.js';
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

    insert('listings', newListing);

    try {
      logAudit(req.user.id, 'LISTING_CREATED', 'Listing', newListing.id, JSON.stringify({ listing_id: newListing.id }));
      if (triggerMatching) triggerMatching(newListing);
    } catch (err) {
      console.error('Post-creation hooks failed:', err);
    }

    res.status(201);
    return success(res, { listing_id: newListing.id, ...newListing, safety_ack: Boolean(newListing.safety_ack) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return badRequest(res, `Validation failed: ${issues}`);
    }
    return serverError(res, err.message);
  }
});

// GET /listings/mine
router.get('/listings/mine', authenticate, authorize('RESTAURANT', 'INDIVIDUAL_DONOR', 'ADMIN'), (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const statusFilter = req.query.status;
    
    let query = `SELECT * FROM listings`;
    const params = [];
    
    if (req.user.role !== 'ADMIN') {
      query += ` WHERE donor_id = ?`;
      params.push(req.user.id);
      if (statusFilter) {
        query += ` AND status = ?`;
        params.push(statusFilter);
      }
    } else if (statusFilter) {
      query += ` WHERE status = ?`;
      params.push(statusFilter);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);
    
    const listingsArr = getDb().prepare(query).all(...params).map(l => ({ ...l, safety_ack: Boolean(l.safety_ack) }));
    
    return success(res, listingsArr);
  } catch (err) {
    return serverError(res, err.message);
  }
});

// GET /listings/board
router.get('/listings/board', authenticate, requireVerified, authorize('NGO', 'ADMIN'), (req, res) => {
  try {
    const queryLat = parseFloat(req.query.lat);
    const queryLng = parseFloat(req.query.lng);
    const radiusKm = parseFloat(req.query.radius_km) || 50;

    const ngoProfile = getById('ngo_profiles', req.user.id);
    const baseLat = !isNaN(queryLat) ? queryLat : ngoProfile?.lat;
    const baseLng = !isNaN(queryLng) ? queryLng : ngoProfile?.lng;

    const activeMatches = getDb().prepare("SELECT listing_id FROM match_attempts WHERE outcome = 'PENDING'").all();
    const activeMatchListings = new Set(activeMatches.map(m => m.listing_id));

    const dbListings = getDb().prepare("SELECT * FROM listings WHERE status IN ('LISTED', 'MATCHED_PENDING_NGO_ACCEPT')").all();

    let available = dbListings.filter(l => {
      if (l.status === 'LISTED') return true;
      if (l.status === 'MATCHED_PENDING_NGO_ACCEPT' && !activeMatchListings.has(l.id)) return true;
      return false;
    });

    const enriched = available.map(l => {
      let dist = null;
      if (baseLat != null && baseLng != null) {
        dist = haversineDistance(baseLat, baseLng, l.lat, l.lng);
      }
      return { ...l, distance_km: dist, safety_ack: Boolean(l.safety_ack) };
    });

    const filtered = enriched.filter(l => l.distance_km === null || l.distance_km <= radiusKm);
    filtered.sort((a, b) => new Date(a.best_before_at).getTime() - new Date(b.best_before_at).getTime());

    return success(res, filtered);
  } catch (err) {
    return serverError(res, err.message);
  }
});

// GET /listings/:id
router.get('/listings/:id', authenticate, (req, res) => {
  try {
    const listing = getById('listings', req.params.id);
    if (!listing) {
      return notFound(res, 'Listing not found');
    }
    return success(res, { ...listing, safety_ack: Boolean(listing.safety_ack) });
  } catch (err) {
    return serverError(res, err.message);
  }
});

// POST /listings/:id/cancel
router.post('/listings/:id/cancel', authenticate, (req, res) => {
  try {
    const { reason } = req.body;
    const listing = getById('listings', req.params.id);
    
    if (!listing) {
      return notFound(res, 'Listing not found');
    }
    if (req.user.role !== 'ADMIN' && listing.donor_id !== req.user.id) {
      return forbidden(res, 'Not authorized to cancel this listing');
    }

    const result = getDb().prepare(`
      UPDATE listings 
      SET status = 'CANCELLED', cancel_reason = ? 
      WHERE id = ? AND status IN ('LISTED', 'MATCHED_PENDING_NGO_ACCEPT')
    `).run(reason || null, req.params.id);

    if (result.changes === 0) {
      return badRequest(res, 'Listing cannot be cancelled in its current state');
    }

    logAudit(req.user.id, 'LISTING_CANCELLED', 'Listing', req.params.id, JSON.stringify({ reason }));

    return success(res, { listing_id: req.params.id, status: 'CANCELLED' });
  } catch (err) {
    return serverError(res, err.message);
  }
});

// POST /listings/:id/claim
router.post('/listings/:id/claim', authenticate, authorize('NGO'), requireVerified, (req, res) => {
  try {
    const listingId = req.params.id;
    const listing = getById('listings', listingId);
    
    if (!listing) {
      return notFound(res, 'Listing not found');
    }

    const result = getDb().prepare(`
      UPDATE listings 
      SET status = 'NGO_ACCEPTED' 
      WHERE id = ? AND status = 'LISTED'
    `).run(listingId);

    if (result.changes === 0) {
      return badRequest(res, 'Listing is no longer available');
    }

    const ngoProfile = getById('ngo_profiles', req.user.id);
    let dist = null;
    if (ngoProfile?.lat != null && ngoProfile?.lng != null) {
      dist = haversineDistance(listing.lat, listing.lng, ngoProfile.lat, ngoProfile.lng);
    }

    const matchAttemptId = newId();
    const now = new Date().toISOString();
    
    insert('match_attempts', {
      id: matchAttemptId,
      listing_id: listingId,
      ngo_id: req.user.id,
      offered_at: now,
      expires_at: null,
      responded_at: now,
      outcome: 'ACCEPTED',
      distance_km: dist
    });

    try {
      // Need to re-fetch listing to get the updated status before triggering
      const updatedListing = getById('listings', listingId);
      if (triggerDeliveryAssignment) triggerDeliveryAssignment(updatedListing, req.user.id);
      logAudit(req.user.id, 'LISTING_CLAIMED_MANUAL', 'MatchAttempt', matchAttemptId, JSON.stringify({ listing_id: listingId }));
    } catch (err) {
      console.error('Post-claim hooks failed:', err);
    }

    return success(res, { success: true, listing_id: listingId });
  } catch (err) {
    return serverError(res, err.message);
  }
});

// POST /listings/:id/confirm-receipt
router.post('/listings/:id/confirm-receipt', authenticate, authorize('NGO'), (req, res) => {
  try {
    const listingId = req.params.id;
    
    const result = getDb().prepare(`
      UPDATE listings 
      SET status = 'DELIVERED' 
      WHERE id = ? AND status IN ('DELIVERED', 'PICKED_UP')
    `).run(listingId);

    if (result.changes === 0) {
      return badRequest(res, 'Listing not in a valid state for receipt confirmation');
    }

    logAudit(req.user.id, 'RECEIPT_CONFIRMED', 'Listing', listingId, '{}');

    return success(res, { success: true });
  } catch (err) {
    return serverError(res, err.message);
  }
});

export default router;
