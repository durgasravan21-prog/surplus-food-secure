import cron from 'node-cron';
import { findAll, updateById, updateByColumn } from '../db/supabase.js';
import { logAudit } from '../services/audit.js';

let broadcast = () => {};

async function loadBroadcast() {
  try {
    const ws = await import('../websocket/index.js');
    broadcast = ws.broadcast || broadcast;
  } catch { /* WebSocket not yet initialised */ }
}

async function checkExpiredListings() {
  try {
    const now = new Date();
    const activeListings = await findAll('listings');

    for (const listing of activeListings) {
      if (['DELIVERED', 'EXPIRED', 'CANCELLED'].includes(listing.status)) continue;
      if (!listing.best_before_at) continue;

      if (new Date(listing.best_before_at) > now) continue;

      await updateById('listings', listing.id, { status: 'EXPIRED' });

      logAudit('system', 'LISTING_EXPIRED', 'Listing', listing.id, JSON.stringify({
        donor_id: listing.donor_id,
        best_before_at: listing.best_before_at,
      }));

      try {
        broadcast(listing.donor_id, 'LISTING_STATUS_CHANGED', {
          listing_id: listing.id,
          status: 'EXPIRED',
        });
      } catch { /* ignore */ }

      console.log(`[ListingExpiry] Listing ${listing.id} expired (best_before: ${listing.best_before_at})`);
    }
  } catch (err) {
    console.error('[ListingExpiry] Error running listing expiry job:', err.message);
  }
}

export function startListingExpiryJob() {
  loadBroadcast();
  cron.schedule('* * * * *', checkExpiredListings);
  console.log('[Jobs] Listing expiry checker started (every 60 seconds)');
}
