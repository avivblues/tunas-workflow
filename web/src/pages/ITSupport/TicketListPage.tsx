import { APP_UI_CONFIG } from '../../config/apps';
import { TransactionListPage } from '../../components/organisms/TransactionListPage';

export function TicketListPage() {
  return <TransactionListPage config={APP_UI_CONFIG.IT_SUPPORT} />;
}
