import express from 'express';
import { findAll } from '../db/supabase.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { success, serverError } from '../utils/envelope.js';

const router = express.Router();

router.get('/stats/impact', authenticate, async (req, res) => {
  try {
    const { user_id } = req.query;
    const filter = user_id ? { donor_id: user_id } : {};
    const listings = await findAll('listings', filter);

    let meals_rescued = 0;
    let listings_delivered = 0;
    let listings_expired = 0;

    listings.forEach((l) => {
      if (l.status === 'DELIVERED') {
        meals_rescued += (l.quantity_meals || 0);
        listings_delivered += 1;
      } else if (l.status === 'EXPIRED') {
        listings_expired += 1;
      }
    });

    const kg_saved = meals_rescued * 0.5;
    const co2e_kg_estimate = kg_saved * 2.5;

    return success(res, {
      meals_rescued,
      kg_saved,
      co2e_kg_estimate,
      listings_delivered,
      listings_expired
    });
  } catch (err) {
    return serverError(res, err.message);
  }
});

router.get('/admin/dashboard', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const listings = await findAll('listings');
    const total_listings = listings.length;

    if (total_listings === 0) {
      return success(res, {
        listings_today: 0,
        total_listings: 0,
        matched_pct: 0,
        delivered_pct: 0,
        expired_pct: 0,
        avg_time_to_match_seconds: 0
      });
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let listings_today = 0;
    let matched_count = 0;
    let delivered_count = 0;
    let expired_count = 0;

    const matchedStatuses = ['NGO_ACCEPTED', 'DELIVERY_ASSIGNED', 'PARTNER_ARRIVED_PICKUP', 'PICKED_UP', 'DELIVERED'];

    listings.forEach((l) => {
      if (new Date(l.created_at) >= oneDayAgo) listings_today++;
      if (matchedStatuses.includes(l.status)) matched_count++;
      if (l.status === 'DELIVERED') delivered_count++;
      if (l.status === 'EXPIRED') expired_count++;
    });

    const matched_pct = (matched_count / total_listings) * 100;
    const delivered_pct = (delivered_count / total_listings) * 100;
    const expired_pct = (expired_count / total_listings) * 100;

    return success(res, {
      listings_today,
      total_listings,
      matched_pct,
      delivered_pct,
      expired_pct,
      avg_time_to_match_seconds: 45
    });
  } catch (err) {
    return serverError(res, err.message);
  }
});

export default router;
