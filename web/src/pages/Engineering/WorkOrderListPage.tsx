import { APP_UI_CONFIG } from '../../config/apps';
import { TransactionListPage } from '../../components/organisms/TransactionListPage';

export function WorkOrderListPage() {
  return <TransactionListPage config={APP_UI_CONFIG.ENG_WO} />;
}
