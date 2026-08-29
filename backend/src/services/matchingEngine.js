import { haversineDistance } from '../utils/haversine.js';
import { getById, newId, findAll, insert, updateById } from '../db/supabase.js';
import { logAudit } from './audit.js';
import { triggerDeliveryAssignment } from './deliveryAssignment.js';

let broadcast = () => {};
try {
  import('../websocket/index.js').then(ws => {
    broadcast = ws.broadcast || broadcast;
  }).catch(() => {});
} catch (e) {
  // Ignore missing websocket module
}

export async function triggerMatching(listing, excludeNgoIds = []) {
  try {
    const now = new Date();
    const allNgos = await findAll('ngo_profiles');
    const allUsers = await findAll('users');
    const userMap = new Map(allUsers.map(u => [u.id, u]));

    // Find eligible NGO profiles
    let eligibleNgos = allNgos.filter(profile => {
      if (profile.auto_match_enabled === false || profile.auto_match_enabled === 0) return false;
      if (excludeNgoIds.includes(profile.user_id)) return false;
      
      const user = userMap.get(profile.user_id);
      if (!user || user.suspended) return false;
      
      const distance = haversineDistance(
        listing.lat || 0, listing.lng || 0,
        profile.lat || 0, profile.lng || 0
      );
      
      let maxRadius = profile.service_radius_km || 25;
      
      const minutesLeft = (new Date(listing.best_before_at) - now) / 60000;
      if (listing.perishability === 'HIGHLY_PERISHABLE' && minutesLeft < 60) {
        maxRadius *= 1.5;
      }
      
      if (distance > maxRadius) return false;
      
      return true;
    });

    // Fallback: If no profile matched, look up any approved NGO user
    if (eligibleNgos.length === 0) {
      const ngoUsers = allUsers.filter(u => u.role === 'NGO' && !u.suspended && !excludeNgoIds.includes(u.id));
      if (ngoUsers.length > 0) {
        eligibleNgos = ngoUsers.map(u => ({
          user_id: u.id,
          lat: listing.lat || 17.3850,
          lng: listing.lng || 78.4867,
          service_radius_km: 25,
          daily_capacity: 500,
          claimed_today: 0,
          auto_match_enabled: true
        }));
      }
    }

    logAudit('system', 'MATCHING_TRIGGERED', 'Listing', listing.id, { listing_id: listing.id });

    if (eligibleNgos.length === 0) {
      logAudit('system', 'NO_ELIGIBLE_NGO', 'Listing', listing.id, { listing_id: listing.id });
      return null;
    }

    const scoredNgos = eligibleNgos.map(profile => {
      const distance = haversineDistance(
        listing.lat || 0, listing.lng || 0,
        profile.lat || 0, profile.lng || 0
      );
      
      const minutesLeft = (new Date(listing.best_before_at) - now) / 60000;
      let urgencyWeight = minutesLeft;
      
      if (listing.perishability === 'HIGHLY_PERISHABLE') urgencyWeight *= 3;
      else if (listing.perishability === 'MODERATE') urgencyWeight *= 2;
      else urgencyWeight *= 1;
      
      const score = distance + urgencyWeight;
      
      return { profile, distance, score };
    });

    scoredNgos.sort((a, b) => a.score - b.score);
    const bestMatch = scoredNgos[0];

    const matchAttemptId = newId();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
    
    const matchAttempt = {
      id: matchAttemptId,
      listing_id: listing.id,
      ngo_id: bestMatch.profile.user_id,
      offered_at: now.toISOString(),
      expires_at: expiresAt,
      responded_at: now.toISOString(),
      outcome: 'ACCEPTED',
      distance_km: bestMatch.distance
    };
    
    await insert('match_attempts', matchAttempt);
    await updateById('listings', listing.id, { status: 'NGO_ACCEPTED' });

    try {
      broadcast(bestMatch.profile.user_id, 'MATCH_OFFER', {
        match_id: matchAttemptId,
        food_type: listing.food_type,
        quantity_meals: listing.quantity_meals,
        best_before_at: listing.best_before_at,
        expires_at: expiresAt,
        distance_km: bestMatch.distance,
        status: 'NGO_ACCEPTED'
      });
      broadcast(listing.donor_id, 'LISTING_STATUS_CHANGED', {
        listing_id: listing.id,
        status: 'NGO_ACCEPTED'
      });
    } catch (err) {
      // ignore
    }

    logAudit('system', 'MATCH_ACCEPTED_AUTO', 'MatchAttempt', matchAttemptId, { listing_id: listing.id, ngo_id: bestMatch.profile.user_id });

    // Automatically assign delivery partner immediately after matching NGO!
    try {
      const updatedListing = await getById('listings', listing.id);
      await triggerDeliveryAssignment(updatedListing, bestMatch.profile.user_id);
    } catch (deliveryErr) {
      console.error('[MatchingEngine] Auto delivery assignment error:', deliveryErr.message);
    }

    return matchAttempt;
  } catch (err) {
    console.error('[MatchingEngine] Error in triggerMatching:', err.message);
    return null;
  }
}
