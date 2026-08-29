import { haversineDistance } from '../utils/haversine.js';
import { getById, newId, findAll, insert, getDb } from '../db/database.js';
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
  const now = new Date();
  
  const allNgos = findAll('ngo_profiles');

  const eligibleNgos = allNgos.filter(profile => {
    if (!profile.auto_match_enabled) return false;
    if (excludeNgoIds.includes(profile.user_id)) return false;
    
    const user = getById('users', profile.user_id);
    if (!user || user.verification_status !== 'APPROVED' || user.suspended) return false;
    
    const distance = haversineDistance(
      listing.lat, listing.lng,
      profile.lat, profile.lng
    );
    
    let maxRadius = profile.service_radius_km;
    
    const minutesLeft = (new Date(listing.best_before_at) - now) / 60000;
    if (listing.perishability === 'HIGHLY_PERISHABLE' && minutesLeft < 60) {
      maxRadius *= 1.5;
    }
    
    if (distance > maxRadius) return false;
    
    if ((profile.daily_capacity - profile.claimed_today) < listing.quantity_meals) return false;
    
    const currentHourStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    if (currentHourStr < profile.operating_hours_open || currentHourStr > profile.operating_hours_close) return false;
    
    return true;
  });

  logAudit('system', 'MATCHING_TRIGGERED', 'Listing', listing.id, { listing_id: listing.id });

  if (eligibleNgos.length === 0) {
    logAudit('system', 'NO_ELIGIBLE_NGO', 'Listing', listing.id, { listing_id: listing.id });
    return null;
  }

  const scoredNgos = eligibleNgos.map(profile => {
    const distance = haversineDistance(
      listing.lat, listing.lng,
      profile.lat, profile.lng
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
  
  insert('match_attempts', matchAttempt);

  getDb().prepare(`UPDATE listings SET status = 'MATCHED_PENDING_NGO_ACCEPT' WHERE id = ? AND status = 'LISTED'`).run(listing.id);

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
}
