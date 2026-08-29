/**
 * ============================================================================
 * ANNAYOG — Auth & Session Routes (Supabase Cloud Database)
 * ============================================================================
 */

import express from 'express';
import { newId, findUserByGoogleSub, findUserByEmail, getById, insert, updateById, deleteByColumn, findAll } from '../db/supabase.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { exchangeGoogleCode } from '../utils/google.js';
import { success, badRequest, unauthorized, conflict, serverError } from '../utils/envelope.js';
import { logAudit } from '../services/audit.js';
import { authenticate } from '../middleware/authenticate.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/auth/google/callback', authLimiter, async (req, res) => {
  try {
    const { code, redirect_uri } = req.body;
    if (!code || !redirect_uri) {
      return badRequest(res, 'Missing code or redirect_uri');
    }

    const profile = await exchangeGoogleCode(code, redirect_uri);

    let user = await findUserByGoogleSub(profile.sub);
    if (!user && profile.email) {
      user = await findUserByEmail(profile.email);
      if (user && !user.google_sub) {
        await updateById('users', user.id, { google_sub: profile.sub });
        user.google_sub = profile.sub;
      }
    }

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = {
        id:                  newId(),
        google_sub:          profile.sub,
        email:               profile.email,
        name:                profile.name,
        picture:             profile.picture,
        role:                null,
        verification_status: 'PENDING_VERIFICATION',
        trust_score:         100,
        suspended:           false,
        created_at:          new Date().toISOString(),
      };
      
      if (user.email === 'durgasravan21@gmail.com' || user.email === 'admin@annayog.app') {
        user.role = 'ADMIN';
        user.verification_status = 'APPROVED';
      }

      if (user.email === 'challagollasridevi@gmail.com') {
        user.role = 'RESTAURANT';
        user.verification_status = 'APPROVED';
      }

      await insert('users', user);

      if (user.email === 'challagollasridevi@gmail.com') {
        const existingDocs = await findAll('verification_documents', { user_id: user.id });
        if (existingDocs.length === 0) {
          const docId = newId();
          await insert('verification_documents', {
            id: docId,
            user_id: user.id,
            doc_type: 'FSSAI_LICENSE',
            file_url: 'http://localhost:5000/uploads/default_license.pdf',
            license_no: '12345678901234',
            status: 'APPROVED',
            submitted_at: new Date().toISOString(),
            reviewed_at: new Date().toISOString(),
            reviewed_by: 'system'
          });
        }

        const existingProfile = await getById('restaurant_profiles', user.id);
        if (!existingProfile) {
          await insert('restaurant_profiles', {
            user_id: user.id,
            business_name: 'Sridevi Restaurant',
            license_no: '12345678901234',
            address: 'Hyderabad, India',
            lat: 17.3850,
            lng: 78.4867,
            verified_doc_url: 'http://localhost:5000/uploads/default_license.pdf'
          });
        }
      }
    } else {
      let updates = {};
      if (user.email === 'durgasravan21@gmail.com' || user.email === 'admin@annayog.app') {
        if (user.role !== 'ADMIN' || user.verification_status !== 'APPROVED') {
          updates.role = 'ADMIN';
          updates.verification_status = 'APPROVED';
        }
      }
      
      if (user.email === 'challagollasridevi@gmail.com') {
        if (user.role !== 'RESTAURANT' || user.verification_status !== 'APPROVED') {
          updates.role = 'RESTAURANT';
          updates.verification_status = 'APPROVED';
        }
        
        const existingDocs = await findAll('verification_documents', { user_id: user.id });
        if (existingDocs.length === 0) {
          const docId = newId();
          await insert('verification_documents', {
            id: docId,
            user_id: user.id,
            doc_type: 'FSSAI_LICENSE',
            file_url: 'http://localhost:5000/uploads/default_license.pdf',
            license_no: '12345678901234',
            status: 'APPROVED',
            submitted_at: new Date().toISOString(),
            reviewed_at: new Date().toISOString(),
            reviewed_by: 'system'
          });
        }

        const existingProfile = await getById('restaurant_profiles', user.id);
        if (!existingProfile) {
          await insert('restaurant_profiles', {
            user_id: user.id,
            business_name: 'Sridevi Restaurant',
            license_no: '12345678901234',
            address: 'Hyderabad, India',
            lat: 17.3850,
            lng: 78.4867,
            verified_doc_url: 'http://localhost:5000/uploads/default_license.pdf'
          });
        }
      }

      if (Object.keys(updates).length > 0) {
        await updateById('users', user.id, updates);
        Object.assign(user, updates);
      }
    }

    const access_token  = generateAccessToken(user);
    const refresh_token = generateRefreshToken(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await insert('refresh_tokens', {
      token: refresh_token,
      user_id: user.id,
      expires_at: expiresAt.toISOString(),
    });

    logAudit(user.id, 'USER_LOGIN', 'User', user.id, JSON.stringify({ is_new_user: isNewUser }));

    return success(res, {
      access_token,
      refresh_token,
      requires_role_selection: !user.role,
      role:                user.role,
      verification_status: user.verification_status,
      email:               user.email,
      name:                user.name,
      picture:             user.picture,
      user_id:             user.id,
    });
  } catch (err) {
    console.error('[Auth] Google callback error:', err.message);
    return serverError(res, 'Authentication failed: ' + err.message);
  }
});

router.post('/auth/role', authenticate, async (req, res) => {
  try {
    const { role } = req.body;
    const user = await getById('users', req.user.id);
    if (!user) return badRequest(res, 'User not found');

    if (user.role) {
      return conflict(res, 'Role already selected. Contact admin to change.');
    }

    const ALLOWED_ROLES = ['RESTAURANT', 'INDIVIDUAL_DONOR', 'NGO', 'DELIVERY_PARTNER'];
    if (!ALLOWED_ROLES.includes(role)) {
      return badRequest(res, `Invalid role. Must be one of: ${ALLOWED_ROLES.join(', ')}`);
    }

    await updateById('users', user.id, {
      role: role,
      verification_status: 'PENDING_VERIFICATION'
    });

    logAudit(user.id, 'ROLE_SELECTED', 'User', user.id, JSON.stringify({ role }));

    return success(res, {
      role: role,
      verification_status: 'PENDING_VERIFICATION',
    });
  } catch (err) {
    return serverError(res, err.message);
  }
});

router.post('/auth/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return badRequest(res, 'Refresh token required');
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refresh_token);
    } catch {
      return unauthorized(res, 'Invalid or expired refresh token');
    }

    const tokenData = await getByColumn('refresh_tokens', 'token', refresh_token);
    if (!tokenData || tokenData.user_id !== decoded.user_id) {
      return unauthorized(res, 'Refresh token not recognised');
    }

    await deleteByColumn('refresh_tokens', 'token', refresh_token);

    const user = await getById('users', decoded.user_id);
    if (!user) return unauthorized(res, 'User not found');

    const new_access_token  = generateAccessToken(user);
    const new_refresh_token = generateRefreshToken(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await insert('refresh_tokens', {
      token: new_refresh_token,
      user_id: user.id,
      expires_at: expiresAt.toISOString(),
    });

    return success(res, {
      access_token:  new_access_token,
      refresh_token: new_refresh_token,
    });
  } catch (err) {
    return serverError(res, err.message);
  }
});

router.post('/auth/logout', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    await deleteByColumn('refresh_tokens', 'user_id', userId);
    logAudit(userId, 'USER_LOGOUT', 'User', userId, '{}');
    return success(res, { success: true });
  } catch (err) {
    return serverError(res, err.message);
  }
});

export default router;
