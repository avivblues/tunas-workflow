import type { NavigationProp } from '@react-navigation/native';
import type { RootStackParamList } from './types';

type NavItem = {
  menuCode: string;
  label: string;
  path: string;
};

export function navigateMenuItem(
  navigation: NavigationProp<RootStackParamList>,
  appCode: string,
  item: NavItem,
) {
  const code = item.menuCode;

  if (code === 'MAP' || item.path.includes('/map')) {
    navigation.navigate('ISPMap');
    return;
  }

  if (code === 'CREATE' || item.path.includes('/create')) {
    navigation.navigate('CreateTransaction', { appCode, title: item.label });
    return;
  }

  if (code === 'CALENDAR' || item.path.includes('/calendar')) {
    navigation.navigate('VehicleCalendar');
    return;
  }

  if (code === 'DASHBOARD' || item.path.includes('/dashboard')) {
    navigation.navigate('AppDashboard', { appCode, title: item.label });
    return;
  }

  if (code === 'AI_ASSISTANT' || item.path === '/ai-assistant') {
    navigation.navigate('AIAssistant');
    return;
  }

  if (code === 'APPROVALS' || item.path === '/approvals') {
    navigation.navigate('Approvals');
    return;
  }

  navigation.navigate('TransactionList', { appCode, title: item.label });
}
