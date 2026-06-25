import { useCallback, useEffect, useState } from 'react';
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
import {
  getCachedTransactionList,
  setCachedTransactionList,
} from '../../services/offline-cache.service';
import {
  detailValue,
  listTransactions,
  type TransactionHeader,
} from '../../services/transaction.service';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'TransactionList'>;

export function TransactionListScreen({ navigation, route }: Props) {
  const { token } = useAuth();
  const { appCode, title } = route.params;
  const [items, setItems] = useState<TransactionHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    const cached = await getCachedTransactionList(appCode);
    if (cached) {
      setItems(cached);
      setFromCache(true);
    }
    try {
      const res = await listTransactions(token, { app_code: appCode, with_details: true, limit: 100 });
      setItems(res.items);
      setFromCache(false);
      await setCachedTransactionList(appCode, res.items);
    } catch {
      if (!cached) throw new Error('Failed to load');
    }
  }, [token, appCode]);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        {title} · {items.length} items{fromCache ? ' (cached)' : ''}
      </Text>

      {loading && items.length === 0 ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No transactions yet.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate('TransactionDetail', { id: item.id })}
            >
              <Text style={styles.trxNo}>{item.trxNo}</Text>
              <Text style={styles.titleText}>
                {detailValue(item.details, 'title') !== '—'
                  ? detailValue(item.details, 'title')
                  : detailValue(item.details, 'customer_name')}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.badge}>{item.currentProcess}</Text>
                <Text style={styles.status}>{item.status}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  subtitle: { color: '#64748b', marginBottom: 12 },
  list: { gap: 10, paddingBottom: 24 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  trxNo: { fontSize: 12, color: '#64748b' },
  titleText: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  metaRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  badge: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '600',
  },
  status: { fontSize: 12, color: '#64748b' },
});
