import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AppFormField } from '../../config/apps';
import { getAppConfig } from '../../config/apps';
import { useAuth } from '../../context/AuthContext';
import type { RootStackParamList } from '../../navigation/types';
import { listAssets, type AssetItem } from '../../services/asset.service';
import { listDomains } from '../../services/domain.service';
import { createTransaction } from '../../services/transaction.service';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateTransaction'>;

export function CreateTransactionScreen({ navigation, route }: Props) {
  const { token } = useAuth();
  const { appCode, title } = route.params;
  const config = getAppConfig(appCode);
  const [form, setForm] = useState<Record<string, string>>({});
  const [priority, setPriority] = useState('MEDIUM');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [picker, setPicker] = useState<{
    field: AppFormField;
    options: { value: string; label: string }[];
    assetMeta?: Record<string, AssetItem>;
  } | null>(null);

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  if (!config || !token) {
    return (
      <View style={styles.center}>
        <Text>Create form not available for {appCode}</Text>
      </View>
    );
  }

  async function openPicker(field: AppFormField) {
    if (field.type === 'select' && field.options) {
      setPicker({ field, options: field.options });
      return;
    }
    if (field.type === 'domain-picker') {
      const domains = await listDomains(token!, field.domainType);
      setPicker({
        field,
        options: domains.map((d) => ({ value: d.domainCode, label: `${d.name} (${d.domainCode})` })),
      });
      return;
    }
    if (field.type === 'asset-picker') {
      const assets = await listAssets(token!, field.assetCategory);
      const assetMeta = Object.fromEntries(assets.map((a) => [a.id, a]));
      setPicker({
        field,
        assetMeta,
        options: assets.map((a) => ({ value: a.id, label: `${a.assetCode} — ${a.name}` })),
      });
    }
  }

  function pickValue(value: string, label: string, field: AppFormField) {
    const meta = picker?.assetMeta?.[value];
    setForm((prev) => {
      const next = { ...prev, [field.key]: value, [`${field.key}_label`]: label };
      if (field.type === 'asset-picker' && meta?.locationCode && config?.autoDomainFromAsset) {
        next._domain_code = meta.locationCode;
      }
      if (field.type === 'domain-picker') {
        next._domain_code = value;
      }
      return next;
    });
    setPicker(null);
  }

  async function handleSubmit() {
    if (!token || !config) return;
    setError('');
    setLoading(true);

    try {
      const data: Record<string, unknown> = {};
      const asset_links: {
        asset_id: string;
        usage_type: 'AFFECTED' | 'SPAREPART' | 'TOOL';
      }[] = [];

      for (const field of config.fields) {
        const raw = form[field.key];
        if (!raw && field.required) {
          throw new Error(`${field.label} is required`);
        }
        if (!raw) continue;

        if (field.type === 'asset-picker') {
          asset_links.push({
            asset_id: raw,
            usage_type: field.usageType ?? 'AFFECTED',
          });
          data[field.key] = form[`${field.key}_label`] ?? raw;
        } else if (field.type === 'domain-picker') {
          data[field.key] = form[`${field.key}_label`] ?? raw;
        } else if (field.type === 'datetime') {
          data[field.key] = new Date(raw).toISOString();
        } else {
          data[field.key] = raw;
        }
      }

      const trx = await createTransaction(token, {
        app_code: appCode,
        priority,
        domain_code: form._domain_code,
        data,
        asset_links: asset_links.length > 0 ? asset_links : undefined,
      });

      navigation.replace('TransactionDetail', { id: trx.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>{config.createSubtitle}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {config.fields.map((field) => {
        if (field.type === 'select' || field.type === 'domain-picker' || field.type === 'asset-picker') {
          return (
            <View key={field.key} style={styles.field}>
              <Text style={styles.label}>{field.label}{field.required ? ' *' : ''}</Text>
              <Pressable style={styles.pickerBtn} onPress={() => openPicker(field)}>
                <Text>{form[`${field.key}_label`] ?? form[field.key] ?? `Select ${field.label}`}</Text>
              </Pressable>
            </View>
          );
        }

        return (
          <View key={field.key} style={styles.field}>
            <Text style={styles.label}>{field.label}{field.required ? ' *' : ''}</Text>
            <TextInput
              style={[styles.input, field.type === 'textarea' && styles.textarea]}
              value={form[field.key] ?? ''}
              onChangeText={(v) => setForm((prev) => ({ ...prev, [field.key]: v }))}
              placeholder={field.placeholder ?? (field.type === 'datetime' ? '2026-06-23T09:00' : '')}
              multiline={field.type === 'textarea'}
              numberOfLines={field.type === 'textarea' ? 4 : 1}
            />
          </View>
        );
      })}

      <View style={styles.field}>
        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityRow}>
          {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
            <Pressable
              key={p}
              style={[styles.priorityChip, priority === p && styles.priorityActive]}
              onPress={() => setPriority(p)}
            >
              <Text style={priority === p ? styles.priorityTextActive : undefined}>{p}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable style={[styles.submit, loading && styles.submitDisabled]} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit</Text>}
      </Pressable>

      <Modal visible={picker !== null} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{picker?.field.label}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {picker?.options.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={styles.modalOption}
                  onPress={() => pickValue(opt.value, opt.label, picker.field)}
                >
                  <Text>{opt.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable onPress={() => setPicker(null)}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  subtitle: { color: '#64748b', marginBottom: 16 },
  error: { color: '#dc2626', marginBottom: 12 },
  field: { marginBottom: 14 },
  label: { fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  pickerBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 14,
  },
  priorityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  priorityChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  priorityActive: { backgroundColor: '#1d4ed8' },
  priorityTextActive: { color: '#fff', fontWeight: '600' },
  submit: {
    marginTop: 8,
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cancel: { textAlign: 'center', color: '#64748b', marginTop: 12, padding: 8 },
});
