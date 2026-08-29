import { Router } from 'express';
import { getById, updateById, newId, insert, findAll } from '../db/supabase.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { logAudit } from '../services/audit.js';
import { success, badRequest, notFound, serverError } from '../utils/envelope.js';
import { triggerMatching } from '../services/matchingEngine.js';

const router = Router();

router.post('/admin/users/:id/suspend', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { reason } = req.body;
    const { id } = req.params;
    
    const user = await getById('users', id);
    if (!user) {
      return notFound(res, 'User not found');
    }
    
    await updateById('users', id, { suspended: true });
    
    if (user.role === 'NGO') {
      const profile = await getById('ngo_profiles', id);
      if (profile) await updateById('ngo_profiles', id, { auto_match_enabled: false });
    } else if (user.role === 'DELIVERY_PARTNER') {
      const profile = await getById('delivery_partner_profiles', id);
      if (profile) await updateById('delivery_partner_profiles', id, { status: 'OFFLINE' });
    }
    
    logAudit(req.user.id, 'USER_SUSPENDED', 'User', id, JSON.stringify({ target_user_id: id, reason }));
    return success(res, { success: true });
  } catch (err) {
    return serverError(res, err.message);
  }
});

router.post('/admin/users/:id/reinstate', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await getById('users', id);
    if (!user) {
      return notFound(res, 'User not found');
    }
    
    await updateById('users', id, { suspended: false });
    
    logAudit(req.user.id, 'USER_REINSTATED', 'User', id, JSON.stringify({ target_user_id: id }));
    return success(res, { success: true });
  } catch (err) {
    return serverError(res, err.message);
  }
});

router.patch('/admin/users/:id/role', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;
    
    const user = await getById('users', id);
    if (!user) {
      return notFound(res, 'User not found');
    }
    
    await updateById('users', id, { role: role });
    
    logAudit(req.user.id, 'USER_ROLE_CHANGED', 'User', id, JSON.stringify({ target_user_id: id, new_role: role }));
    return success(res, { success: true, role });
  } catch (err) {
    return serverError(res, err.message);
  }
});

router.post('/admin/matches/:id/override', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { action, ngo_id } = req.body;
    const { id } = req.params;
    
    const listing = await getById('listings', id);
    if (!listing) {
      return notFound(res, 'Listing not found');
    }
    
    if (action === 'FORCE_ASSIGN') {
      if (!ngo_id) return badRequest(res, 'ngo_id required');
      
      const matchAttemptId = newId();
      await insert('match_attempts', {
        id: matchAttemptId,
        listing_id: id,
        ngo_id: ngo_id,
        offered_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10*60*1000).toISOString(),
        responded_at: new Date().toISOString(),
        outcome: 'ACCEPTED',
        distance_km: 0
      });
      
      await updateById('listings', id, { status: 'NGO_ACCEPTED' });
    } else if (action === 'FORCE_CANCEL') {
      const matches = await findAll('match_attempts', { listing_id: id, outcome: 'PENDING' });
      for (const m of matches) {
        await updateById('match_attempts', m.id, { outcome: 'CANCELLED' });
      }
      await updateById('listings', id, { status: 'LISTED' });
      const updatedListing = await getById('listings', id);
      await triggerMatching(updatedListing);
    } else {
      return badRequest(res, 'Invalid action');
    }
    
    logAudit(req.user.id, 'MATCH_OVERRIDDEN', 'Listing', id, JSON.stringify({ listing_id: id, action, ngo_id }));
    return success(res, { success: true });
  } catch (err) {
    return serverError(res, err.message);
  }
});

export default router;
