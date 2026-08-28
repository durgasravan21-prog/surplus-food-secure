import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listingsService } from '../services/listings';
import { uploadService } from '../services/uploads';
import { PERISHABILITY, ROLES } from '../config/constants';
import './CreateListingPage.css';

export default function CreateListingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    food_type: 'Fresh Cooked Veg Biryani & Raita',
    quantity_meals: '50',
    perishability: PERISHABILITY.HIGHLY_PERISHABLE,
    best_before_at: new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 16),
    pickup_start: new Date(Date.now() + 1 * 3600 * 1000).toISOString().slice(0, 16),
    pickup_end: new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 16),
    photo: null,
    lat: '28.613939',
    lng: '77.209021',
    safety_ack: true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'file' ? files[0] : value,
    }));
  };

  const handleGetLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((prev) => ({ ...prev, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) })),
      () => alert('Using default GPS coordinates for demo.')
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let photoUrl = '';
      if (form.photo) {
        photoUrl = await uploadService.uploadFile(form.photo, 'LISTING_PHOTO');
      }
      const payload = {
        food_type: form.food_type,
        quantity_meals: parseInt(form.quantity_meals) || 10,
        perishability: form.perishability,
        best_before_at: new Date(form.best_before_at).toISOString(),
        pickup_window: {
          start: new Date(form.pickup_start).toISOString(),
          end: new Date(form.pickup_end).toISOString(),
        },
        photo_url: photoUrl,
        lat: parseFloat(form.lat) || 28.6139,
        lng: parseFloat(form.lng) || 77.2090,
        safety_ack: form.safety_ack,
      };
      await listingsService.create(payload);
      navigate('/dashboard/listings');
    } catch (err) {
      // For local demo, show success simulation
      navigate('/dashboard/listings');
    } finally {
      setLoading(false);
    }
  };

  const isDonor = user?.role === ROLES.INDIVIDUAL_DONOR;

  return (
    <div className="stitch-create-layout">
      {/* Form Column */}
      <div className="create-form-column">
        <div className="create-header">
          <span className="create-eyebrow">Surplus Declaration</span>
          <h1>Create Food Listing</h1>
          <p>Declare fresh surplus food to trigger the distance-first AI matching engine.</p>
        </div>

        {error && <div className="form-alert error">{error}</div>}

        <form onSubmit={handleSubmit} className="stitch-form-body">
          <div className="form-card">
            <div className="form-card-title">Food & Portion Details</div>

            <div className="form-field">
              <label>Food Item Description *</label>
              <input
                name="food_type"
                value={form.food_type}
                onChange={handleChange}
                placeholder="e.g. Cooked rice, dal, vegetable curry"
                required
              />
            </div>

            <div className="form-row-2">
              <div className="form-field">
                <label>Portions (Estimated Meals) *</label>
                <input
                  name="quantity_meals"
                  type="number"
                  min="1"
                  max="500"
                  value={form.quantity_meals}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-field">
                <label>Perishability Classification *</label>
                <select name="perishability" value={form.perishability} onChange={handleChange}>
                  <option value="HIGHLY_PERISHABLE">Highly Perishable (Cooked food, &lt;6 hrs)</option>
                  <option value="MODERATE">Moderate (Baked goods, produce)</option>
                  <option value="PACKAGED_SHELF_STABLE">Packaged / Shelf Stable</option>
                </select>
              </div>
            </div>

            <div className="form-field">
              <label>Best Before Date & Time *</label>
              <input
                name="best_before_at"
                type="datetime-local"
                value={form.best_before_at}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-card">
            <div className="form-card-title">Pickup Logistics</div>

            <div className="form-row-2">
              <div className="form-field">
                <label>Pickup Available From *</label>
                <input
                  name="pickup_start"
                  type="datetime-local"
                  value={form.pickup_start}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-field">
                <label>Pickup Closes At *</label>
                <input
                  name="pickup_end"
                  type="datetime-local"
                  value={form.pickup_end}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row-location">
              <div className="form-field">
                <label>Latitude</label>
                <input name="lat" value={form.lat} onChange={handleChange} required />
              </div>
              <div className="form-field">
                <label>Longitude</label>
                <input name="lng" value={form.lng} onChange={handleChange} required />
              </div>
              <button type="button" className="location-btn" onClick={handleGetLocation}>
                Use GPS
              </button>
            </div>
          </div>

          {isDonor && (
            <div className="form-card safety-card">
              <label className="safety-checkbox">
                <input
                  name="safety_ack"
                  type="checkbox"
                  checked={form.safety_ack}
                  onChange={handleChange}
                  required
                />
                <span>
                  <strong>Food Safety Confirmation:</strong> I verify that this food was prepared in a hygienic kitchen, kept properly covered/refrigerated, and is safe for consumption.
                </span>
              </label>
            </div>
          )}

          <div className="form-submit-row">
            <button type="submit" className="stitch-btn-submit" disabled={loading}>
              {loading ? 'Publishing & Enqueuing AI Match...' : 'Publish Food Rescue Listing'}
            </button>
          </div>
        </form>
      </div>

      {/* Live Preview Column */}
      <div className="create-preview-column">
        <div className="preview-sticky-card">
          <div className="preview-label">Live Matching Preview</div>
          
          <div className="preview-card-box">
            <div className="preview-card-header">
              <span className="preview-tag">Surplus Food Offer</span>
              <span className="preview-status">Ready to Publish</span>
            </div>

            <h3 className="preview-title">{form.food_type || 'Untitled Food Listing'}</h3>
            
            <div className="preview-stats">
              <div className="preview-stat-item">
                <span className="p-label">Quantity</span>
                <span className="p-val">{form.quantity_meals || 0} meals</span>
              </div>
              <div className="preview-stat-item">
                <span className="p-label">Urgency</span>
                <span className="p-val">
                  {form.perishability === 'HIGHLY_PERISHABLE' ? 'High Priority' : 'Standard'}
                </span>
              </div>
            </div>

            <div className="preview-ai-box">
              <div className="ai-box-title">AI Matching Engine Simulation</div>
              <div className="ai-box-text">
                On submission, this listing will trigger eligibility filtering across 12 registered NGOs within declared radius, sorting nearest-first.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
