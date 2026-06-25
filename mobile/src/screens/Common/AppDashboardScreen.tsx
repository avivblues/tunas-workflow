import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { getAppDashboard, type AppDashboardData } from '../../services/dashboard.service';

type Props = NativeStackScreenProps<RootStackParamList, 'AppDashboard'>;

export function AppDashboardScreen({ route, navigation }: Props) {
  const { token } = useAuth();
  const { appCode, title } = route.params;
  const [data, setData] = useState<AppDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  useEffect(() => {
    if (!token) return;
    getAppDashboard(token, appCode)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, appCode]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text>Dashboard unavailable</Text>
      </View>
    );
  }

  const cards = [
    { label: 'Open', value: data.summary.open },
    { label: 'Closed', value: data.summary.closed },
    { label: 'SLA Breach', value: data.summary.slaBreachOpen },
    { label: 'At Risk', value: data.summary.slaAtRisk },
    { label: 'Avg Resolution (h)', value: data.summary.avgResolutionHours },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.appName}>{data.appName}</Text>
      <View style={styles.grid}>
        {cards.map((c) => (
          <View key={c.label} style={styles.card}>
            <Text style={styles.cardValue}>{c.value}</Text>
            <Text style={styles.cardLabel}>{c.label}</Text>
          </View>
        ))}
      </View>

      {data.appMetrics && data.appMetrics.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Insights</Text>
          {data.appMetrics.map((m) => (
            <View key={m.label} style={styles.metricRow}>
              <Text style={styles.metricLabel}>{m.label}</Text>
              <Text style={styles.metricValue}>{m.value}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  appName: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardValue: { fontSize: 24, fontWeight: '700' },
  cardLabel: { color: '#64748b', marginTop: 4, fontSize: 13 },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  metricLabel: { color: '#64748b' },
  metricValue: { fontWeight: '600' },
});
