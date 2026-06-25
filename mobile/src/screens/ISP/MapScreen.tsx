import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import { listDomains, type DomainNode } from '../../services/domain.service';
import {
  detailValue,
  listTransactions,
  type TransactionHeader,
} from '../../services/transaction.service';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ISPMap'>;

interface ClusterPin {
  domain: DomainNode;
  tickets: TransactionHeader[];
}

const JAKARTA_REGION: Region = {
  latitude: -6.2088,
  longitude: 106.8456,
  latitudeDelta: 0.35,
  longitudeDelta: 0.35,
};

export function ISPMapScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [domains, setDomains] = useState<DomainNode[]>([]);
  const [tickets, setTickets] = useState<TransactionHeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ClusterPin | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      listDomains(token, 'LOCATION'),
      listTransactions(token, {
        app_code: 'ISP_TICKET',
        status: 'OPEN',
        with_details: true,
        limit: 200,
      }),
    ])
      .then(([domainRows, ticketRes]) => {
        setDomains(domainRows);
        setTickets(ticketRes.items);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  const pins = useMemo<ClusterPin[]>(() => {
    return domains
      .filter((d) => d.latitude != null && d.longitude != null)
      .map((domain) => ({
        domain,
        tickets: tickets.filter((t) => t.domainCode === domain.domainCode),
      }))
      .filter((p) => p.tickets.length > 0);
  }, [domains, tickets]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={JAKARTA_REGION}>
        {pins.map((pin) => (
          <Marker
            key={pin.domain.id}
            coordinate={{ latitude: pin.domain.latitude!, longitude: pin.domain.longitude! }}
            title={pin.domain.name}
            description={`${pin.tickets.length} open ticket(s)`}
            onPress={() => setSelected(pin)}
          />
        ))}
      </MapView>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>
          {pins.length} cluster(s) · {tickets.length} open ticket(s)
        </Text>
        <Pressable
          style={styles.listLink}
          onPress={() =>
            navigation.navigate('TransactionList', {
              appCode: 'ISP_TICKET',
              title: 'ISP Ticketing',
            })
          }
        >
          <Text style={styles.listLinkText}>View list →</Text>
        </Pressable>

        {selected ? (
          <FlatList
            data={selected.tickets}
            keyExtractor={(item) => item.id}
            style={styles.ticketList}
            renderItem={({ item }) => (
              <Pressable
                style={styles.ticketCard}
                onPress={() => navigation.navigate('TransactionDetail', { id: item.id })}
              >
                <Text style={styles.ticketTitle}>{detailValue(item.details, 'customer_name')}</Text>
                <Text style={styles.ticketMeta}>
                  {item.trxNo} · {item.currentProcess}
                </Text>
              </Pressable>
            )}
          />
        ) : (
          <Text style={styles.hint}>Tap a marker to see tickets in that cluster.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  map: { flex: 1 },
  panel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: 240,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
  },
  panelTitle: { fontWeight: '700', fontSize: 15 },
  listLink: { marginTop: 6, marginBottom: 8 },
  listLinkText: { color: '#16a34a', fontWeight: '600' },
  hint: { color: '#94a3b8', fontSize: 13 },
  ticketList: { marginTop: 4 },
  ticketCard: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  ticketTitle: { fontWeight: '600' },
  ticketMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
});
