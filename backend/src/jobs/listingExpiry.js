import cron from 'node-cron';
import { getDb, updateById } from '../db/database.js';
import { logAudit } from '../services/audit.js';

let broadcast = () => {};

async function loadBroadcast() {
  try {
    const ws = await import('../websocket/index.js');
    broadcast = ws.broadcast || broadcast;
  } catch { /* WebSocket not yet initialised */ }
}

function checkExpiredListings() {
  const now = new Date();
  
  const activeListings = getDb().prepare("SELECT * FROM listings WHERE status NOT IN ('DELIVERED', 'EXPIRED', 'CANCELLED') AND best_before_at IS NOT NULL").all();

  for (const listing of activeListings) {
    if (new Date(listing.best_before_at) > now) continue;

    updateById('listings', listing.id, { status: 'EXPIRED' });

    getDb().prepare(`UPDATE match_attempts SET outcome = 'EXPIRED', responded_at = ? WHERE listing_id = ? AND outcome = 'PENDING'`).run(now.toISOString(), listing.id);

    getDb().prepare(`UPDATE delivery_assignments SET status = 'EXPIRED' WHERE listing_id = ? AND status = 'PENDING'`).run(listing.id);

    logAudit('system', 'LISTING_EXPIRED', 'Listing', listing.id, {
      donor_id: listing.donor_id,
      best_before_at: listing.best_before_at,
    });

    try {
      broadcast(listing.donor_id, 'LISTING_STATUS_CHANGED', {
        listing_id: listing.id,
        status: 'EXPIRED',
      });
    } catch { /* ignore */ }

    console.log(`[ListingExpiry] Listing ${listing.id} expired (best_before: ${listing.best_before_at})`);
  }
}

export function startListingExpiryJob() {
  loadBroadcast();
  cron.schedule('* * * * *', checkExpiredListings);
  console.log('[Jobs] Listing expiry checker started (every 60 seconds)');
}
