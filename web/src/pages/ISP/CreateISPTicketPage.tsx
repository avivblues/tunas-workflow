import { APP_UI_CONFIG } from '../../config/apps';
import { CreateTransactionPage } from '../../components/organisms/CreateTransactionPage';

export function CreateISPTicketPage() {
  return <CreateTransactionPage config={APP_UI_CONFIG.ISP_TICKET} />;
}
