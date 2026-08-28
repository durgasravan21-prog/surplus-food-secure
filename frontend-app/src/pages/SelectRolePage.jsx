import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../config/constants';
import './SelectRolePage.css';

const roleOptions = [
  { value: ROLES.RESTAURANT, icon: '🏪', title: 'Restaurant', desc: 'List surplus food from your kitchen for nearby NGOs' },
  { value: ROLES.INDIVIDUAL_DONOR, icon: '🏠', title: 'Individual Donor', desc: 'Donate home-cooked surplus food safely' },
  { value: ROLES.NGO, icon: '🏛️', title: 'NGO / Shelter', desc: 'Receive matched food donations automatically' },
  { value: ROLES.DELIVERY_PARTNER, icon: '🚲', title: 'Delivery Partner', desc: 'Volunteer to pick up and deliver food' },
];

export default function SelectRolePage() {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { selectRole } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    try {
      await selectRole(selected);
      navigate('/verification/submit', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to set role.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="select-role-page">
      <div className="role-card">
        <h1>Choose Your Role</h1>
        <p className="role-subtitle">This is a one-time selection and cannot be changed later.</p>
        {error && <p className="role-error">{error}</p>}
        <div className="role-options">
          {roleOptions.map((opt) => (
            <button
              key={opt.value}
              className={`role-option ${selected === opt.value ? 'selected' : ''}`}
              onClick={() => setSelected(opt.value)}
            >
              <span className="role-icon">{opt.icon}</span>
              <div>
                <strong>{opt.title}</strong>
                <p>{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
        <button className="role-submit" onClick={handleSubmit} disabled={!selected || loading}>
          {loading ? 'Setting role...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
