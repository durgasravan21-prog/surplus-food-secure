import { haversineDistance } from '../utils/haversine.js';
import { getById, newId, findAll, insert, updateById } from '../db/supabase.js';
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
  try {
    const now = new Date();
    const allPartners = await findAll('delivery_partner_profiles');
    const allUsers = await findAll('users');
    const userMap = new Map(allUsers.map(u => [u.id, u]));

    let eligiblePartners = allPartners.filter(profile => {
      if (excludePartnerIds.includes(profile.user_id)) return false;
      const user = userMap.get(profile.user_id);
      if (!user || user.suspended) return false;
      return true;
    });

    if (eligiblePartners.length === 0) {
      const dpUsers = allUsers.filter(u => u.role === 'DELIVERY_PARTNER' && !u.suspended && !excludePartnerIds.includes(u.id));
      if (dpUsers.length > 0) {
        eligiblePartners = dpUsers.map(u => ({
          user_id: u.id,
          current_lat: listing.lat || 17.3850,
          current_lng: listing.lng || 78.4867,
          vehicle_type: 'BIKE',
          status: 'ONLINE'
        }));
      }
    }

    logAudit('system', 'DELIVERY_ASSIGNMENT_TRIGGERED', 'Listing', listing.id, { listing_id: listing.id, ngo_id: ngoUserId });

    if (eligiblePartners.length === 0) {
      return null;
    }

    const scoredPartners = eligiblePartners.map(profile => {
      const distance = haversineDistance(
        listing.lat || 0, listing.lng || 0,
        profile.current_lat || 0, profile.current_lng || 0
      );
      return { profile, distance };
    });

    scoredPartners.sort((a, b) => a.distance - b.distance);
    const bestPartner = scoredPartners[0];

    const assignmentId = newId();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
    
    const assignment = {
      id: assignmentId,
      listing_id: listing.id,
      match_ngo_id: ngoUserId,
      partner_id: bestPartner.profile.user_id,
      offered_at: now.toISOString(),
      expires_at: expiresAt,
      status: 'ACCEPTED',
      pickup_photo_url: null,
      dropoff_photo_url: null
    };
    
    await insert('delivery_assignments', assignment);
    await updateById('listings', listing.id, { status: 'DELIVERY_ASSIGNED' });

    try {
      broadcast(bestPartner.profile.user_id, 'DELIVERY_OFFER', {
        id: assignmentId,
        listing_id: listing.id,
        food_type: listing.food_type,
        quantity_meals: listing.quantity_meals,
        distance_km: bestPartner.distance,
        expires_at: expiresAt,
        status: 'DELIVERY_ASSIGNED'
      });

      broadcast(listing.donor_id, 'LISTING_STATUS_CHANGED', {
        listing_id: listing.id,
        status: 'DELIVERY_ASSIGNED'
      });
    } catch (e) {
      // ignore
    }

    logAudit('system', 'DELIVERY_PARTNER_AUTO_ASSIGNED', 'DeliveryAssignment', assignmentId, {
      listing_id: listing.id,
      partner_id: bestPartner.profile.user_id
    });

    return assignment;
  } catch (err) {
    console.error('[DeliveryAssignment] Error in triggerDeliveryAssignment:', err.message);
    return null;
  }
}
