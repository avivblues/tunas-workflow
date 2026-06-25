import { CreateTransactionPage } from '../../components/organisms/CreateTransactionPage';
import { APP_UI_CONFIG } from '../../config/apps';

export function CreateGARequestPage() {
  return <CreateTransactionPage config={APP_UI_CONFIG.GA_SUPPORT} />;
}
