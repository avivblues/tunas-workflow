import { TransactionListPage } from '../../components/organisms/TransactionListPage';
import { APP_UI_CONFIG } from '../../config/apps';

export function BuildingIssueListPage() {
  return <TransactionListPage config={APP_UI_CONFIG.BUILDING_MGMT} />;
}
