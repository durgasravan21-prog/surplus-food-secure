import { Router } from 'express';
import { getById, updateById, newId, insert, getDb } from '../db/database.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { logAudit } from '../services/audit.js';
import { success, badRequest, notFound } from '../utils/envelope.js';
import { triggerMatching } from '../services/matchingEngine.js';

const router = Router();

router.post('/admin/users/:id/suspend', authenticate, authorize('ADMIN'), (req, res) => {
  const { reason } = req.body;
  const { id } = req.params;
  
  const user = getById('users', id);
  if (!user) {
    return notFound(res, 'User not found');
  }
  
  updateById('users', id, { suspended: 1 });
  
  if (user.role === 'NGO') {
    const profile = getById('ngo_profiles', id);
    if (profile) updateById('ngo_profiles', id, { auto_match_enabled: 0 });
  } else if (user.role === 'DELIVERY_PARTNER') {
    const profile = getById('delivery_partner_profiles', id);
    if (profile) updateById('delivery_partner_profiles', id, { status: 'OFFLINE' });
  }
  
  logAudit(req.user.id, 'USER_SUSPENDED', 'User', id, JSON.stringify({ target_user_id: id, reason }));
  return success(res, { success: true });
});

router.post('/admin/users/:id/reinstate', authenticate, authorize('ADMIN'), (req, res) => {
  const { id } = req.params;
  
  const user = getById('users', id);
  if (!user) {
    return notFound(res, 'User not found');
  }
  
  updateById('users', id, { suspended: 0 });
  
  logAudit(req.user.id, 'USER_REINSTATED', 'User', id, JSON.stringify({ target_user_id: id }));
  return success(res, { success: true });
});

router.patch('/admin/users/:id/role', authenticate, authorize('ADMIN'), (req, res) => {
  const { role } = req.body;
  const { id } = req.params;
  
  const user = getById('users', id);
  if (!user) {
    return notFound(res, 'User not found');
  }
  
  updateById('users', id, { role: role });
  
  logAudit(req.user.id, 'USER_ROLE_CHANGED', 'User', id, JSON.stringify({ target_user_id: id, new_role: role }));
  return success(res, { success: true, role });
});

router.post('/admin/matches/:id/override', authenticate, authorize('ADMIN'), async (req, res) => {
  const { action, ngo_id } = req.body;
  const { id } = req.params;
  
  const listing = getById('listings', id);
  if (!listing) {
    return notFound(res, 'Listing not found');
  }
  
  if (action === 'FORCE_ASSIGN') {
    if (!ngo_id) return badRequest(res, 'ngo_id required');
    
    const matchAttemptId = newId();
    insert('match_attempts', {
      id: matchAttemptId,
      listing_id: id,
      ngo_id: ngo_id,
      offered_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 10*60*1000).toISOString(),
      responded_at: new Date().toISOString(),
      outcome: 'ACCEPTED',
      distance_km: 0
    });
    
    updateById('listings', id, { status: 'NGO_ACCEPTED' });
  } else if (action === 'FORCE_CANCEL') {
    getDb().prepare(`UPDATE match_attempts SET outcome = 'CANCELLED' WHERE listing_id = ? AND outcome = 'PENDING'`).run(id);
    updateById('listings', id, { status: 'LISTED' });
    const updatedListing = getById('listings', id);
    await triggerMatching(updatedListing);
  } else {
    return badRequest(res, 'Invalid action');
  }
  
  logAudit(req.user.id, 'MATCH_OVERRIDDEN', 'Listing', id, JSON.stringify({ listing_id: id, action, ngo_id }));
  return success(res, { success: true });
});

export default router;
