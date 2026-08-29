import cron from 'node-cron';
import { getDb, updateById } from '../db/database.js';
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

function checkUnmatchedListings() {
  if (!triggerMatching) return;

  const now = Date.now();
  const FIVE_MIN = 5 * 60 * 1000;

  const listings = getDb().prepare("SELECT * FROM listings WHERE status = 'LISTED'").all();

  for (const listing of listings) {
    const age = now - new Date(listing.created_at).getTime();
    if (age < FIVE_MIN) continue;

    const steps = Math.min(Math.floor(age / FIVE_MIN), 3);
    const radiusBoost = steps * 2;

    const excludedMatches = getDb().prepare("SELECT ngo_id FROM match_attempts WHERE listing_id = ?").all(listing.id);
    const excludedNgos = excludedMatches.map(m => m.ngo_id);

    console.log(`[RadiusWiden] Listing ${listing.id} unmatched for ${Math.floor(age/60000)}m, widening by +${radiusBoost}km`);

    triggerMatching(listing, excludedNgos);

    logAudit('system', 'RADIUS_WIDENED', 'Listing', listing.id, {
      age_minutes: Math.floor(age / 60000),
      radius_boost_km: radiusBoost,
    });
  }
}

export function startRadiusWidenJob() {
  loadDependencies().then(() => {
    cron.schedule('*/2 * * * *', checkUnmatchedListings);
    console.log('[Jobs] Radius auto-widen started (every 2 minutes)');
  });
}
