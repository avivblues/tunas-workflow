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
import type { RootStackParamList } from '../../navigation/types';
import {
  listPendingApprovals,
  type TransactionHeader,
} from '../../services/transaction.service';

type Props = NativeStackScreenProps<RootStackParamList, 'Approvals'>;

export function ApprovalScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [items, setItems] = useState<TransactionHeader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    listPendingApprovals(token)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Tickets waiting for your approval</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No pending approvals</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate('TransactionDetail', { id: item.id })}
            >
              <Text style={styles.trxNo}>{item.trxNo}</Text>
              <Text style={styles.app}>{item.appCode}</Text>
              <Text style={styles.process}>{item.currentProcess} · {item.priority}</Text>
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
  trxNo: { fontWeight: '700' },
  app: { color: '#64748b', marginTop: 4 },
  process: { marginTop: 4, fontSize: 13 },
});
