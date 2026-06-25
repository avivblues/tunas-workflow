import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { navigateMenuItem } from '../../navigation/menu-navigation';
import type { RootStackParamList } from '../../navigation/types';
import { fetchApps, type AppMenuItem } from '../../services/app.service';
import { listNavMenu, type NavMenuItem } from '../../services/menu.service';

type Props = NativeStackScreenProps<RootStackParamList, 'Menu'>;

const APP_ICONS: Record<string, string> = {
  IT_SUPPORT: '💻',
  ENG_WO: '🔧',
  ENG_PM: '📅',
  ISP_TICKET: '📡',
  GA_SUPPORT: '🏢',
  VEHICLE_BOOKING: '🚗',
  BUILDING_MGMT: '🏗️',
};

const SYSTEM_ICONS: Record<string, string> = {
  AI_ASSISTANT: '🤖',
  APPROVALS: '✅',
};

export function AppMenuScreen({ navigation }: Props) {
  const { token, user, logout } = useAuth();
  const [apps, setApps] = useState<AppMenuItem[]>([]);
  const [systemMenus, setSystemMenus] = useState<NavMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetchApps(token).then((rows) => rows.filter((a) => a.active)),
      listNavMenu(token, 'SYSTEM'),
    ])
      .then(([appRows, systemRows]) => {
        setApps(appRows);
        setSystemMenus(systemRows);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  async function openApp(app: AppMenuItem) {
    if (!token) return;

    try {
      const mobileMenus = await listNavMenu(token, app.appCode);

      if (mobileMenus.length > 1) {
        navigation.navigate('AppSubMenu', {
          appCode: app.appCode,
          appName: app.name,
          items: mobileMenus,
        });
        return;
      }

      if (mobileMenus.length === 1) {
        navigateMenuItem(navigation, app.appCode, mobileMenus[0]);
        return;
      }
    } catch {
      // fall through to default list
    }

    navigation.navigate('TransactionList', {
      appCode: app.appCode,
      title: app.name,
    });
  }

  function openSystemMenu(item: NavMenuItem) {
    navigateMenuItem(navigation, 'SYSTEM', item);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.fullName}</Text>
        <Text style={styles.role}>{user?.roleCode ?? 'User'}</Text>
        <Pressable onPress={logout}>
          <Text style={styles.logout}>Logout</Text>
        </Pressable>
      </View>

      {systemMenus.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.systemRow}>
            {systemMenus.map((item) => (
              <Pressable key={item.id} style={styles.systemCard} onPress={() => openSystemMenu(item)}>
                <Text style={styles.appIcon}>{SYSTEM_ICONS[item.menuCode] ?? item.icon ?? '⚙️'}</Text>
                <Text style={styles.systemLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Applications</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={apps}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable style={styles.appCard} onPress={() => openApp(item)}>
              <Text style={styles.appIcon}>{APP_ICONS[item.appCode] ?? item.icon ?? '📋'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.appName}>{item.name}</Text>
                <Text style={styles.appCode}>{item.appCode}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  header: { marginBottom: 20, paddingTop: 8 },
  greeting: { fontSize: 22, fontWeight: '700' },
  role: { color: '#64748b', marginTop: 4 },
  logout: { color: '#dc2626', marginTop: 12, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  systemRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  systemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: '45%',
    alignItems: 'center',
  },
  systemLabel: { fontWeight: '600', marginTop: 6, fontSize: 13, textAlign: 'center' },
  list: { gap: 10, paddingBottom: 24 },
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  appIcon: { fontSize: 28, marginRight: 14 },
  appName: { fontSize: 16, fontWeight: '600' },
  appCode: { fontSize: 12, color: '#64748b', marginTop: 2 },
  chevron: { fontSize: 24, color: '#94a3b8' },
});
