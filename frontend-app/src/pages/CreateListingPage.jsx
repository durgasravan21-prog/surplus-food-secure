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
    food_type: '',
    quantity_meals: '',
    perishability: PERISHABILITY.MODERATE,
    best_before_at: '',
    pickup_start: '',
    pickup_end: '',
    photo: null,
    lat: '',
    lng: '',
    safety_ack: false,
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
      () => alert('Unable to get location. Please enter manually.')
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
        quantity_meals: parseInt(form.quantity_meals),
        perishability: form.perishability,
        best_before_at: new Date(form.best_before_at).toISOString(),
        pickup_window: {
          start: new Date(form.pickup_start).toISOString(),
          end: new Date(form.pickup_end).toISOString(),
        },
        photo_url: photoUrl,
        lat: parseFloat(form.lat),
        lng: parseFloat(form.lng),
        safety_ack: form.safety_ack,
      };
      await listingsService.create(payload);
      navigate('/dashboard/listings');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create listing.');
    } finally {
      setLoading(false);
    }
  };

  const isDonor = user?.role === ROLES.INDIVIDUAL_DONOR;

  return (
    <div className="create-listing">
      <h1>Create Food Listing</h1>
      {error && <div className="form-error">{error}</div>}
      <form onSubmit={handleSubmit} className="listing-form">
        <label>Food Description *
          <input name="food_type" value={form.food_type} onChange={handleChange} placeholder="e.g., Cooked rice + dal, veg" required />
        </label>
        <label>Quantity (meals) *
          <input name="quantity_meals" type="number" min="1" max="500" value={form.quantity_meals} onChange={handleChange} required />
        </label>
        <label>Perishability *
          <select name="perishability" value={form.perishability} onChange={handleChange}>
            <option value="HIGHLY_PERISHABLE">Highly Perishable (use within hours)</option>
            <option value="MODERATE">Moderate (use within a day)</option>
            <option value="PACKAGED_SHELF_STABLE">Packaged / Shelf Stable</option>
          </select>
        </label>
        <label>Best Before *
          <input name="best_before_at" type="datetime-local" value={form.best_before_at} onChange={handleChange} required />
        </label>
        <div className="form-row">
          <label>Pickup Window Start *
            <input name="pickup_start" type="datetime-local" value={form.pickup_start} onChange={handleChange} required />
          </label>
          <label>Pickup Window End *
            <input name="pickup_end" type="datetime-local" value={form.pickup_end} onChange={handleChange} required />
          </label>
        </div>
        <label>Photo
          <input name="photo" type="file" accept="image/jpeg,image/png" onChange={handleChange} />
        </label>
        <div className="location-row">
          <label>Latitude *
            <input name="lat" type="number" step="any" value={form.lat} onChange={handleChange} required />
          </label>
          <label>Longitude *
            <input name="lng" type="number" step="any" value={form.lng} onChange={handleChange} required />
          </label>
          <button type="button" className="location-btn" onClick={handleGetLocation}>📍 Use My Location</button>
        </div>
        {isDonor && (
          <label className="checkbox-label">
            <input name="safety_ack" type="checkbox" checked={form.safety_ack} onChange={handleChange} />
            <span>I confirm this food was prepared safely, stored properly, and is fit for consumption.</span>
          </label>
        )}
        <button type="submit" className="submit-btn" disabled={loading || (isDonor && !form.safety_ack)}>
          {loading ? 'Publishing...' : 'Publish Listing'}
        </button>
      </form>
    </div>
  );
}
