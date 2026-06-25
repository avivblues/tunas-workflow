import { CreateTransactionPage } from '../../components/organisms/CreateTransactionPage';
import { APP_UI_CONFIG } from '../../config/apps';

export function CreateBuildingIssuePage() {
  return <CreateTransactionPage config={APP_UI_CONFIG.BUILDING_MGMT} />;
}
