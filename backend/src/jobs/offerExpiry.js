import cron from 'node-cron';
import { getDb, updateById, getById } from '../db/database.js';
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

function checkExpiredOffers() {
  const now = new Date();

  const pendingMatches = getDb().prepare("SELECT * FROM match_attempts WHERE outcome = 'PENDING' AND expires_at IS NOT NULL").all();
  
  for (const match of pendingMatches) {
    if (new Date(match.expires_at) > now) continue;

    updateById('match_attempts', match.id, { outcome: 'EXPIRED', responded_at: now.toISOString() });

    logAudit('system', 'MATCH_OFFER_EXPIRED', 'MatchAttempt', match.id, {
      listing_id: match.listing_id,
      ngo_id: match.ngo_id,
    });

    console.log(`[OfferExpiry] Match ${match.id} expired for NGO ${match.ngo_id}`);

    if (triggerMatching) {
      const listing = getById('listings', match.listing_id);
      if (listing && listing.status === 'MATCHED_PENDING_NGO_ACCEPT') {
        updateById('listings', listing.id, { status: 'LISTED' });

        const excludedMatches = getDb().prepare("SELECT ngo_id FROM match_attempts WHERE listing_id = ? AND outcome != 'PENDING'").all(listing.id);
        const excludedNgos = excludedMatches.map(m => m.ngo_id);
        
        triggerMatching(getById('listings', listing.id), excludedNgos);
      }
    }
  }

  const pendingDeliveries = getDb().prepare("SELECT * FROM delivery_assignments WHERE status = 'PENDING' AND expires_at IS NOT NULL").all();
  
  for (const assignment of pendingDeliveries) {
    if (new Date(assignment.expires_at) > now) continue;

    updateById('delivery_assignments', assignment.id, { status: 'EXPIRED' });

    logAudit('system', 'DELIVERY_OFFER_EXPIRED', 'DeliveryAssignment', assignment.id, {
      listing_id: assignment.listing_id,
      partner_id: assignment.partner_id,
    });

    console.log(`[OfferExpiry] Delivery ${assignment.id} expired for partner ${assignment.partner_id}`);

    if (triggerDeliveryAssignment) {
      const listing = getById('listings', assignment.listing_id);
      if (listing) {
        const excludedAssignments = getDb().prepare("SELECT partner_id FROM delivery_assignments WHERE listing_id = ? AND status != 'PENDING'").all(listing.id);
        const excludedPartners = excludedAssignments.map(a => a.partner_id);
        
        triggerDeliveryAssignment(listing, assignment.match_ngo_id, excludedPartners);
      }
    }
  }
}

export function startOfferExpiryJob() {
  loadDependencies().then(() => {
    cron.schedule('*/30 * * * * *', checkExpiredOffers);
    console.log('[Jobs] Offer expiry checker started (every 30 seconds)');
  });
}
