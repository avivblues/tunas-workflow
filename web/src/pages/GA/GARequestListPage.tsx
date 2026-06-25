import { TransactionListPage } from '../../components/organisms/TransactionListPage';
import { APP_UI_CONFIG } from '../../config/apps';

export function GARequestListPage() {
  return <TransactionListPage config={APP_UI_CONFIG.GA_SUPPORT} />;
}
