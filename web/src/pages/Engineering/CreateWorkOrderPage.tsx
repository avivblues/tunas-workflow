import { APP_UI_CONFIG } from '../../config/apps';
import { CreateTransactionPage } from '../../components/organisms/CreateTransactionPage';

export function CreateWorkOrderPage() {
  return <CreateTransactionPage config={APP_UI_CONFIG.ENG_WO} />;
}
