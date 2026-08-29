import { useAuth } from '../context/AuthContext';
import { ROLES } from '../config/constants';

import DonorDashboard from './DonorDashboard';
import NGODashboard from './NGODashboard';
import DeliveryOffersPage from './DeliveryOffersPage';
import AdminDashboardPage from './AdminDashboardPage';

export default function DashboardOverview() {
  const { user } = useAuth();

  switch (user?.role) {
    case ROLES.NGO:
      return <NGODashboard />;
    case ROLES.DELIVERY_PARTNER:
      return <DeliveryOffersPage />;
    case ROLES.ADMIN:
      return <AdminDashboardPage />;
    case ROLES.INDIVIDUAL_DONOR:
    case ROLES.RESTAURANT:
    default:
      return <DonorDashboard />;
  }
}
