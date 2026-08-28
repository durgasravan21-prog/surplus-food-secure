import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { verificationService } from '../services/verification';
import { uploadService } from '../services/uploads';
import { ROLES, VEHICLE_TYPES } from '../config/constants';

export default function VerificationSubmitPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    license_no: '', reg_no: '', org_name: '', address_place_id: '',
    service_radius_km: '5', daily_capacity: '100',
    open_time: '08:00', close_time: '21:00',
    vehicle_type: VEHICLE_TYPES.BIKE,
    file: null, selfie: null,
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm((prev) => ({ ...prev, [name]: files ? files[0] : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const role = user?.role;
      let payload = {};

      if (role === ROLES.RESTAURANT || role === ROLES.INDIVIDUAL_DONOR) {
        const fileUrl = await uploadService.uploadFile(form.file, 'VERIFICATION_DOC');
        payload = { doc_type: 'FSSAI_LICENSE', license_no: form.license_no, file_url: fileUrl };
      } else if (role === ROLES.NGO) {
        const fileUrl = await uploadService.uploadFile(form.file, 'VERIFICATION_DOC');
        payload = {
          doc_type: 'NGO_REGISTRATION', reg_no: form.reg_no, org_name: form.org_name,
          address_place_id: form.address_place_id,
          service_radius_km: parseInt(form.service_radius_km),
          daily_capacity: parseInt(form.daily_capacity),
          operating_hours: { open: form.open_time, close: form.close_time },
          file_url: fileUrl,
        };
      } else if (role === ROLES.DELIVERY_PARTNER) {
        const idFileUrl = await uploadService.uploadFile(form.file, 'VERIFICATION_DOC');
        const selfieUrl = await uploadService.uploadFile(form.selfie, 'LIVENESS_SELFIE');
        payload = { doc_type: 'GOVT_ID', vehicle_type: form.vehicle_type, id_file_url: idFileUrl, selfie_file_url: selfieUrl };
      }

      await verificationService.submit(payload);
      updateUser({ verification_status: 'PENDING' });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Submission failed.');
    } finally {
      setLoading(false);
    }
  };

  const role = user?.role;

  return (
    <div style={{ maxWidth: '560px', margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>Submit Verification</h1>
      <p style={{ color: '#888', fontSize: '13px', marginBottom: '24px' }}>
        Upload your documents to get verified and start using Annayog.
      </p>
      {error && <div style={{ background: '#f8d7da', color: '#721c24', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {(role === ROLES.RESTAURANT || role === ROLES.INDIVIDUAL_DONOR) && (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#555' }}>
              FSSAI License / Business Registration Number *
              <input name="license_no" value={form.license_no} onChange={handleChange} required style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#555' }}>
              License / Certificate Photo *
              <input name="file" type="file" accept="image/*,.pdf" onChange={handleChange} required />
            </label>
          </>
        )}
        {role === ROLES.NGO && (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#555' }}>
              Organization Name *
              <input name="org_name" value={form.org_name} onChange={handleChange} required style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#555' }}>
              Registration Number (12A/80G/Trust/Society) *
              <input name="reg_no" value={form.reg_no} onChange={handleChange} required style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#555' }}>
                Service Radius (km)
                <input name="service_radius_km" type="number" value={form.service_radius_km} onChange={handleChange} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#555' }}>
                Daily Capacity (meals)
                <input name="daily_capacity" type="number" value={form.daily_capacity} onChange={handleChange} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }} />
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#555' }}>
                Opens At
                <input name="open_time" type="time" value={form.open_time} onChange={handleChange} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#555' }}>
                Closes At
                <input name="close_time" type="time" value={form.close_time} onChange={handleChange} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }} />
              </label>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#555' }}>
              Registration Certificate *
              <input name="file" type="file" accept="image/*,.pdf" onChange={handleChange} required />
            </label>
          </>
        )}
        {role === ROLES.DELIVERY_PARTNER && (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#555' }}>
              Vehicle Type
              <select name="vehicle_type" value={form.vehicle_type} onChange={handleChange} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '8px' }}>
                <option value="BIKE">Bike</option>
                <option value="ON_FOOT">On Foot</option>
                <option value="CAR">Car</option>
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#555' }}>
              Government ID Photo *
              <input name="file" type="file" accept="image/*" onChange={handleChange} required />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#555' }}>
              Live Selfie (taken now) *
              <input name="selfie" type="file" accept="image/*" capture="user" onChange={handleChange} required />
            </label>
          </>
        )}
        <button type="submit" disabled={loading} style={{ padding: '14px', background: '#0f9b58', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '8px' }}>
          {loading ? 'Submitting...' : 'Submit for Review'}
        </button>
      </form>
    </div>
  );
}
