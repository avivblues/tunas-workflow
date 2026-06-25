import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import {
  enqueueOfflineItem,
  isNetworkError,
} from '../../services/offline-cache.service';
import {
  addTransactionLog,
  detailValue,
  getTransaction,
  transactionAction,
  type TransactionFull,
} from '../../services/transaction.service';
import { getTechnicianSuggestions } from '../../services/ai.service';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkExecution'>;

export function WorkExecutionScreen({ route, navigation }: Props) {
  const { token } = useAuth();
  const { id } = route.params;
  const [trx, setTrx] = useState<TransactionFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [workNote, setWorkNote] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [aiHint, setAiHint] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await getTransaction(token, id);
    setTrx(data);
    getTechnicianSuggestions(token, id)
      .then((s) => {
        const steps = s.suggestions.suggestedSteps.slice(0, 3).map((x) => x.step);
        if (steps.length > 0) {
          setAiHint(steps.join(' · '));
        } else if (s.quickSummary[0]) {
          setAiHint(s.quickSummary[0].recommendation);
        }
      })
      .catch(() => undefined);
  }, [token, id]);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  async function handleAction(action: 'ADVANCE' | 'CLOSE' | 'REJECT', toProcess?: string) {
    if (!token) return;
    setBusy(true);
    setError('');
    try {
      await transactionAction(token, id, { action, to_process: toProcess });
      setMessage(`Action ${action} completed`);
      await load();
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueueOfflineItem({
          type: 'action',
          transactionId: id,
          payload: { action, to_process: toProcess },
        });
        setMessage('Offline — action queued for sync');
      } else {
        setError(err instanceof Error ? err.message : 'Action failed');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleWorkLog() {
    if (!token || !workNote.trim()) return;
    setBusy(true);
    setError('');
    try {
      await addTransactionLog(token, id, { action: 'WORK_LOG', description: workNote.trim() });
      setWorkNote('');
      setMessage('Work log added');
      await load();
    } catch (err) {
      if (isNetworkError(err)) {
        await enqueueOfflineItem({
          type: 'log',
          transactionId: id,
          payload: { action: 'WORK_LOG', description: workNote.trim() },
        });
        setWorkNote('');
        setMessage('Offline — log queued for sync');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to add log');
      }
    } finally {
      setBusy(false);
    }
  }

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
      <Text style={styles.meta}>
        {trx.currentProcess} · {trx.status}
      </Text>

      {message ? <Text style={styles.message}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {aiHint ? (
        <View style={styles.aiBox}>
          <Text style={styles.aiTitle}>AI Suggestion</Text>
          <Text style={styles.aiText}>{aiHint}</Text>
        </View>
      ) : null}

      {trx.status === 'OPEN' && trx.availableTransitions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionRow}>
            {trx.availableTransitions.map((process) => (
              <Pressable
                key={process}
                style={styles.actionBtn}
                disabled={busy}
                onPress={() => handleAction('ADVANCE', process)}
              >
                <Text style={styles.actionText}>→ {process}</Text>
              </Pressable>
            ))}
            <Pressable style={[styles.actionBtn, styles.closeBtn]} disabled={busy} onPress={() => handleAction('CLOSE')}>
              <Text style={styles.actionText}>Close</Text>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Work Log</Text>
        <TextInput
          style={styles.textarea}
          value={workNote}
          onChangeText={setWorkNote}
          placeholder="Describe work performed..."
          multiline
          numberOfLines={4}
        />
        <Pressable style={styles.submit} onPress={handleWorkLog} disabled={busy || !workNote.trim()}>
          <Text style={styles.submitText}>Add Work Log</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => navigation.navigate('TransactionDetail', { id })}>
        <Text style={styles.link}>View full details</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  trxNo: { fontSize: 13, color: '#64748b' },
  title: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  meta: { color: '#64748b', marginTop: 4, marginBottom: 12 },
  message: { color: '#15803d', marginBottom: 8 },
  error: { color: '#dc2626', marginBottom: 8 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  actionRow: { gap: 8 },
  actionBtn: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    padding: 14,
  },
  closeBtn: { backgroundColor: '#15803d' },
  actionText: { color: '#fff', fontWeight: '600', textAlign: 'center' },
  textarea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submit: {
    marginTop: 10,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: '600' },
  link: { color: '#1d4ed8', textAlign: 'center', marginTop: 20 },
  aiBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  aiTitle: { fontWeight: '700', marginBottom: 4, color: '#1e40af' },
  aiText: { fontSize: 13, color: '#334155' },
});
