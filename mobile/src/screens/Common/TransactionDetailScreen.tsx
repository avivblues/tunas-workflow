import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import {
  detailValue,
  getTransaction,
  type TransactionFull,
} from '../../services/transaction.service';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'TransactionDetail'>;

export function TransactionDetailScreen({ route, navigation }: Props) {
  const { token } = useAuth();
  const { id } = route.params;
  const [trx, setTrx] = useState<TransactionFull | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    getTransaction(token, id)
      .then(setTrx)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!trx) {
    return (
      <View style={styles.center}>
        <Text>Transaction not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.trxNo}>{trx.trxNo}</Text>
      <Text style={styles.title}>{detailValue(trx.details, 'title')}</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Process</Text>
        <Text style={styles.value}>{trx.currentProcess}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{trx.status}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Priority</Text>
        <Text style={styles.value}>{trx.priority ?? '—'}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Domain</Text>
        <Text style={styles.value}>{trx.domainCode ?? '—'}</Text>
      </View>

      <Text style={styles.section}>Details</Text>
      {trx.details.map((d) => (
        <View key={d.fieldCode} style={styles.detailRow}>
          <Text style={styles.detailKey}>{d.fieldCode}</Text>
          <Text style={styles.detailVal}>{detailValue([d], d.fieldCode)}</Text>
        </View>
      ))}

      <Text style={styles.section}>Activity Log</Text>
      {trx.logs.length === 0 ? (
        <Text style={styles.muted}>No activity yet.</Text>
      ) : (
        trx.logs.map((log) => (
          <View key={log.id} style={styles.logRow}>
            <Text style={styles.logAction}>{log.action}</Text>
            <Text style={styles.muted}>{log.description ?? log.process}</Text>
          </View>
        ))
      )}

      {trx.status === 'OPEN' && (
        <Pressable
          style={styles.workBtn}
          onPress={() => navigation.navigate('WorkExecution', { id: trx.id })}
        >
          <Text style={styles.workBtnText}>Open Work Execution</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  trxNo: { fontSize: 13, color: '#64748b' },
  title: { fontSize: 22, fontWeight: '700', marginTop: 4, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  label: { color: '#64748b' },
  value: { fontWeight: '600' },
  section: { fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  detailRow: { marginBottom: 10 },
  detailKey: { fontSize: 12, color: '#64748b', textTransform: 'capitalize' },
  detailVal: { fontSize: 15, marginTop: 2 },
  muted: { color: '#94a3b8', fontSize: 13 },
  logRow: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  logAction: { fontWeight: '600', marginBottom: 4 },
  workBtn: {
    marginTop: 24,
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  workBtnText: { color: '#fff', fontWeight: '700' },
});
