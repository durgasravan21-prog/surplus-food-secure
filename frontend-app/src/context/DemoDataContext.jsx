import { createContext, useContext, useState, useEffect } from 'react';
import { LISTING_STATUS, ROLES, PERISHABILITY } from '../config/constants';

const DemoDataContext = createContext(null);

const INITIAL_LISTINGS = [
  {
    id: 'LST-8801',
    donor_id: 'demo-rest-01',
    donor_name: 'Saffron Grand Kitchen',
    donor_role: ROLES.RESTAURANT,
    food_type: 'Vegetable Biryani & Dal Makhani Packets',
    quantity_meals: 45,
    perishability: PERISHABILITY.HIGHLY_PERISHABLE,
    best_before_at: new Date(Date.now() + 3.5 * 3600 * 1000).toISOString(),
    pickup_window: {
      start: new Date(Date.now() + 0.5 * 3600 * 1000).toISOString(),
      end: new Date(Date.now() + 2.5 * 3600 * 1000).toISOString(),
    },
    lat: 28.6139,
    lng: 77.2090,
    address: '80ft Road, Koramangala 4th Block, Bengaluru',
    status: LISTING_STATUS.MATCHED_PENDING_NGO_ACCEPT,
    matched_ngo_id: 'demo-ngo-03',
    matched_ngo_name: 'Anna Seva Trust Food Bank',
    distance_km: 1.85,
    expires_at: new Date(Date.now() + 8 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'LST-8802',
    donor_id: 'demo-rest-01',
    donor_name: 'Saffron Grand Kitchen',
    donor_role: ROLES.RESTAURANT,
    food_type: 'Fresh Whole Wheat Bread Loaves & Croissants',
    quantity_meals: 30,
    perishability: PERISHABILITY.MODERATE,
    best_before_at: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
    pickup_window: {
      start: new Date(Date.now() + 1 * 3600 * 1000).toISOString(),
      end: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    },
    lat: 28.6145,
    lng: 77.2095,
    address: '80ft Road, Koramangala 4th Block, Bengaluru',
    status: LISTING_STATUS.DELIVERY_ASSIGNED,
    matched_ngo_id: 'demo-ngo-03',
    matched_ngo_name: 'Anna Seva Trust Food Bank',
    assigned_partner_id: 'demo-rider-04',
    assigned_partner_name: 'Rahul Kumar (Bike Partner)',
    distance_km: 2.1,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: 'LST-8803',
    donor_id: 'demo-donor-02',
    donor_name: 'Priya Sharma (Home Donor)',
    donor_role: ROLES.INDIVIDUAL_DONOR,
    food_type: 'Fresh Cooked Chapati & Paneer Curry',
    quantity_meals: 15,
    perishability: PERISHABILITY.HIGHLY_PERISHABLE,
    best_before_at: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    pickup_window: {
      start: new Date(Date.now() + 0.5 * 3600 * 1000).toISOString(),
      end: new Date(Date.now() + 1.5 * 3600 * 1000).toISOString(),
    },
    lat: 28.6180,
    lng: 77.2150,
    address: 'Indiranagar 100ft Road, Bengaluru',
    status: LISTING_STATUS.LISTED,
    distance_km: 3.4,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: 'LST-8800',
    donor_id: 'demo-rest-01',
    donor_name: 'Saffron Grand Kitchen',
    donor_role: ROLES.RESTAURANT,
    food_type: 'Vegetable Pulao & Curd Rice Bowls',
    quantity_meals: 50,
    perishability: PERISHABILITY.HIGHLY_PERISHABLE,
    best_before_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    status: LISTING_STATUS.DELIVERED,
    matched_ngo_name: 'Care & Hope Shelter',
    delivered_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  },
];

const INITIAL_VERIFICATIONS = [
  {
    verification_id: 'VRF-901',
    user_id: 'USR-7701',
    org_name: 'Urban Spice Kitchen',
    role: ROLES.RESTAURANT,
    doc_type: 'FSSAI_LICENSE',
    license_no: '12345678901234',
    file_url: 's3://annayog-uploads/fssai_cert_7701.pdf',
    submitted_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    status: 'PENDING',
    flagged_duplicate: false,
  },
  {
    verification_id: 'VRF-902',
    user_id: 'USR-7702',
    org_name: 'Seva Foundation Bengaluru',
    role: ROLES.NGO,
    doc_type: 'NGO_REGISTRATION',
    reg_no: '80G-2024-KA-009941',
    daily_capacity: 200,
    service_radius_km: 10,
    file_url: 's3://annayog-uploads/ngo_80g_7702.pdf',
    submitted_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    status: 'PENDING',
    flagged_duplicate: false,
  },
  {
    verification_id: 'VRF-903',
    user_id: 'USR-7703',
    org_name: 'Vikram Rider',
    role: ROLES.DELIVERY_PARTNER,
    doc_type: 'GOVT_ID',
    vehicle_type: 'BIKE',
    file_url: 's3://annayog-uploads/driving_license_7703.jpg',
    submitted_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    status: 'PENDING',
    flagged_duplicate: true,
  },
];

export function DemoDataProvider({ children }) {
  const [listings, setListings] = useState(() => {
    const saved = localStorage.getItem('annayog_demo_listings');
    return saved ? JSON.parse(saved) : INITIAL_LISTINGS;
  });

  const [verifications, setVerifications] = useState(() => {
    const saved = localStorage.getItem('annayog_demo_verifications');
    return saved ? JSON.parse(saved) : INITIAL_VERIFICATIONS;
  });

  const [activeDelivery, setActiveDelivery] = useState({
    id: 'DEL-4402',
    listing_id: 'LST-8802',
    food_type: 'Fresh Whole Wheat Bread Loaves & Croissants',
    quantity_meals: 30,
    donor_kitchen: 'Saffron Grand Commercial Kitchen',
    pickup_address: '80ft Road, Koramangala 4th Block, Bengaluru',
    dropoff_ngo: 'Anna Seva Trust Food Bank',
    dropoff_address: '12th Main Road, Indiranagar, Bengaluru',
    distance_km: 2.1,
    status: 'DELIVERY_ASSIGNED',
    pickup_photo_url: null,
    dropoff_photo_url: null,
  });

  const [ngoCapacity, setNgoCapacity] = useState({
    daily_capacity: 150,
    daily_claimed: 75,
    remaining: 75,
    auto_match_enabled: true,
  });

  useEffect(() => {
    localStorage.setItem('annayog_demo_listings', JSON.stringify(listings));
  }, [listings]);

  useEffect(() => {
    localStorage.setItem('annayog_demo_verifications', JSON.stringify(verifications));
  }, [verifications]);

  // Actions for cross-role demo simulation
  const createListing = (newListingData) => {
    const newListing = {
      id: `LST-${Math.floor(1000 + Math.random() * 9000)}`,
      donor_id: newListingData.donor_id || 'demo-rest-01',
      donor_name: newListingData.donor_name || 'Saffron Grand Kitchen',
      donor_role: newListingData.donor_role || ROLES.RESTAURANT,
      food_type: newListingData.food_type,
      quantity_meals: parseInt(newListingData.quantity_meals) || 20,
      perishability: newListingData.perishability,
      best_before_at: newListingData.best_before_at,
      pickup_window: newListingData.pickup_window,
      lat: newListingData.lat || 28.6139,
      lng: newListingData.lng || 77.2090,
      address: newListingData.address || 'Koramangala 4th Block, Bengaluru',
      status: LISTING_STATUS.MATCHED_PENDING_NGO_ACCEPT,
      matched_ngo_id: 'demo-ngo-03',
      matched_ngo_name: 'Anna Seva Trust Food Bank',
      distance_km: 1.45,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    };
    setListings((prev) => [newListing, ...prev]);
    return newListing;
  };

  const acceptNgoMatch = (listingId) => {
    setListings((prev) =>
      prev.map((l) => {
        if (l.id === listingId) {
          return {
            ...l,
            status: LISTING_STATUS.DELIVERY_ASSIGNED,
            assigned_partner_name: 'Rahul Kumar (Bike Partner)',
          };
        }
        return l;
      })
    );
    setNgoCapacity((prev) => ({
      ...prev,
      daily_claimed: prev.daily_claimed + 45,
      remaining: Math.max(0, prev.remaining - 45),
    }));
  };

  const declineNgoMatch = (listingId) => {
    setListings((prev) =>
      prev.map((l) => {
        if (l.id === listingId) {
          return {
            ...l,
            status: LISTING_STATUS.LISTED,
            matched_ngo_id: null,
            matched_ngo_name: null,
          };
        }
        return l;
      })
    );
  };

  const claimBoardListing = (listingId) => {
    setListings((prev) =>
      prev.map((l) => {
        if (l.id === listingId) {
          return {
            ...l,
            status: LISTING_STATUS.NGO_ACCEPTED,
            matched_ngo_id: 'demo-ngo-03',
            matched_ngo_name: 'Anna Seva Trust Food Bank',
          };
        }
        return l;
      })
    );
  };

  const updateDeliveryStatus = (newStatus, photoUrl = null) => {
    setActiveDelivery((prev) => ({
      ...prev,
      status: newStatus,
      pickup_photo_url: newStatus === 'PICKED_UP' ? photoUrl || 'uploaded_pickup_proof.jpg' : prev.pickup_photo_url,
      dropoff_photo_url: newStatus === 'DELIVERED' ? photoUrl || 'uploaded_dropoff_proof.jpg' : prev.dropoff_photo_url,
    }));

    if (newStatus === 'DELIVERED') {
      setListings((prev) =>
        prev.map((l) =>
          l.id === activeDelivery.listing_id
            ? { ...l, status: LISTING_STATUS.DELIVERED, delivered_at: new Date().toISOString() }
            : l
        )
      );
    }
  };

  const reviewVerification = (id, decision) => {
    setVerifications((prev) =>
      prev.map((v) => (v.verification_id === id ? { ...v, status: decision } : v))
    );
  };

  const toggleAutoMatch = () => {
    setNgoCapacity((prev) => ({
      ...prev,
      auto_match_enabled: !prev.auto_match_enabled,
    }));
  };

  return (
    <DemoDataContext.Provider
      value={{
        listings,
        verifications,
        activeDelivery,
        ngoCapacity,
        createListing,
        acceptNgoMatch,
        declineNgoMatch,
        claimBoardListing,
        updateDeliveryStatus,
        reviewVerification,
        toggleAutoMatch,
      }}
    >
      {children}
    </DemoDataContext.Provider>
  );
}

export function useDemoData() {
  const context = useContext(DemoDataContext);
  if (!context) throw new Error('useDemoData must be used within a DemoDataProvider');
  return context;
}
