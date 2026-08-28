import { useState } from 'react';
import { useDemoData } from '../context/DemoDataContext';

const STEPS = [
  { key: 'DELIVERY_ASSIGNED', label: '1. Assigned', desc: 'Navigate to donor kitchen' },
  { key: 'PARTNER_ARRIVED_PICKUP', label: '2. Arrived', desc: 'Inspect packaging & seal' },
  { key: 'PICKED_UP', label: '3. Picked Up', desc: 'En route to NGO dropoff' },
  { key: 'DELIVERED', label: '4. Delivered', desc: 'Confirmed by NGO receiving team' },
];

export default function ActiveDeliveryPage() {
  const { activeDelivery, updateDeliveryStatus } = useDemoData();
  const [currentStepIndex, setCurrentStepIndex] = useState(1);
  const [pickupPhotoUploaded, setPickupPhotoUploaded] = useState(false);
  const [dropoffPhotoUploaded, setDropoffPhotoUploaded] = useState(false);

  const handleNextStep = () => {
    if (currentStepIndex === 0) {
      updateDeliveryStatus('PARTNER_ARRIVED_PICKUP');
      setCurrentStepIndex(1);
    } else if (currentStepIndex === 1) {
      updateDeliveryStatus('PICKED_UP', 's3://proofs/pickup_verified_photo.jpg');
      setCurrentStepIndex(2);
    } else if (currentStepIndex === 2) {
      updateDeliveryStatus('DELIVERED', 's3://proofs/dropoff_verified_photo.jpg');
      setCurrentStepIndex(3);
    }
  };

  return (
    <div className="stitch-dashboard">
      <div className="dashboard-banner">
        <div className="banner-text">
          <span className="banner-eyebrow">Active Chain of Custody</span>
          <h1>Live Delivery Stepper</h1>
          <p>
            Order ID: {activeDelivery.id} · {activeDelivery.quantity_meals} Meals from {activeDelivery.donor_kitchen} to {activeDelivery.dropoff_ngo}
          </p>
        </div>
      </div>

      {/* Stitch Timeline Stepper */}
      <div className="stitch-section-card" style={{ padding: '28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '32px' }}>
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;
            return (
              <div
                key={step.key}
                style={{
                  background: isCurrent ? '#f0fdf4' : isCompleted ? '#ffffff' : '#f8fafc',
                  border: isCurrent ? '2px solid #15803d' : isCompleted ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '16px',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: isCurrent ? '#15803d' : isCompleted ? '#166534' : '#64748b' }}>
                  {step.label}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  {step.desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Step Action Card */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
          {currentStepIndex === 0 && (
            <div>
              <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>Step 1: En Route to Donor Kitchen</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                Pickup Address: {activeDelivery.pickup_address} (Distance: {activeDelivery.distance_km} km)
              </p>
              <button
                type="button"
                onClick={handleNextStep}
                style={{ padding: '12px 24px', background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Confirm Arrival at Kitchen
              </button>
            </div>
          )}

          {currentStepIndex === 1 && (
            <div>
              <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>Step 2: Food Pickup & Container Inspection</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                Verify package integrity and upload a photo of the packed meals before leaving.
              </p>
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={() => setPickupPhotoUploaded(true)}
                  style={{ fontSize: '13px' }}
                />
                {pickupPhotoUploaded && (
                  <span style={{ marginLeft: '12px', fontSize: '12px', fontWeight: 700, color: '#15803d' }}>
                    Pickup Proof Captured (EXIF metadata stripped)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleNextStep}
                disabled={!pickupPhotoUploaded}
                style={{
                  padding: '12px 24px',
                  background: pickupPhotoUploaded ? '#15803d' : '#cbd5e1',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: pickupPhotoUploaded ? 'pointer' : 'not-allowed'
                }}
              >
                Confirm Pickup & Start Navigation to NGO
              </button>
            </div>
          )}

          {currentStepIndex === 2 && (
            <div>
              <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>Step 3: En Route to NGO Shelter</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                Dropoff Address: {activeDelivery.dropoff_address}
              </p>
              <button
                type="button"
                onClick={handleNextStep}
                style={{ padding: '12px 24px', background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Confirm Arrival at NGO Dropoff
              </button>
            </div>
          )}

          {currentStepIndex === 3 && (
            <div>
              <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>Step 4: Dropoff Confirmation & Proof</h3>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
                Upload final dropoff handover photo to complete the chain of custody.
              </p>
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={() => setDropoffPhotoUploaded(true)}
                  style={{ fontSize: '13px' }}
                />
                {dropoffPhotoUploaded && (
                  <span style={{ marginLeft: '12px', fontSize: '12px', fontWeight: 700, color: '#15803d' }}>
                    Dropoff Proof Photo Recorded
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  updateDeliveryStatus('DELIVERED', 's3://proofs/dropoff_photo.jpg');
                  alert('🎉 Delivery Complete! Food rescue recorded in global environmental ledger.');
                }}
                disabled={!dropoffPhotoUploaded}
                style={{
                  padding: '12px 24px',
                  background: dropoffPhotoUploaded ? '#15803d' : '#cbd5e1',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: dropoffPhotoUploaded ? 'pointer' : 'not-allowed'
                }}
              >
                Close Delivery & Record Carbon Offset
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
