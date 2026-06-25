import { APP_UI_CONFIG } from '../../config/apps';
import { TransactionListPage } from '../../components/organisms/TransactionListPage';

export function ISPTicketListPage() {
  return <TransactionListPage config={APP_UI_CONFIG.ISP_TICKET} />;
}
