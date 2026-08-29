import { haversineDistance } from '../utils/haversine.js';
import { getById, newId, findAll, insert, updateById } from '../db/supabase.js';
import { logAudit } from './audit.js';

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

    const eligibleNgos = allNgos.filter(profile => {
      if (!profile.auto_match_enabled) return false;
      if (excludeNgoIds.includes(profile.user_id)) return false;
      
      const user = userMap.get(profile.user_id);
      if (!user || user.verification_status !== 'APPROVED' || user.suspended) return false;
      
      const distance = haversineDistance(
        listing.lat || 0, listing.lng || 0,
        profile.lat || 0, profile.lng || 0
      );
      
      let maxRadius = profile.service_radius_km || 10;
      
      const minutesLeft = (new Date(listing.best_before_at) - now) / 60000;
      if (listing.perishability === 'HIGHLY_PERISHABLE' && minutesLeft < 60) {
        maxRadius *= 1.5;
      }
      
      if (distance > maxRadius) return false;
      
      if ((profile.daily_capacity - profile.claimed_today) < listing.quantity_meals) return false;
      
      const currentHourStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
      if (currentHourStr < (profile.operating_hours_open || '08:00') || currentHourStr > (profile.operating_hours_close || '21:00')) return false;
      
      return true;
    });

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
      responded_at: null,
      outcome: 'PENDING',
      distance_km: bestMatch.distance
    };
    
    await insert('match_attempts', matchAttempt);
    await updateById('listings', listing.id, { status: 'MATCHED_PENDING_NGO_ACCEPT' });

    try {
      broadcast(bestMatch.profile.user_id, 'MATCH_OFFER', {
        match_id: matchAttemptId,
        food_type: listing.food_type,
        quantity_meals: listing.quantity_meals,
        best_before_at: listing.best_before_at,
        expires_at: expiresAt,
        distance_km: bestMatch.distance,
        status: 'MATCHED_PENDING_NGO_ACCEPT'
      });
    } catch (err) {
      // ignore
    }

    logAudit('system', 'MATCH_OFFERED', 'MatchAttempt', matchAttemptId, { listing_id: listing.id, ngo_id: bestMatch.profile.user_id, match_id: matchAttemptId });
    return matchAttempt;
  } catch (err) {
    console.error('[MatchingEngine] Error in triggerMatching:', err.message);
    return null;
  }
}
