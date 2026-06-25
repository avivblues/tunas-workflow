import { TransactionListPage } from '../../components/organisms/TransactionListPage';
import { APP_UI_CONFIG } from '../../config/apps';

export function VehicleBookingListPage() {
  return <TransactionListPage config={APP_UI_CONFIG.VEHICLE_BOOKING} />;
}
