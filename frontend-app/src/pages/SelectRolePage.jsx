import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLES } from '../config/constants';
import './SelectRolePage.css';

const roleOptions = [
  { value: ROLES.RESTAURANT, code: 'REST', title: 'Restaurant / Commercial Kitchen', desc: 'List surplus meals from your licensed kitchen for nearby NGOs.' },
  { value: ROLES.INDIVIDUAL_DONOR, code: 'DONOR', title: 'Individual Donor', desc: 'Donate home-cooked surplus food with food-safety acknowledgement.' },
  { value: ROLES.NGO, code: 'NGO', title: 'NGO / Shelter / Community Kitchen', desc: 'Receive matched surplus food donations automatically within your radius.' },
  { value: ROLES.DELIVERY_PARTNER, code: 'VOLUNTEER', title: 'Delivery Partner', desc: 'Volunteer to safely transport food from donor kitchens to NGO dropoffs.' },
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
        <h1>Select Account Role</h1>
        <p className="role-subtitle">This selection is permanent and tied to your identity. Admin review required to modify.</p>
        {error && <p className="role-error">{error}</p>}
        
        <div className="role-options">
          {roleOptions.map((opt) => (
            <button
              key={opt.value}
              className={`role-option ${selected === opt.value ? 'selected' : ''}`}
              onClick={() => setSelected(opt.value)}
            >
              <div className="role-tag">{opt.code}</div>
              <div className="role-info">
                <strong>{opt.title}</strong>
                <p>{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <button className="role-submit" onClick={handleSubmit} disabled={!selected || loading}>
          {loading ? 'Confirming selection...' : 'Continue to Verification'}
        </button>
      </div>
    </div>
  );
}
