import express from 'express';
import { newId, getById, insert, updateById, findAll, getDb } from '../db/database.js';
import { success, badRequest, conflict, notFound, serverError } from '../utils/envelope.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { logAudit } from '../services/audit.js';

const router = express.Router();

router.post('/verification/submit', authenticate, async (req, res) => {
  try {
    const user = getById('users', req.user.id);
    if (!user) return notFound(res, 'User not found');

    const {
      doc_type, license_no, file_url,
      reg_no, org_name, address_place_id, service_radius_km, daily_capacity, operating_hours,
      vehicle_type, id_file_url, selfie_file_url
    } = req.body;

    const identifier = license_no || reg_no;
    
    if (identifier) {
      const duplicate = getDb().prepare('SELECT id FROM verification_documents WHERE license_no = ? OR reg_no = ?').get(identifier, identifier);
      if (duplicate) {
        return conflict(res, 'Duplicate license/registration number');
      }
    }

    const docId = newId();
    const docUrl = file_url || id_file_url;
    
    insert('verification_documents', {
      id: docId,
      user_id: user.id,
      doc_type: doc_type || null,
      file_url: docUrl || null,
      license_no: license_no || null,
      reg_no: reg_no || null,
      status: 'PENDING',
      reviewed_by: null,
      review_reason: null,
      submitted_at: new Date().toISOString(),
      reviewed_at: null
    });

    if (user.role === 'RESTAURANT' || user.role === 'INDIVIDUAL_DONOR') {
      const existing = getById('restaurant_profiles', user.id);
      if (!existing) {
        insert('restaurant_profiles', {
          user_id: user.id,
          business_name: '',
          license_no: license_no || null,
          address: '',
          lat: 0,
          lng: 0,
          verified_doc_url: file_url || null
        });
      }
    } else if (user.role === 'NGO') {
      const existing = getById('ngo_profiles', user.id);
      if (!existing) {
        insert('ngo_profiles', {
          user_id: user.id,
          org_name: org_name || '',
          reg_no: reg_no || null,
          address: address_place_id || '',
          lat: 0,
          lng: 0,
          service_radius_km: service_radius_km || 10,
          daily_capacity: daily_capacity || 100,
          auto_match_enabled: 0,
          operating_hours_open: operating_hours?.open || '08:00',
          operating_hours_close: operating_hours?.close || '21:00',
          claimed_today: 0
        });
      }
    } else if (user.role === 'DELIVERY_PARTNER') {
      const existing = getById('delivery_partner_profiles', user.id);
      if (!existing) {
        insert('delivery_partner_profiles', {
          user_id: user.id,
          id_doc_url: id_file_url || null,
          selfie_url: selfie_file_url || null,
          vehicle_type: vehicle_type || 'BIKE',
          status: 'OFFLINE',
          current_lat: 0,
          current_lng: 0
        });
      }
    }

    updateById('users', user.id, { verification_status: 'PENDING' });

    logAudit(user.id, 'VERIFICATION_SUBMITTED', 'VerificationDocument', docId, JSON.stringify({ doc_id: docId }));

    return success(res, {
      verification_id: docId,
      status: 'PENDING'
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.get('/verification/me', authenticate, async (req, res) => {
  try {
    const userDocs = getDb().prepare('SELECT * FROM verification_documents WHERE user_id = ? ORDER BY submitted_at DESC LIMIT 1').all(req.user.id);
    if (userDocs.length === 0) {
      return success(res, null);
    }
    
    const latestDoc = userDocs[0];
    
    return success(res, {
      verification_id: latestDoc.id,
      status: latestDoc.status,
      doc_type: latestDoc.doc_type,
      submitted_at: latestDoc.submitted_at,
      review_reason: latestDoc.review_reason
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.post('/verification/:id/review', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, reason } = req.body;
    
    const doc = getById('verification_documents', id);
    if (!doc) return notFound(res, 'Verification document not found');

    if ((decision === 'REJECTED' || decision === 'RESUBMIT_REQUIRED') && !reason) {
      return badRequest(res, 'Reason required for rejection or resubmission');
    }
    
    const validDecisions = ['APPROVED', 'REJECTED', 'RESUBMIT_REQUIRED'];
    if (!validDecisions.includes(decision)) {
      return badRequest(res, 'Invalid decision');
    }

    updateById('verification_documents', id, {
      status: decision,
      reviewed_by: req.user.id,
      review_reason: reason || null,
      reviewed_at: new Date().toISOString()
    });

    const user = getById('users', doc.user_id);
    if (user) {
      updateById('users', user.id, { verification_status: decision });

      if (decision === 'APPROVED' && user.role === 'DELIVERY_PARTNER') {
        const dpProfile = getById('delivery_partner_profiles', user.id);
        if (dpProfile) {
          updateById('delivery_partner_profiles', user.id, { status: 'ONLINE' });
        }
      }
    }

    logAudit(req.user.id, 'VERIFICATION_REVIEWED', 'VerificationDocument', id, JSON.stringify({ decision }));

    return success(res, {
      verification_id: id,
      status: decision
    });
  } catch (error) {
    return serverError(res, error.message);
  }
});

router.get('/admin/verification/queue', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT v.*, u.email, u.role
      FROM verification_documents v
      LEFT JOIN users u ON v.user_id = u.id
    `;
    const params = [];
    if (status) {
      query += ` WHERE v.status = ?`;
      params.push(status);
    }
    
    const docs = getDb().prepare(query).all(...params);
    
    const identifierCounts = {};
    getDb().prepare('SELECT license_no, reg_no FROM verification_documents').all().forEach(d => {
      const id = d.license_no || d.reg_no;
      if (id) {
        identifierCounts[id] = (identifierCounts[id] || 0) + 1;
      }
    });

    const enrichedDocs = docs.map(d => {
      const id = d.license_no || d.reg_no;
      return {
        ...d,
        verification_id: d.id,
        flagged_duplicate: id ? identifierCounts[id] > 1 : false
      };
    });

    return success(res, enrichedDocs);
  } catch (error) {
    return serverError(res, error.message);
  }
});

export default router;
