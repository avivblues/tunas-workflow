import { TransactionListPage } from '../../components/organisms/TransactionListPage';
import { APP_UI_CONFIG } from '../../config/apps';

export function PmTaskListPage() {
  return <TransactionListPage config={APP_UI_CONFIG.ENG_PM} />;
}
