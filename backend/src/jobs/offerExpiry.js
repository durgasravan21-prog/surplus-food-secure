import cron from 'node-cron';
import { findAll, updateById, getById } from '../db/supabase.js';
import { logAudit } from '../services/audit.js';

let triggerMatching = null;
let triggerDeliveryAssignment = null;

async function loadDependencies() {
  try {
    const matchingMod = await import('../services/matchingEngine.js');
    triggerMatching = matchingMod.triggerMatching;
  } catch (e) {
    console.warn('[OfferExpiry] Could not load matchingEngine:', e.message);
  }
  try {
    const deliveryMod = await import('../services/deliveryAssignment.js');
    triggerDeliveryAssignment = deliveryMod.triggerDeliveryAssignment;
  } catch (e) {
    console.warn('[OfferExpiry] Could not load deliveryAssignment:', e.message);
  }
}

async function checkExpiredOffers() {
  try {
    const now = new Date();

    const pendingMatches = await findAll('match_attempts', { outcome: 'PENDING' });
    
    for (const match of pendingMatches) {
      if (!match.expires_at) continue;
      if (new Date(match.expires_at) > now) continue;

      await updateById('match_attempts', match.id, { outcome: 'EXPIRED', responded_at: now.toISOString() });

      logAudit('system', 'MATCH_OFFER_EXPIRED', 'MatchAttempt', match.id, JSON.stringify({
        listing_id: match.listing_id,
        ngo_id: match.ngo_id,
      }));

      console.log(`[OfferExpiry] Match ${match.id} expired for NGO ${match.ngo_id}`);

      if (triggerMatching) {
        const listing = await getById('listings', match.listing_id);
        if (listing && listing.status === 'MATCHED_PENDING_NGO_ACCEPT') {
          await updateById('listings', listing.id, { status: 'LISTED' });

          const allMatches = await findAll('match_attempts', { listing_id: listing.id });
          const excludedNgos = allMatches.filter(m => m.outcome !== 'PENDING').map(m => m.ngo_id);
          
          triggerMatching(listing, excludedNgos);
        }
      }
    }

    const pendingDeliveries = await findAll('delivery_assignments', { status: 'PENDING' });
    
    for (const assignment of pendingDeliveries) {
      if (!assignment.expires_at) continue;
      if (new Date(assignment.expires_at) > now) continue;

      await updateById('delivery_assignments', assignment.id, { status: 'EXPIRED' });

      logAudit('system', 'DELIVERY_OFFER_EXPIRED', 'DeliveryAssignment', assignment.id, JSON.stringify({
        listing_id: assignment.listing_id,
        partner_id: assignment.partner_id,
      }));

      console.log(`[OfferExpiry] Delivery ${assignment.id} expired for partner ${assignment.partner_id}`);

      if (triggerDeliveryAssignment) {
        const listing = await getById('listings', assignment.listing_id);
        if (listing) {
          const allAssignments = await findAll('delivery_assignments', { listing_id: listing.id });
          const excludedPartners = allAssignments.filter(a => a.status !== 'PENDING').map(a => a.partner_id);
          
          triggerDeliveryAssignment(listing, assignment.match_ngo_id, excludedPartners);
        }
      }
    }
  } catch (err) {
    console.error('[OfferExpiry] Error checking expired offers:', err.message);
  }
}

export function startOfferExpiryJob() {
  loadDependencies().then(() => {
    cron.schedule('*/30 * * * * *', checkExpiredOffers);
    console.log('[Jobs] Offer expiry checker started (every 30 seconds)');
  });
}
