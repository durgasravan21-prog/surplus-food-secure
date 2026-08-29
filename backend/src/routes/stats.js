import express from 'express';
import { getDb } from '../db/database.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { success } from '../utils/envelope.js';

const router = express.Router();

router.get('/stats/impact', authenticate, (req, res) => {
  const { user_id } = req.query;
  
  let userFilter = '';
  const params = [];
  if (user_id) {
    userFilter = 'WHERE donor_id = ?';
    params.push(user_id);
  }

  const result = getDb().prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN quantity_meals ELSE 0 END), 0) as meals_rescued,
      COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END), 0) as listings_delivered,
      COALESCE(SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END), 0) as listings_expired
    FROM listings
    ${userFilter}
  `).get(...params);

  const meals_rescued = result.meals_rescued;
  const kg_saved = meals_rescued * 0.5;
  const co2e_kg_estimate = kg_saved * 2.5;

  return success(res, {
    meals_rescued,
    kg_saved,
    co2e_kg_estimate,
    listings_delivered: result.listings_delivered,
    listings_expired: result.listings_expired
  });
});

router.get('/admin/dashboard', authenticate, authorize('ADMIN'), (req, res) => {
  const stats = getDb().prepare(`
    SELECT
      COUNT(*) as total_listings,
      COALESCE(SUM(CASE WHEN created_at >= datetime('now', '-1 day') THEN 1 ELSE 0 END), 0) as listings_today,
      COALESCE(SUM(CASE WHEN status IN ('MATCHED', 'DELIVERY_ASSIGNED', 'PARTNER_ARRIVED_PICKUP', 'PICKED_UP', 'DELIVERED') THEN 1 ELSE 0 END), 0) as matched_count,
      COALESCE(SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END), 0) as delivered_count,
      COALESCE(SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END), 0) as expired_count
    FROM listings
  `).get();

  const total_listings = stats.total_listings;
  
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

  const avgTimeStats = getDb().prepare(`
    SELECT COALESCE(AVG((julianday(m.offered_at) - julianday(l.created_at)) * 86400), 0) as avg_time
    FROM listings l
    JOIN match_attempts m ON l.id = m.listing_id
    WHERE l.status IN ('MATCHED', 'DELIVERY_ASSIGNED', 'PARTNER_ARRIVED_PICKUP', 'PICKED_UP', 'DELIVERED')
    AND m.offered_at IS NOT NULL
  `).get();

  const matched_pct = (stats.matched_count / total_listings) * 100;
  const delivered_pct = (stats.delivered_count / total_listings) * 100;
  const expired_pct = (stats.expired_count / total_listings) * 100;
  const avg_time_to_match_seconds = avgTimeStats.avg_time;

  return success(res, {
    listings_today: stats.listings_today,
    total_listings,
    matched_pct,
    delivered_pct,
    expired_pct,
    avg_time_to_match_seconds
  });
});

export default router;
