import { useEffect, useMemo, useState } from 'react';
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
  detailValue,
  listTransactions,
  type TransactionHeader,
} from '../../services/transaction.service';

type Props = NativeStackScreenProps<RootStackParamList, 'VehicleCalendar'>;

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function VehicleCalendarScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [items, setItems] = useState<TransactionHeader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    listTransactions(token, { app_code: 'VEHICLE_BOOKING', with_details: true, limit: 100 })
      .then((res) => setItems(res.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const upcoming = useMemo(() => {
    return items
      .map((item) => ({
        id: item.id,
        trxNo: item.trxNo,
        title: detailValue(item.details, 'title'),
        destination: detailValue(item.details, 'destination'),
        start: detailValue(item.details, 'start_datetime'),
        end: detailValue(item.details, 'end_datetime'),
        status: item.status,
        process: item.currentProcess,
      }))
      .filter((b) => {
        const start = new Date(b.start);
        return !Number.isNaN(start.getTime()) && start >= new Date() && b.status === 'OPEN';
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [items]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Upcoming Bookings</Text>
        <Pressable
          style={styles.createBtn}
          onPress={() =>
            navigation.navigate('CreateTransaction', {
              appCode: 'VEHICLE_BOOKING',
              title: 'New Booking',
            })
          }
        >
          <Text style={styles.createText}>+ New</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={upcoming}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No upcoming bookings</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate('TransactionDetail', { id: item.id })}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.meta}>{item.trxNo} · {item.destination}</Text>
              <Text style={styles.when}>{formatWhen(item.start)} → {formatWhen(item.end)}</Text>
              <Text style={styles.process}>{item.process}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  createBtn: { backgroundColor: '#1d4ed8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  createText: { color: '#fff', fontWeight: '600' },
  list: { gap: 10, paddingBottom: 24 },
  empty: { color: '#94a3b8', textAlign: 'center', marginTop: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  meta: { color: '#64748b', marginTop: 4, fontSize: 13 },
  when: { marginTop: 6 },
  process: { marginTop: 4, fontSize: 12, color: '#1d4ed8', fontWeight: '600' },
});
