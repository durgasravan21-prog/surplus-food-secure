import cron from 'node-cron';
import { findAll } from '../db/supabase.js';
import { logAudit } from '../services/audit.js';

let triggerMatching = null;

async function loadDependencies() {
  try {
    const mod = await import('../services/matchingEngine.js');
    triggerMatching = mod.triggerMatching;
  } catch (e) {
    console.warn('[RadiusWiden] Could not load matchingEngine:', e.message);
  }
}

async function checkUnmatchedListings() {
  try {
    if (!triggerMatching) return;

    const now = Date.now();
    const FIVE_MIN = 5 * 60 * 1000;

    const listings = await findAll('listings', { status: 'LISTED' });

    for (const listing of listings) {
      const age = now - new Date(listing.created_at).getTime();
      if (age < FIVE_MIN) continue;

      const steps = Math.min(Math.floor(age / FIVE_MIN), 3);
      const radiusBoost = steps * 2;

      const matches = await findAll('match_attempts', { listing_id: listing.id });
      const excludedNgos = matches.map(m => m.ngo_id);

      console.log(`[RadiusWiden] Listing ${listing.id} unmatched for ${Math.floor(age/60000)}m, widening by +${radiusBoost}km`);

      triggerMatching(listing, excludedNgos);

      logAudit('system', 'RADIUS_WIDENED', 'Listing', listing.id, JSON.stringify({
        age_minutes: Math.floor(age / 60000),
        radius_boost_km: radiusBoost,
      }));
    }
  } catch (err) {
    console.error('[RadiusWiden] Error widening search radius:', err.message);
  }
}

export function startRadiusWidenJob() {
  loadDependencies().then(() => {
    cron.schedule('*/2 * * * *', checkUnmatchedListings);
    console.log('[Jobs] Radius auto-widen started (every 2 minutes)');
  });
}
