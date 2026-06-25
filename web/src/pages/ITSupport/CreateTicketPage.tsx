import { APP_UI_CONFIG } from '../../config/apps';
import { CreateTransactionPage } from '../../components/organisms/CreateTransactionPage';

export function CreateTicketPage() {
  return <CreateTransactionPage config={APP_UI_CONFIG.IT_SUPPORT} />;
}
