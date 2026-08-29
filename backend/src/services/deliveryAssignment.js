import { haversineDistance } from '../utils/haversine.js';
import { getById, newId, findAll, insert, getDb } from '../db/database.js';
import { logAudit } from './audit.js';

let broadcast = () => {};
try {
  import('../websocket/index.js').then(ws => {
    broadcast = ws.broadcast || broadcast;
  }).catch(() => {});
} catch (e) {
  // Ignore
}

export async function triggerDeliveryAssignment(listing, ngoUserId, excludePartnerIds = []) {
  const now = new Date();
  
  const allPartners = findAll('delivery_partner_profiles');

  const eligiblePartners = allPartners.filter(profile => {
    if (excludePartnerIds.includes(profile.user_id)) return false;
    if (profile.status !== 'ONLINE') return false;
    
    const user = getById('users', profile.user_id);
    if (!user || user.verification_status !== 'APPROVED' || user.suspended) return false;
    
    const distance = haversineDistance(
      listing.lat, listing.lng,
      profile.current_lat, profile.current_lng
    );
    
    if (distance > 15) return false;
    return true;
  });

  logAudit('system', 'DELIVERY_ASSIGNMENT_TRIGGERED', 'Listing', listing.id, { listing_id: listing.id, ngo_id: ngoUserId });

  if (eligiblePartners.length === 0) {
    return null; // NGO can self-arrange
  }

  const scoredPartners = eligiblePartners.map(profile => {
    const distance = haversineDistance(
      listing.lat, listing.lng,
      profile.current_lat, profile.current_lng
    );
    return { profile, distance };
  });

  scoredPartners.sort((a, b) => a.distance - b.distance);
  const bestPartner = scoredPartners[0];

  const assignmentId = newId();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
  
  const assignment = {
    id: assignmentId,
    listing_id: listing.id,
    match_ngo_id: ngoUserId,
    partner_id: bestPartner.profile.user_id,
    offered_at: now.toISOString(),
    expires_at: expiresAt,
    status: 'PENDING',
    pickup_photo_url: null,
    dropoff_photo_url: null
  };
  
  insert('delivery_assignments', assignment);

  getDb().prepare(`UPDATE listings SET status = 'DELIVERY_ASSIGNED' WHERE id = ? AND status = 'NGO_ACCEPTED'`).run(listing.id);

  try {
    broadcast(bestPartner.profile.user_id, 'DELIVERY_OFFER', {
      id: assignmentId,
      listing_id: listing.id,
      food_type: listing.food_type,
      quantity_meals: listing.quantity_meals,
      distance_km: bestPartner.distance,
      expires_at: expiresAt
    });
  } catch (e) {
    // ignore
  }

  return assignment;
}
